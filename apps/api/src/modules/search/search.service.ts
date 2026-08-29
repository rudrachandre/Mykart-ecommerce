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

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Meilisearch;
  private indexReady = false;

  constructor(private prisma: PrismaService) {
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
}
