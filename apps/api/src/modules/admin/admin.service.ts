import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Prisma, Role, ProductStatus } from '@prisma/client';
import { RefundProcessDto } from '../orders/dto/refund-process.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getUsers(
    skip: number = 0,
    take: number = 20,
    search?: string,
    role?: string,
  ) {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && role !== 'ALL') {
      where.role = role as any;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getSellers(skip: number = 0, take: number = 20, search?: string) {
    const where: Prisma.SellerWhereInput = {};
    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { products: true, orderItems: true } },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.seller.count({ where }),
    ]);

    return { sellers, total };
  }

  async getOrders(
    skip: number = 0,
    take: number = 20,
    search?: string,
    status?: string,
  ) {
    const where: Prisma.OrderWhereInput = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status as any;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { email: true, name: true } },
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, color: true, size: true } },
            seller: { select: { id: true, storeName: true } },
          },
        },
        payments: true,
        user: { select: { id: true, name: true, email: true } },
        refunds: true,
        returns: true,
        replacements: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async processRefund(orderId: string, dto: RefundProcessDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = order.payments.find((p) => p.status === 'COMPLETED');

    if (!payment) {
      throw new BadRequestException(
        'No completed payment found for this order',
      );
    }

    const existingRefunds = await this.prisma.refund.aggregate({
      where: { paymentId: payment.id },
      _sum: { amount: true },
    });

    const refundedAmount = Number(existingRefunds._sum.amount || 0);
    const availableAmount = Number(payment.amount) - refundedAmount;

    if (dto.amount > availableAmount + 0.001) {
      throw new BadRequestException(
        `Refund amount exceeds available balance. Available: ${availableAmount.toFixed(2)}`,
      );
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        amount: dto.amount,
        reason: dto.reason,
        status: 'PENDING',
      },
    });

    if (dto.amount >= availableAmount - 0.001) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      });
    }

    return refund;
  }

  async getSellerById(id: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        products: {
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
            },
            variants: {
              include: { inventory: true },
            },
          },
        },
        _count: { select: { products: true, orderItems: true } },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller;
  }

  /**
   * Platform-wide product listing for the admin products page.
   * Shape matches apps/web/src/lib/api/admin.ts::getAdminProducts and
   * apps/web/src/app/admin/products/page.tsx ({ products, total }).
   */
  async getAdminProducts(skip: number = 0, take: number = 20, search?: string) {
    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true } },
          seller: {
            select: {
              id: true,
              storeName: true,
              status: true,
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async changeUserRole(adminUserId: string, targetUserId: string, role: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === role) {
      // Idempotent no-op; no audit entry for a no-change request.
      return user;
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    // NOTE: access tokens carry the role claim (Module 13 JWT design), so the
    // new role propagates on the next token refresh (~10 min TTL). Accepted.
    await this.analytics.logAction(adminUserId, 'USER_ROLE_CHANGED', user.id, {
      from: user.role,
      to: role,
    });

    return updated;
  }

  async setSellerStatus(
    adminUserId: string,
    sellerId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { user: { select: { email: true } } },
    });
    if (!seller) throw new NotFoundException('Seller not found');

    if (seller.status === status) {
      return seller;
    }

    const updated = await this.prisma.seller.update({
      where: { id: sellerId },
      data: { status },
    });

    await this.analytics.logAction(
      adminUserId,
      'SELLER_STATUS_CHANGED',
      sellerId,
      { from: seller.status, to: status, storeName: seller.storeName },
    );

    return updated;
  }

  async setProductStatus(
    adminUserId: string,
    productId: string,
    status: ProductStatus,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product.status === status) {
      return product;
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    await this.analytics.logAction(
      adminUserId,
      'PRODUCT_STATUS_CHANGED',
      productId,
      { from: product.status, to: status, productName: product.name },
    );

    return updated;
  }

  async getPayments(skip = 0, take = 20) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.payment.count(),
    ]);

    return { payments, total };
  }

  async getRefunds(skip = 0, take = 20) {
    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.refund.count(),
    ]);

    return { refunds, total };
  }

  async getReviews(skip = 0, take = 20, reported = false) {
    const where: Prisma.ReviewWhereInput = {};
    if (reported) {
      where.reported = true;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { reviews, total };
  }

  async updateReviewStatus(id: string, status: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id },
      data: { status, reported: status === 'APPROVED' ? false : undefined },
    });
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.delete({ where: { id } });
  }

  private getSettingsFilePath() {
    return path.join(process.cwd(), 'apps', 'api', 'src', 'modules', 'admin', 'platform-settings.json');
  }

  async getSettings() {
    const filePath = this.getSettingsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      const defaultSettings = {
        siteName: 'MyKart',
        supportEmail: 'support@mykart.local',
        maintenanceMode: false,
        allowSellerRegistration: true,
      };
      fs.writeFileSync(filePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async updateSettings(dto: any) {
    const filePath = this.getSettingsFilePath();
    const current = await this.getSettings();
    const updated = {
      siteName: dto.siteName ?? current.siteName,
      supportEmail: dto.supportEmail ?? current.supportEmail,
      maintenanceMode: dto.maintenanceMode !== undefined ? !!dto.maintenanceMode : current.maintenanceMode,
      allowSellerRegistration: dto.allowSellerRegistration !== undefined ? !!dto.allowSellerRegistration : current.allowSellerRegistration,
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }
}
