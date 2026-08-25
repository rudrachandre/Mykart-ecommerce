import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import { SearchQueryDto } from './dto/search-query.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Meilisearch;

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
    } catch (error) {
      this.logger.error('Failed to setup Meilisearch index', error);
    }
  }

  private async setupIndex() {
    const index = this.client.index('products');

    await index.updateFilterableAttributes([
      'category.slug',
      'brand.slug',
      'basePrice',
      'status',
    ]);

    await index.updateSortableAttributes(['basePrice', 'createdAt', 'rating']);

    await index.updateSearchableAttributes(['name', 'description', 'slug']);

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
    } = query as any; // Cast to any to accept rating for now
    const filter: string[] = [];

    if (category) filter.push(`category.slug = "${category}"`);
    if (brand) filter.push(`brand.slug = "${brand}"`);
    if (status) filter.push(`status = "${status}"`);
    if (minPrice !== undefined) filter.push(`basePrice >= ${minPrice}`);
    if (maxPrice !== undefined) filter.push(`basePrice <= ${maxPrice}`);
    if ((query as any).rating !== undefined) filter.push(`rating >= ${(query as any).rating}`);

    const sortOption = sort ? [sort] : undefined;

    const offset = (page - 1) * limit;

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
  }

  async autocompleteProducts(q: string) {
    if (!q) return { products: [], categories: [], brands: [] };

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
  }
}
