import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    let wishlist: any = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                salePrice: true,
                images: { take: 1 },
                variants: {
                  take: 1,
                  include: {
                    inventory: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }

    return wishlist;
  }

  async addItem(userId: string, dto: AddToWishlistDto) {
    const wishlist: any = await this.getWishlist(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingItem = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: dto.productId,
      },
    });

    if (existingItem) {
      throw new ConflictException('Product is already in wishlist');
    }

    return this.prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: dto.productId,
      },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');

    const item = await this.prisma.wishlistItem.findFirst({
      where: { id: itemId, wishlistId: wishlist.id },
    });

    if (!item) throw new NotFoundException('Wishlist item not found');

    return this.prisma.wishlistItem.delete({
      where: { id: itemId },
    });
  }

  async mergeWishlist(userId: string, productIds: string[]) {
    const wishlist = await this.getWishlist(userId);
    const addedItems = [];

    for (const productId of productIds) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) continue;

      const existingItem = await this.prisma.wishlistItem.findFirst({
        where: {
          wishlistId: wishlist.id,
          productId,
        },
      });

      if (!existingItem) {
        const newItem = await this.prisma.wishlistItem.create({
          data: {
            wishlistId: wishlist.id,
            productId,
          },
        });
        addedItems.push(newItem);
      }
    }

    return { mergedCount: addedItems.length };
  }

  async getGuestWishlist(productIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        images: { take: 1 },
        variants: {
          take: 1,
          include: {
            inventory: true,
          },
        },
      },
    });

    const items = products.map((product) => ({
      id: product.id,
      product,
    }));

    return { items };
  }
}
