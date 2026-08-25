import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart: any = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: { take: 1 } },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                color: true,
                size: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Race-safe creation: concurrent requests (e.g. StrictMode remounts)
      // can both observe "no cart" and both attempt an insert. The second
      // insert would violate Cart.userId@unique (P2002) and surface as a 500,
      // so we catch it and simply re-read the cart created by the winner.
      const CART_UNIQUE_VIOLATION = 'P2002';
      try {
        cart = await this.prisma.cart.create({
          data: { userId },
          include: { items: { include: { product: true, variant: true } } },
        });
      } catch (error: any) {
        if (error?.code !== CART_UNIQUE_VIOLATION) throw error;
        const existing = await this.prisma.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true, images: { take: 1 } },
                },
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    color: true,
                    size: true,
                    inventory: true,
                  },
                },
              },
            },
          },
        });
        if (!existing) throw error;
        cart = existing;
      }
    }

    return cart;
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const cart = await this.getCart(userId);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { inventory: true },
    });

    if (!variant || variant.productId !== dto.productId) {
      throw new NotFoundException('Product variant not found');
    }

    if (!variant.inventory || variant.inventory.quantity < dto.quantity) {
      throw new BadRequestException('Not enough stock available');
    }

    // Determine price (use variant price if exists, otherwise base price from product)
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const price = variant.price || product.salePrice || product.basePrice;

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      if (variant.inventory.quantity < newQuantity) {
        throw new BadRequestException('Not enough stock available to add more');
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        price,
      },
    });
  }

  async updateItemQuantity(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: { include: { inventory: true } } },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    if (
      !item.variant.inventory ||
      item.variant.inventory.quantity < dto.quantity
    ) {
      throw new BadRequestException('Not enough stock available');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }
}
