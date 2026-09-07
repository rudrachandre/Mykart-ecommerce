import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Meilisearch } from 'meilisearch';
import { getMeilisearchConfig } from './search.service';

@Processor('search-sync-queue')
export class SearchSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchSyncProcessor.name);
  private client: Meilisearch | null = null;

  constructor(private readonly prisma: PrismaService) {
    super();
    const config = getMeilisearchConfig();

    if (config) {
      try {
        this.client = new Meilisearch({
          host: config.host,
          apiKey: config.apiKey,
        });
      } catch (error) {
        this.logger.error(
          'Failed to instantiate Meilisearch client in SearchSyncProcessor',
          error,
        );
        this.client = null;
      }
    } else {
      this.logger.log(
        'Meilisearch host or API key not configured in SearchSyncProcessor. Sync tasks will be skipped.',
      );
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.name} for product ID: ${job.data.productId}`,
    );

    try {
      switch (job.name) {
        case 'upsert-product':
          await this.handleUpsertProduct(job.data.productId);
          break;
        case 'delete-product':
          await this.handleDeleteProduct(job.data.productId);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.name} for product ${job.data.productId}`,
        error,
      );
      throw error;
    }
  }

  private async handleUpsertProduct(productId: string) {
    if (!this.client) {
      this.logger.debug(
        `Skipping Meilisearch sync for product ${productId}: Meilisearch not configured`,
      );
      return;
    }
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
      },
    });

    if (!product) {
      this.logger.warn(
        `Product ${productId} not found during upsert-product sync`,
      );
      return;
    }

    const document = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: Number(product.basePrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      status: product.status,
      category: product.category
        ? { name: product.category.name, slug: product.category.slug }
        : null,
      brand: product.brand
        ? { name: product.brand.name, slug: product.brand.slug }
        : null,
      images: product.images.map((img) => img.url),
      createdAt: product.createdAt.getTime(),
      rating: product.averageRating,
      reviewCount: product.reviewCount,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        price: v.price ? Number(v.price) : null,
      })),
      onSale: product.salePrice
        ? Number(product.salePrice) < Number(product.basePrice)
        : false,
    };

    await this.client.index('products').addDocuments([document]);
    this.logger.log(`Successfully indexed product ${productId}`);
  }

  private async handleDeleteProduct(productId: string) {
    if (!this.client) {
      this.logger.debug(
        `Skipping Meilisearch delete for product ${productId}: Meilisearch not configured`,
      );
      return;
    }
    await this.client.index('products').deleteDocument(productId);
    this.logger.log(`Successfully deleted product ${productId} from index`);
  }
}
