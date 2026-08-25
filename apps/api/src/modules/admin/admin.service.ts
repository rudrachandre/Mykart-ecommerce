import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Prisma, Role, ProductStatus } from '@prisma/client';

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
}
