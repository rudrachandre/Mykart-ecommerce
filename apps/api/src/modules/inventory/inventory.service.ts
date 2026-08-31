import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getInventoryByVariantId(variantId: string, user: any) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellerId: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found for this variant');
    }

    if (user.role !== Role.ADMIN) {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.userId },
      });
      if (!seller || inventory.variant.product.sellerId !== seller.id) {
        throw new ForbiddenException('You can only access your own inventory');
      }
    }

    return {
      id: inventory.id,
      variantId: inventory.variantId,
      quantity: inventory.quantity,
      reserved: inventory.reserved,
      available: inventory.quantity - inventory.reserved,
      updatedAt: inventory.updatedAt,
      variant: {
        id: inventory.variant.id,
        sku: inventory.variant.sku,
        color: inventory.variant.color,
        size: inventory.variant.size,
        product: {
          id: inventory.variant.product.id,
          name: inventory.variant.product.name,
          sellerId: inventory.variant.product.sellerId,
        },
      },
    };
  }

  async updateStock(
    variantId: string,
    user: any,
    quantity: number,
    reason?: string,
  ) {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sellerId: true,
          },
        },
        inventory: true,
      },
    });

    if (!variant || !variant.inventory) {
      throw new NotFoundException('Variant or inventory not found');
    }

    if (user.role !== Role.ADMIN) {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.userId },
      });
      if (!seller || variant.product.sellerId !== seller.id) {
        throw new ForbiddenException('You can only update your own inventory');
      }
    }

    if (quantity < variant.inventory.reserved) {
      throw new BadRequestException(
        `Quantity cannot be less than reserved stock (${variant.inventory.reserved})`,
      );
    }

    const quantityChange = quantity - variant.inventory.quantity;
    return this.adjustStock(variantId, user, quantityChange, 'ADJUSTMENT', reason);
  }

  async getLowStockItems(
    user: any,
    threshold: number = 10,
    page: number = 1,
    limit: number = 20,
    sellerIdFilter?: string,
  ) {
    if (threshold < 0) {
      throw new BadRequestException('Threshold cannot be negative');
    }

    const where: any = {
      quantity: { gt: 0 },
    };

    if (user.role === Role.ADMIN) {
      if (sellerIdFilter) {
        const seller = await this.prisma.seller.findUnique({
          where: { id: sellerIdFilter },
        });
        if (!seller) {
          throw new NotFoundException('Seller not found');
        }
        where.variant = { product: { sellerId: sellerIdFilter } };
      }
    } else {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.userId },
      });
      if (!seller) {
        throw new ForbiddenException('Seller profile not found');
      }
      where.variant = { product: { sellerId: seller.id } };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sellerId: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    const mapped = items
      .map((inv) => {
        const available = inv.quantity - inv.reserved;
        if (available > threshold) return null;
        return {
          variantId: inv.variantId,
          sku: inv.variant.sku,
          productName: inv.variant.product.name,
          quantity: inv.quantity,
          reserved: inv.reserved,
          available,
          threshold,
          updatedAt: inv.updatedAt,
        };
      })
      .filter(Boolean);

    return {
      items: mapped,
      meta: {
        total: mapped.length,
        page,
        limit,
        totalPages: Math.ceil(mapped.length / limit),
      },
    };
  }

  async bulkUpdateStock(updates: any[], user: any) {
    if (!updates || updates.length === 0) {
      throw new BadRequestException('Updates array cannot be empty');
    }

    const seller =
      user.role === Role.ADMIN
        ? null
        : await this.prisma.seller.findUnique({
            where: { userId: user.userId },
          });

    if (user.role !== Role.ADMIN && !seller) {
      throw new ForbiddenException('Seller profile not found');
    }

    const variantIds = updates.map((u) => u.variantId);

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            sellerId: true,
          },
        },
        inventory: true,
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const update of updates) {
      const variant = variantMap.get(update.variantId);
      if (!variant || !variant.inventory) {
        throw new NotFoundException(
          `Variant or inventory not found: ${update.variantId}`,
        );
      }

      if (user.role !== Role.ADMIN && variant.product.sellerId !== seller!.id) {
        throw new ForbiddenException(
          `You do not have permission to update variant: ${update.variantId}`,
        );
      }

      if (update.quantity < 0) {
        throw new BadRequestException(
          `Quantity cannot be negative for variant: ${update.variantId}`,
        );
      }

      if (update.quantity < variant.inventory.reserved) {
        throw new BadRequestException(
          `Quantity cannot be less than reserved stock (${variant.inventory.reserved}) for variant: ${update.variantId}`,
        );
      }
    }

    const results = await this.prisma.$transaction(async (prisma: any) => {
      return Promise.all(
        updates.map((update) => {
          const quantityChange =
            update.quantity - variantMap.get(update.variantId)!.inventory!.quantity;
          return this.adjustStock(
            update.variantId,
            user,
            quantityChange,
            'ADJUSTMENT',
            'Bulk update',
          );
        }),
      );
    });

    return results.map((inv) => ({
      id: inv.id,
      variantId: inv.variantId,
      quantity: inv.quantity,
      reserved: inv.reserved,
      available: inv.quantity - inv.reserved,
      updatedAt: inv.updatedAt,
      variant: {
        id: inv.variant.id,
        sku: inv.variant.sku,
        color: inv.variant.color,
        size: inv.variant.size,
        product: {
          id: inv.variant.product.id,
          name: inv.variant.product.name,
          sellerId: inv.variant.product.sellerId,
        },
      },
    }));
  }

  async adjustStock(
    variantId: string,
    user: any,
    quantityChange: number,
    type: string,
    reason?: string,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sellerId: true,
          },
        },
        inventory: true,
      },
    });

    if (!variant || !variant.inventory) {
      throw new NotFoundException('Variant or inventory not found');
    }

    if (user.role !== Role.ADMIN) {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.userId },
      });
      if (!seller || variant.product.sellerId !== seller.id) {
        throw new ForbiddenException('You can only adjust your own inventory');
      }
    }

    const currentQuantity = variant.inventory.quantity;
    const currentReserved = variant.inventory.reserved;
    const newQuantity = currentQuantity + quantityChange;

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Quantity cannot be negative. Current: ${currentQuantity}, Change: ${quantityChange}`,
      );
    }

    if (newQuantity < currentReserved) {
      throw new BadRequestException(
        `Quantity cannot be less than reserved stock (${currentReserved})`,
      );
    }

    const updated = await this.prisma.$transaction(async (prisma) => {
      const inv = await prisma.inventory.update({
        where: { variantId },
        data: { quantity: newQuantity },
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sellerId: true,
                },
              },
            },
          },
        },
      });

      await prisma.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type,
          quantityChange,
          previousQuantity: currentQuantity,
          previousReserved: currentReserved,
          newQuantity: inv.quantity,
          newReserved: inv.reserved,
          reason: reason ?? null,
        },
      });

      return inv;
    });

    const available = updated.quantity - updated.reserved;

    // Back-in-stock alert for wishlist users
    const wasOutOfStock = (currentQuantity - currentReserved) <= 0;
    const isNowInStock = available > 0;

    if (wasOutOfStock && isNowInStock) {
      const wishlists = await this.prisma.wishlistItem.findMany({
        where: { productId: variant.productId },
        include: { wishlist: { select: { userId: true } } },
      });
      for (const w of wishlists) {
        await this.notificationsService.createNotification(
          w.wishlist.userId,
          'WISHLIST_UPDATE',
          'Product Back in Stock',
          `An item in your wishlist, "${variant.product.name}", is now back in stock!`,
        );
      }
    }

    if (available <= updated.lowStockThreshold && available > 0) {
      await this.notificationsService.createNotification(
        variant.product.sellerId,
        'LOW_STOCK',
        'Low Stock Alert',
        `Product "${variant.product.name}" (SKU: ${variant.sku}) is running low. Available: ${available}, Threshold: ${updated.lowStockThreshold}`,
      );
    }

    return {
      id: updated.id,
      variantId: updated.variantId,
      quantity: updated.quantity,
      reserved: updated.reserved,
      available,
      updatedAt: updated.updatedAt,
      variant: {
        id: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        product: {
          id: variant.product.id,
          name: variant.product.name,
          sellerId: variant.product.sellerId,
        },
      },
    };
  }

  async getTransactionHistory(
    variantId: string,
    user: any,
    page: number = 1,
    limit: number = 20,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sellerId: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (user.role !== Role.ADMIN) {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.userId },
      });
      if (!seller || variant.product.sellerId !== seller.id) {
        throw new ForbiddenException(
          'You can only access your own inventory history',
        );
      }
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      select: { id: true },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found for this variant');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where: { inventoryId: inventory.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryTransaction.count({
        where: { inventoryId: inventory.id },
      }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        quantityChange: tx.quantityChange,
        previousQuantity: tx.previousQuantity,
        previousReserved: tx.previousReserved,
        newQuantity: tx.newQuantity,
        newReserved: tx.newReserved,
        reason: tx.reason,
        createdAt: tx.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
