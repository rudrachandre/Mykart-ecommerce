import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import { SearchQueryDto } from './dto/search-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { ProductStatus, Prisma } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';

const POPULAR_SEARCH_KEY = 'search:popular';
const POPULAR_SEARCH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const POPULAR_SEARCH_MAX_TERMS = 200; // bound distinct terms to prevent Redis growth
const POPULAR_SEARCH_RESULT_COUNT = 10;
const POPULAR_SEARCH_MIN_TERM_LEN = 2;
const POPULAR_SEARCH_MAX_TERM_LEN = 40;

export interface PopularSearch {
  term: string;
  count: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Meilisearch;
  private indexReady = false;

  constructor(
    private prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    const apiKey = process.env.MEILISEARCH_API_KEY;
    if (!apiKey) {
      throw new Error('MEILISEARCH_API_KEY is required');
    }
    this.client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey,
    });
  }

  async onModuleInit() {
    try {
      await this.setupIndex();
      this.indexReady = true;
    } catch (error) {
      this.logger.error('Failed to setup Meilisearch index', error);
    }
  }

  private async setupIndex() {
    const index = this.client.index('products');

    await index.updateSearchableAttributes([
      'name',
      'brand.name',
      'category.name',
      'description',
      'slug',
    ]);

    await index.updateFilterableAttributes([
      'category.slug',
      'brand.slug',
      'basePrice',
      'status',
      'salePrice',
      'onSale',
    ]);

    await index.updateSortableAttributes([
      'basePrice',
      'salePrice',
      'createdAt',
      'rating',
      'reviewCount',
    ]);

    await index.updateDisplayedAttributes([
      'id',
      'name',
      'slug',
      'description',
      'basePrice',
      'salePrice',
      'status',
      'category',
      'brand',
      'images',
      'createdAt',
      'rating',
      'reviewCount',
    ]);

    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ]);

    await index.updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 5,
        twoTypos: 8,
      },
    });

    this.logger.log('Meilisearch index "products" configured successfully.');
  }

  async searchProducts(query: SearchQueryDto) {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      status,
      page,
      limit,
      sort,
      rating,
      onSale,
    } = query as any;

    // Record real user searches for the popular-searches feature. Best-effort
    // (never rejects) and bounded so no sensitive/PII data is stored. Await is
    // cheap (Redis get/set or in-memory fallback) and keeps counts deterministic.
    if (q) {
      await this.recordSearch(q);
    }

    if (!this.indexReady) {
      return this.fallbackSearch({
        q,
        category,
        brand,
        minPrice,
        maxPrice,
        status,
        page,
        limit,
        sort,
        rating,
        onSale,
      });
    }

    const filter: string[] = [];

    if (category) filter.push(`category.slug = "${category}"`);
    if (brand) filter.push(`brand.slug = "${brand}"`);
    if (status) filter.push(`status = "${status}"`);
    if (minPrice !== undefined) filter.push(`basePrice >= ${minPrice}`);
    if (maxPrice !== undefined) filter.push(`basePrice <= ${maxPrice}`);
    if (rating !== undefined) filter.push(`rating >= ${rating}`);
    if (onSale) filter.push('salePrice < basePrice');

    const sortOption = sort ? [sort] : undefined;
    const offset = (page - 1) * limit;

    try {
      const result = await this.client.index('products').search(q || '', {
        filter,
        sort: sortOption,
        offset,
        limit,
      });

      return {
        items: result.hits,
        meta: {
          total: result.estimatedTotalHits,
          page,
          limit,
          totalPages: Math.ceil(result.estimatedTotalHits / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        'Meilisearch search failed, falling back to PostgreSQL',
        error,
      );
      return this.fallbackSearch({
        q,
        category,
        brand,
        minPrice,
        maxPrice,
        status,
        page,
        limit,
        sort,
        rating,
        onSale,
      });
    }
  }

  private async fallbackSearch(query: SearchQueryDto) {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sort,
      rating,
      onSale,
    } = query as any;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };

    if (category) {
      where.category = { slug: category };
    }

    if (brand) {
      where.brand = { slug: brand };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const priceCondition: any = {};
    if (minPrice !== undefined) priceCondition.gte = minPrice;
    if (maxPrice !== undefined) priceCondition.lte = maxPrice;
    if (Object.keys(priceCondition).length > 0) {
      where.basePrice = priceCondition;
    }

    if (rating !== undefined) {
      where.averageRating = { gte: rating };
    }

    if (onSale) {
      where.salePrice = { not: null };
    }

    const orderBy = this.getFallbackOrderBy(sort);
    const skip = (page - 1) * limit;
    const take = limit;

    try {
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
            },
            category: {
              select: { name: true, slug: true },
            },
            brand: {
              select: { name: true, slug: true },
            },
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('PostgreSQL fallback search failed', error);
      throw new InternalServerErrorException(
        'Search service temporarily unavailable',
      );
    }
  }

  private getFallbackOrderBy(
    sort?: string,
  ): Prisma.ProductOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = [
      'basePrice',
      'salePrice',
      'createdAt',
      'averageRating',
      'reviewCount',
    ];
    const allowedDirections: Array<'asc' | 'desc'> = ['asc', 'desc'];

    if (
      allowedFields.includes(field) &&
      allowedDirections.includes(direction as 'asc' | 'desc')
    ) {
      return { [field]: direction };
    }

    return { createdAt: 'desc' };
  }

  async autocompleteProducts(q: string) {
    if (!q) return { products: [], categories: [], brands: [] };

    try {
      const result = await this.client.index('products').search(q, {
        limit: 5,
        attributesToRetrieve: ['id', 'name', 'slug', 'basePrice', 'images'],
      });

      const categories = await this.prisma.category.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 3,
        select: { id: true, name: true, slug: true },
      });

      const brands = await this.prisma.brand.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 3,
        select: { id: true, name: true, slug: true },
      });

      return {
        products: result.hits,
        categories,
        brands,
      };
    } catch (error) {
      this.logger.error('Autocomplete failed', error);
      throw new InternalServerErrorException(
        'Autocomplete service temporarily unavailable',
      );
    }
  }

  /**
   * Normalizes a search term for safe aggregation: trims, lowercases, and
   * bounds its length so no sensitive/free-form data is retained verbatim.
   */
  private normalizeTerm(term: string): string {
    return term.trim().toLowerCase().slice(0, POPULAR_SEARCH_MAX_TERM_LEN);
  }

  /**
   * Best-effort record of a search term using the existing Redis set/get
   * primitives (works with the in-memory fallback too). Never throws, never
   * stores user identity, and stays bounded by a distinct-term cap + TTL.
   */
  private async recordSearch(term: string): Promise<void> {
    const normalized = this.normalizeTerm(term);
    if (normalized.length < POPULAR_SEARCH_MIN_TERM_LEN) {
      return;
    }
    try {
      const raw = await this.redisService.get(POPULAR_SEARCH_KEY);
      let counts: Record<string, number> = {};
      if (raw) {
        try {
          counts = JSON.parse(raw) as Record<string, number>;
        } catch {
          counts = {};
        }
      }
      counts[normalized] = (counts[normalized] || 0) + 1;

      const keys = Object.keys(counts);
      if (keys.length > POPULAR_SEARCH_MAX_TERMS) {
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        counts = Object.fromEntries(sorted.slice(0, POPULAR_SEARCH_MAX_TERMS));
      }

      await this.redisService.set(
        POPULAR_SEARCH_KEY,
        JSON.stringify(counts),
        POPULAR_SEARCH_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record popular search: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Returns the most-searched terms (aggregate counts only; no user identity).
   */
  async getPopularSearches(): Promise<PopularSearch[]> {
    try {
      const raw = await this.redisService.get(POPULAR_SEARCH_KEY);
      if (!raw) {
        return [];
      }
      const counts = JSON.parse(raw) as Record<string, number>;
      return Object.entries(counts)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, POPULAR_SEARCH_RESULT_COUNT);
    } catch (error) {
      this.logger.warn(
        `Failed to read popular searches: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
