import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { ProductQueryDto, ProductSortBy } from './dto/product-query.dto';
import { ProductStatus, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from './cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('search-sync-queue') private readonly searchSyncQueue: Queue,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getSellerId(userId: string): Promise<string> {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
    });
    if (!seller) {
      throw new ForbiddenException('User is not registered as a seller');
    }
    // Admin moderation: suspended sellers may not create, update or delete
    // products through any seller-owned path. Admin operations bypass this
    // because they never resolve ownership via getSellerId().
    if (seller.status !== 'ACTIVE') {
      throw new ForbiddenException('Seller account is suspended');
    }
    return seller.id;
  }

  async create(createProductDto: CreateProductDto, user: any) {
    let sellerId: string;

    if (user.role === Role.ADMIN && createProductDto.sellerId) {
      // Validate the seller actually exists
      const targetSeller = await this.prisma.seller.findUnique({
        where: { id: createProductDto.sellerId },
      });
      if (!targetSeller) {
        throw new NotFoundException('Selected seller does not exist');
      }
      sellerId = createProductDto.sellerId;
    } else {
      sellerId = await this.getSellerId(user.userId);
    }

    const existing = await this.prisma.product.findUnique({
      where: { slug: createProductDto.slug },
    });

    if (existing) {
      throw new ConflictException('Product with this slug already exists');
    }

    const {
      variants,
      images,
      sellerId: _dtoSellerId,
      ...productData
    } = createProductDto;

    const category = await this.prisma.category.findUnique({
      where: { id: productData.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (productData.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: productData.brandId },
      });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    if (
      productData.salePrice != null &&
      productData.salePrice > productData.basePrice
    ) {
      throw new BadRequestException(
        'salePrice must be less than or equal to basePrice',
      );
    }

    let product;
    try {
      product = await this.prisma.product.create({
      data: {
        ...productData,
        sellerId,
        images: images
          ? {
              create: images.map((img, i) => ({
                url: img.url,
                alt: img.alt,
                sortOrder: img.sortOrder ?? i,
              })),
            }
          : undefined,
        variants: {
          create: variants.map((v) => ({
            sku: v.sku,
            color: v.color,
            size: v.size,
            price: v.price,
            inventory: {
              create: {
                quantity: v.inventory.quantity,
              },
            },
          })),
        },
      },
      include: {
        images: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    } catch (error) {
      // Unique violations (slug race or duplicate variant SKUs) must surface
      // as 409, not an unhandled 500.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Product slug or variant SKU already exists',
        );
      }
      throw error;
    }

    this.searchSyncQueue
      .add('upsert-product', { productId: product.id }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } })
      .catch((err) => {
        console.error('Failed to enqueue upsert-product job', err);
      });

    return product;
  }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      categorySlug,
      brandSlug,
      search,
      sortBy,
      onSale,
      rating,
      minPrice,
      maxPrice,
      minDiscount,
      inStock,
      dealType,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (brandSlug) {
      const brandSlugs = brandSlug.split(',').map((s) => s.trim()).filter(Boolean);
      if (brandSlugs.length === 1) {
        where.brand = { slug: brandSlugs[0] };
      } else if (brandSlugs.length > 1) {
        where.brand = { slug: { in: brandSlugs } };
      }
    }

    if (onSale || minDiscount != null || dealType === 'TODAYS_DEALS' || dealType === 'LIGHTNING') {
      where.salePrice = { not: null };
    }

    if (dealType === 'TRENDING' || dealType === 'MOST_LOVED') {
      where.averageRating = { gte: 4.0 };
    }

    if (inStock) {
      where.variants = {
        some: {
          inventory: {
            quantity: { gt: 0 },
          },
        },
      };
    }

    if (minPrice != null || maxPrice != null) {
      where.basePrice = {
        ...(minPrice != null ? { gte: minPrice } : {}),
        ...(maxPrice != null ? { lte: maxPrice } : {}),
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof rating === 'number') {
      where.averageRating = { gte: rating };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case ProductSortBy.PRICE_ASC:
        orderBy = { basePrice: 'asc' };
        break;
      case ProductSortBy.PRICE_DESC:
        orderBy = { basePrice: 'desc' };
        break;
      case ProductSortBy.RATING:
        orderBy = { averageRating: 'desc' };
        break;
      case ProductSortBy.POPULARITY:
      case ProductSortBy.BEST_SELLER:
        orderBy = { reviewCount: 'desc' };
        break;
      case ProductSortBy.DISCOUNT_DESC:
        // Prioritize on-sale items with lowest salePrice / highest rating
        orderBy = { salePrice: 'asc' };
        break;
      case ProductSortBy.RELEVANCE:
      case ProductSortBy.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
          },
          // Cards need variant ids + stock to offer Add to Cart directly from
          // the listing grid (the detail endpoint already returns these).
          variants: {
            include: {
              inventory: true,
            },
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
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          include: {
            inventory: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        seller: {
          select: { id: true, storeName: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    // Public detail endpoint: only ACTIVE products are visible. Draft/archived
    // products stay private — sellers see their own via /sellers/products and
    // admins via /admin/products.
    if (product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException(`Product not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (user.role !== Role.ADMIN) {
      const sellerId = await this.getSellerId(user.userId);
      if (product.sellerId !== sellerId) {
        throw new ForbiddenException('You can only update your own products');
      }
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });
      if (existing)
        throw new ConflictException('Product with this slug already exists');
    }

    const {
      variants,
      images,
      sellerId: _dtoSellerId,
      ...productData
    } = updateProductDto as any;

    // Effective price integrity: validate against the resulting basePrice
    // (the incoming value if provided, otherwise the stored one).
    const incoming = updateProductDto as {
      basePrice?: number;
      salePrice?: number | null;
    };
    const effectiveBasePrice = incoming.basePrice ?? product.basePrice;
    const effectiveSalePrice =
      'salePrice' in updateProductDto
        ? incoming.salePrice
        : (product.salePrice as number | null);
    if (
      effectiveSalePrice != null &&
      Number(effectiveSalePrice) > Number(effectiveBasePrice)
    ) {
      throw new BadRequestException(
        'salePrice must be less than or equal to basePrice',
      );
    }

    // Reference-aware variant sync.
    // Variants referenced by CartItem/OrderItem have RESTRICT FKs in the
    // schema, so a wholesale `deleteMany:{}` replace-all made ANY product
    // that was ever carted/ordered impossible to edit (P2039 -> 500).
    // Instead: update matching variants by id/sku, create new ones, and
    // delete only variants removed from the payload AND unreferenced.
    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      if (variants) {
        const incoming = variants as Array<{
          id?: string;
          sku: string;
          color?: string;
          size?: string;
          price?: number | null;
          inventory?: { quantity?: number } | null;
        }>;
        const existing = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true, sku: true },
        });
        for (const v of incoming) {
          const match =
            (v.id && existing.find((e) => e.id === v.id)) ||
            existing.find((e) => e.sku === v.sku);
          if (match) {
            await tx.productVariant.update({
              where: { id: match.id },
              data: {
                sku: v.sku,
                color: v.color ?? null,
                size: v.size ?? null,
                price: v.price ?? null,
                ...(v.inventory && {
                  inventory: {
                    upsert: {
                      where: { variantId: match.id },
                      update: { quantity: v.inventory.quantity ?? 0 },
                      create: { quantity: v.inventory.quantity ?? 0 },
                    },
                  },
                }),
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                color: v.color ?? null,
                size: v.size ?? null,
                price: v.price ?? null,
                inventory: {
                  create: { quantity: v.inventory?.quantity ?? 0 },
                },
              },
            });
          }
        }
        // Remove only payload-dropped variants that no cart/order still references.
        const incomingIds = incoming.map((v) => v.id).filter(Boolean);
        const incomingSkus = new Set(incoming.map((v) => v.sku));
        const removed = existing
          .filter((e) => !incomingSkus.has(e.sku) && !incomingIds.includes(e.id))
          .map((e) => e.id);
        if (removed.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              productId: id,
              id: { in: removed },
              cartItems: { none: {} },
              orderItems: { none: {} },
            },
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...productData,
          ...(images && {
            images: {
              deleteMany: {},
              create: images.map((img: any, i: number) => ({
                url: img.url,
                alt: img.alt,
                sortOrder: img.sortOrder ?? i,
              })),
            },
          }),
        },
        include: { variants: { include: { inventory: true } }, images: true },
      });
    }, {
      // Remote Postgres (Neon) round-trips are slow: the 5s default transaction
      // timeout expired mid-commit (P2028 -> 500) on real admin edits. Use the
      // same generous budget as the checkout transaction.
      maxWait: 15000,
      timeout: 30000,
    }).catch((error) => {
      // Unique violations (duplicate variant SKUs) must surface as 409.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Product slug or variant SKU already exists');
      }
      throw error;
    }) as Awaited<ReturnType<typeof this.prisma.product.update>>;

    const oldPrice = Number(product.salePrice ?? product.basePrice);
    const newPrice = Number(updatedProduct.salePrice ?? updatedProduct.basePrice);

    if (newPrice < oldPrice) {
      const wishlists = await this.prisma.wishlistItem.findMany({
        where: { productId: id },
        include: { wishlist: { select: { userId: true } } },
      });
      const formattedOldPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(oldPrice);
      const formattedNewPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(newPrice);

      for (const w of wishlists) {
        await this.notificationsService.createNotification(
          w.wishlist.userId,
          'WISHLIST_UPDATE',
          'Price Drop Alert',
          `An item in your wishlist, "${updatedProduct.name}", has dropped in price from ${formattedOldPrice} to ${formattedNewPrice}!`,
        );
      }
    }

    this.searchSyncQueue
      .add('upsert-product', { productId: updatedProduct.id }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } })
      .catch((err) => {
        console.error('Failed to enqueue upsert-product job', err);
      });

    return updatedProduct;
  }

  async remove(id: string, user: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (user.role !== Role.ADMIN) {
      const sellerId = await this.getSellerId(user.userId);
      if (product.sellerId !== sellerId) {
        throw new ForbiddenException('You can only delete your own products');
      }
    }

    const deletedProduct = await this.prisma.product.delete({
      where: { id },
    });

    this.searchSyncQueue
      .add('delete-product', { productId: id }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } })
      .catch((err) => {
        console.error('Failed to enqueue delete-product job', err);
      });

    return deletedProduct;
  }

  async uploadImage(productId: string, file: Express.Multer.File, user: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (user.role !== Role.ADMIN) {
      const sellerId = await this.getSellerId(user.userId);
      if (product.sellerId !== sellerId) {
        throw new ForbiddenException('You can only upload images to your own products');
      }
    }

    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `products/${productId}`,
    );

    const maxSortOrder = product.images.reduce(
      (max, img) => Math.max(max, img.sortOrder),
      -1,
    );

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        sortOrder: maxSortOrder + 1,
      },
    });

    this.searchSyncQueue
      .add('upsert-product', { productId: product.id }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } })
      .catch((err) => {
        console.error('Failed to enqueue upsert-product job', err);
      });

    return image;
  }

  async deleteImage(productId: string, imageId: string, user: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (user.role !== Role.ADMIN) {
      const sellerId = await this.getSellerId(user.userId);
      if (product.sellerId !== sellerId) {
        throw new ForbiddenException('You can only delete images from your own products');
      }
    }

    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    if (image.publicId) {
      await this.cloudinaryService.deleteImage(image.publicId);
    }

    const deletedImage = await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    this.searchSyncQueue
      .add('upsert-product', { productId: product.id })
      .catch((err) => {
        console.error('Failed to enqueue upsert-product job', err);
      });

    return deletedImage;
  }

  async updateImage(
    productId: string,
    imageId: string,
    updateImageDto: UpdateImageDto,
    user: any,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (user.role !== Role.ADMIN) {
      const sellerId = await this.getSellerId(user.userId);
      if (product.sellerId !== sellerId) {
        throw new ForbiddenException('You can only update images on your own products');
      }
    }

    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    const updatedImage = await this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        alt: updateImageDto.alt ?? image.alt,
        sortOrder: updateImageDto.sortOrder ?? image.sortOrder,
      },
    });

    this.searchSyncQueue
      .add('upsert-product', { productId: product.id })
      .catch((err) => {
        console.error('Failed to enqueue upsert-product job', err);
      });

    return updatedImage;
  }
}
