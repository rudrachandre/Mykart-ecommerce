import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OnboardSellerDto } from './dto/onboard-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { Role, OrderStatus } from '@prisma/client';
import { slugify } from '../../common/utils/slugify';
import { AnalyticsService } from '../analytics/analytics.service';
import { OrdersService } from '../orders/orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class SellersService {
  /**
   * Legal order-status transitions a seller may perform.
   *
   * - PROCESSING means the payment has been confirmed (Module 13), so
   *   cancelling from there would require a refund flow that does not exist;
   *   it is therefore not an allowed seller action.
   * - Cancelling an unpaid (PENDING) order is routed through
   *   OrdersService.cancelPendingOrder(), which reuses the Module 13
   *   reservation-release logic so stock/payment reconciliation stays in one place.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.RETURN_REQUESTED]: [],
    [OrderStatus.RETURNED]: [],
    [OrderStatus.REFUND_PENDING]: [],
    [OrderStatus.REFUNDED]: [],
    [OrderStatus.REPLACEMENT_REQUESTED]: [],
    [OrderStatus.REPLACED]: [],
  };

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private ordersService: OrdersService,
  ) {}

  /**
   * Admin moderation gate: a suspended seller may use no seller-self-service
   * endpoint. Role-based guards stay untouched; this is the suspension layer.
   */
  private assertSellerActive(seller: { status: string }) {
    if (seller.status !== 'ACTIVE' && seller.status !== 'APPROVED') {
      throw new ForbiddenException('Seller account is suspended');
    }
  }

  async onboard(userId: string, dto: OnboardSellerDto) {
    const existingSeller = await this.prisma.seller.findUnique({
      where: { userId },
    });
    if (existingSeller) throw new ConflictException('User is already a seller');
    const slug = slugify(dto.storeName);
    const existingSlug = await this.prisma.seller.findUnique({
      where: { slug },
    });
    if (existingSlug)
      throw new ConflictException('Store name is already taken');

    const result = await this.prisma.$transaction(async (prisma) => {
      const seller = await prisma.seller.create({
        data: {
          userId,
          storeName: dto.storeName,
          slug,
          description: dto.description,
          logo: dto.logo,
        },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { role: Role.SELLER },
      });
      return seller;
    });

    await this.analyticsService.logAction(
      userId,
      'SELLER_ONBOARDED',
      result.id,
      { storeName: dto.storeName },
    );
    return result;
  }

  async getProfile(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: { _count: { select: { products: true, orderItems: true } } },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);
    return seller;
  }

  async getDashboard(userId: string) {
    const seller = await this.getProfile(userId);

    // Total & Active Products
    const [totalProducts, activeProducts] = await Promise.all([
      this.prisma.product.count({ where: { sellerId: seller.id } }),
      this.prisma.product.count({
        where: { sellerId: seller.id, status: 'ACTIVE' },
      }),
    ]);

    // Inventory Units & Low Stock Count
    const inventoryItems = await this.prisma.inventory.findMany({
      where: { variant: { product: { sellerId: seller.id } } },
      select: { quantity: true, reserved: true },
    });
    const inventoryUnits = inventoryItems.reduce(
      (acc, item) => acc + item.quantity,
      0,
    );
    const lowStockCount = inventoryItems.filter(
      (item) => item.quantity - item.reserved <= 10,
    ).length;

    // Order Items & Revenue
    const orderItems = await this.prisma.orderItem.findMany({
      where: { sellerId: seller.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
        },
        product: { select: { name: true, images: { take: 1 } } },
        variant: { select: { sku: true, color: true, size: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
    });

    const revenue = orderItems.reduce(
      (acc, item) => acc + Number(item.price) * item.quantity,
      0,
    );

    // Distinct Order IDs & Pending Orders
    const orderMap = new Map<string, { status: string; createdAt: Date }>();
    orderItems.forEach((item) => {
      if (item.order) {
        orderMap.set(item.order.id, {
          status: item.order.status,
          createdAt: item.order.createdAt,
        });
      }
    });

    const totalOrders = orderMap.size;
    let pendingOrders = 0;
    orderMap.forEach((order) => {
      if (
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.PROCESSING
      ) {
        pendingOrders++;
      }
    });

    // Recent orders (last 5)
    const recentOrders = orderItems.slice(0, 5);

    // Recent products (last 5)
    const recentProducts = await this.prisma.product.findMany({
      where: { sellerId: seller.id },
      include: {
        category: { select: { name: true } },
        variants: { include: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Inventory alerts (quantity <= 10)
    const inventoryAlerts = await this.prisma.productVariant.findMany({
      where: {
        product: { sellerId: seller.id },
        inventory: { quantity: { lte: 10 } },
      },
      include: { product: { select: { name: true } }, inventory: true },
      take: 10,
    });

    // Top selling products for this seller
    const topProductsRaw = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { sellerId: seller.id },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProducts = await Promise.all(
      topProductsRaw.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, slug: true, images: { take: 1 } },
        });
        return {
          productId: item.productId,
          name: product?.name || 'Unknown Product',
          slug: product?.slug || '',
          imageUrl: product?.images?.[0]?.url || null,
          unitsSold: item._sum.quantity || 0,
          revenue: Number(item._sum.price || 0) * (item._sum.quantity || 0),
        };
      }),
    );

    return {
      profile: seller,
      kpis: {
        totalProducts,
        activeProducts,
        inventoryUnits,
        totalOrders,
        pendingOrders,
        lowStockCount,
        revenue,
        sales: orderItems.length,
      },
      revenue,
      sales: orderItems.length,
      recentOrders,
      recentProducts,
      inventoryAlerts,
      topProducts,
    };
  }

  async updateProfile(userId: string, dto: UpdateSellerDto) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    const updateData: any = { ...dto };
    if (dto.storeName && dto.storeName !== seller.storeName) {
      updateData.slug = slugify(dto.storeName);
      const existingSlug = await this.prisma.seller.findUnique({
        where: { slug: updateData.slug },
      });
      if (existingSlug && existingSlug.id !== seller.id)
        throw new ConflictException('Store name is already taken');
    }

    return this.prisma.seller.update({ where: { userId }, data: updateData });
  }

  async getSellerProducts(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    return this.prisma.product.findMany({
      where: { sellerId: seller.id },
      include: {
        category: { select: { id: true, name: true } },
        variants: { include: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSellerOrders(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    return this.prisma.orderItem.findMany({
      where: { sellerId: seller.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            shippingAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
        product: { select: { name: true, images: { take: 1 } } },
        variant: { select: { sku: true, color: true, size: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
    });
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId, sellerId: seller.id },
    });

    if (orderItems.length === 0) {
      throw new NotFoundException('Order not found or unauthorized');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const nextStatus = dto.status;

    if (order.status === nextStatus) {
      return order;
    }

    const allowedTransitions =
      SellersService.ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowedTransitions.includes(nextStatus)) {
      throw new BadRequestException(
        `Illegal status transition from ${order.status} to ${nextStatus}`,
      );
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      return this.ordersService.cancelPendingOrder(orderId);
    }

    if (
      nextStatus === OrderStatus.DELIVERED ||
      nextStatus === OrderStatus.PROCESSING ||
      nextStatus === OrderStatus.SHIPPED
    ) {
      await this.prisma.payment.updateMany({
        where: { orderId, provider: 'COD', status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
  }

  async getOrderDetail(userId: string, orderId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId, sellerId: seller.id },
    });

    if (orderItems.length === 0) {
      throw new NotFoundException('Order not found or unauthorized');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: { take: 1 } },
            },
            variant: { select: { id: true, color: true, size: true } },
          },
        },
        payments: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  async approveReturn(userId: string, orderId: string, returnId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId, sellerId: seller.id },
    });

    if (orderItems.length === 0) {
      throw new NotFoundException('Order not found or unauthorized');
    }

    const returnRecord = await this.prisma.return.findFirst({
      where: { id: returnId, orderId },
      include: { order: { include: { items: true } } },
    });

    if (!returnRecord) {
      throw new NotFoundException('Return request not found');
    }

    const updated = await this.prisma.$transaction(async (prisma) => {
      const updatedReturn = await prisma.return.update({
        where: { id: returnId },
        data: { status: 'APPROVED' },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'RETURNED' },
      });

      const sellerItems = returnRecord.order.items.filter(
        (item) => item.sellerId === seller.id,
      );

      for (const item of sellerItems) {
        await prisma.inventory.updateMany({
          where: {
            variantId: item.variantId,
            reserved: { gte: item.quantity },
          },
          data: {
            reserved: { decrement: item.quantity },
            quantity: { increment: item.quantity },
          },
        });
      }

      const payment = await prisma.payment.findFirst({
        where: { orderId, status: 'COMPLETED' },
      });

      if (payment) {
        let sellerAmount = 0;
        for (const item of sellerItems) {
          sellerAmount += Number(item.price) * item.quantity;
        }

        await prisma.refund.create({
          data: {
            orderId,
            paymentId: payment.id,
            amount: sellerAmount,
            reason: `Approved return: ${returnRecord.reason}`,
            status: 'PENDING',
          },
        });

        const totalOrderAmount = returnRecord.order.items.reduce(
          (acc, item) => acc + Number(item.price) * item.quantity,
          0,
        );
        const isFullRefund = sellerAmount >= totalOrderAmount;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: isFullRefund ? 'REFUNDED' : 'COMPLETED' },
        });
      }

      return updatedReturn;
    });

    return updated;
  }

  async rejectReturn(userId: string, orderId: string, returnId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId, sellerId: seller.id },
    });

    if (orderItems.length === 0) {
      throw new NotFoundException('Order not found or unauthorized');
    }

    const returnRecord = await this.prisma.return.findFirst({
      where: { id: returnId, orderId },
    });

    if (!returnRecord) {
      throw new NotFoundException('Return request not found');
    }

    const updated = await this.prisma.return.update({
      where: { id: returnId },
      data: { status: 'REJECTED' },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });

    return updated;
  }

  async getSellerReviews(userId: string, page = 1, limit = 10) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          product: { sellerId: seller.id },
        },
        include: {
          user: { select: { name: true, avatar: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: {
          product: { sellerId: seller.id },
        },
      }),
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

  async getSellerAnalytics(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    this.assertSellerActive(seller);

    // Top selling products for this seller
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { sellerId: seller.id },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    // Fetch product names for those top selling products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, slug: true },
        });
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          slug: product?.slug || '',
          quantitySold: item._sum.quantity || 0,
          revenue: Number(item._sum.price || 0) * (item._sum.quantity || 0),
        };
      }),
    );

    // Order status distribution for this seller
    const orderStatusStats = await this.prisma.orderItem.groupBy({
      by: ['orderId'],
      where: { sellerId: seller.id },
    });

    const orderIds = orderStatusStats.map((o) => o.orderId);
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { status: true },
    });

    const statusDistribution = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      topProducts: topProductsWithDetails,
      statusDistribution,
    };
  }
}
