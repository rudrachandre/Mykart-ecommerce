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
    if (seller.status !== 'ACTIVE') {
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

    // Revenue
    const orderItems = await this.prisma.orderItem.findMany({
      where: { sellerId: seller.id },
    });
    const revenue = orderItems.reduce(
      (acc, item) => acc + Number(item.price) * item.quantity,
      0,
    );

    // Recent orders
    const recentOrders = await this.prisma.orderItem.findMany({
      where: { sellerId: seller.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
        product: { select: { name: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: 5,
    });

    // Recent products
    const recentProducts = await this.prisma.product.findMany({
      where: { sellerId: seller.id },
      include: { variants: { include: { inventory: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Inventory alerts (quantity < 10)
    const inventoryAlerts = await this.prisma.productVariant.findMany({
      where: {
        product: { sellerId: seller.id },
        inventory: { quantity: { lt: 10 } },
      },
      include: { product: { select: { name: true } }, inventory: true },
      take: 10,
    });

    return {
      profile: seller,
      revenue,
      sales: orderItems.length,
      recentOrders,
      recentProducts,
      inventoryAlerts,
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

      for (const item of returnRecord.order.items) {
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
        await prisma.refund.create({
          data: {
            orderId,
            paymentId: payment.id,
            amount: payment.amount,
            reason: `Approved return: ${returnRecord.reason}`,
            status: 'PENDING',
          },
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
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
}
