import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async logAction(
    userId: string,
    action: string,
    entityId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityId,
        details: details || {},
        ipAddress,
        userAgent,
      },
    });
  }

  async getAuditLogs(skip: number = 0, take: number = 20, action?: string, userId?: string) {
    const where: Prisma.AuditLogWhereInput = {};
    if (action) {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getDashboardStats() {
    const cacheKey = 'analytics:dashboard-stats';
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalCustomers,
      totalSellers,
      newCustomers,
      totalOrders,
      ordersToday,
      ordersLast7Days,
      ordersLast30Days,
      totalRevenueData,
      revenueTodayData,
      revenueLast7DaysData,
      revenueLast30DaysData,
      orderStatuses,
      sellerStatuses,
      totalProducts,
      activeProducts,
      inventoryData,
      paymentsData,
      refundsData,
      returnsData,
      reviewsData,
      couponsData,
    ] = await Promise.all([
      // USERS
      this.prisma.user.count().catch(() => 0),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }).catch(() => 0),
      this.prisma.user.count({ where: { role: 'SELLER' } }).catch(() => 0),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),

      // ORDERS
      this.prisma.order.count().catch(() => 0),
      this.prisma.order.count({ where: { createdAt: { gte: oneDayAgo } } }).catch(() => 0),
      this.prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0),
      this.prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),

      // REVENUE
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' } },
      }).catch(() => ({ _sum: { total: null } })),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: oneDayAgo }, status: { not: 'CANCELLED' } },
      }).catch(() => ({ _sum: { total: null } })),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'CANCELLED' } },
      }).catch(() => ({ _sum: { total: null } })),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      }).catch(() => ({ _sum: { total: null } })),

      // STATUS DISTRIBUTION
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }).catch(() => []),
      this.prisma.seller.groupBy({
        by: ['status'],
        _count: { id: true },
      }).catch(() => []),

      // PRODUCTS
      this.prisma.product.count().catch(() => 0),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }).catch(() => 0),

      // INVENTORY
      this.prisma.inventory.findMany({
        select: { quantity: true, reserved: true },
      }).catch(() => []),

      // PAYMENTS
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
      }).catch(() => []),

      // REFUNDS
      this.prisma.refund.aggregate({
        _count: { id: true },
        _sum: { amount: true },
      }).catch(() => ({ _count: { id: 0 }, _sum: { amount: null } })),

      // RETURNS & REPLACEMENTS
      Promise.all([
        this.prisma.return.count().catch(() => 0),
        this.prisma.return.count({ where: { status: 'APPROVED' } }).catch(() => 0),
        this.prisma.return.count({ where: { status: 'REJECTED' } }).catch(() => 0),
        this.prisma.replacement.count().catch(() => 0),
      ]).catch(() => [0, 0, 0, 0]),

      // REVIEWS
      this.prisma.review.aggregate({
        _count: { id: true },
        _avg: { rating: true },
      }).catch(() => ({ _count: { id: 0 }, _avg: { rating: null } })),

      // COUPONS
      this.prisma.coupon.aggregate({
        _count: { id: true },
        _sum: { usedCount: true },
      }).catch(() => ({ _count: { id: 0 }, _sum: { usedCount: null } })),
    ]);

    // Map order status distribution
    const orderDistribution: Record<string, number> = {};
    if (Array.isArray(orderStatuses)) {
      orderStatuses.forEach((g) => {
        orderDistribution[g.status] = g._count.id;
      });
    }

    // Map seller status distribution
    const sellerDistribution: Record<string, number> = {};
    if (Array.isArray(sellerStatuses)) {
      sellerStatuses.forEach((g) => {
        sellerDistribution[g.status] = g._count.id;
      });
    }

    // Map payment status distribution
    const paymentDistribution: Record<string, number> = {};
    if (Array.isArray(paymentsData)) {
      paymentsData.forEach((g) => {
        paymentDistribution[g.status] = g._count.id;
      });
    }

    // Calculate stock numbers
    let availableStock = 0;
    let reservedStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const totalInventoryValue = 0;

    if (Array.isArray(inventoryData)) {
      inventoryData.forEach((item) => {
        const qty = item.quantity;
        const res = item.reserved;
        const avail = qty - res;
        availableStock += avail;
        reservedStock += res;
        if (avail <= 0) outOfStockCount += 1;
        else if (avail <= 10) lowStockCount += 1;
      });
    }

    const totalRevenue = Number(totalRevenueData?._sum?.total ?? 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Process reported reviews
    const reportedReviewsCount = await this.prisma.review.count({ where: { reported: true } }).catch(() => 0);
    const pendingModerationCount = await this.prisma.review.count({ where: { status: 'PENDING' } }).catch(() => 0);

    // Active coupons
    const activeCouponsCount = await this.prisma.coupon.count({ where: { active: true } }).catch(() => 0);

    const stats = {
      // Users
      totalUsers,
      totalCustomers,
      totalSellers,
      newCustomers,
      // Orders
      totalOrders,
      ordersToday,
      ordersLast7Days,
      ordersLast30Days,
      orderDistribution,
      // Revenue
      totalRevenue,
      revenueToday: Number(revenueTodayData?._sum?.total ?? 0),
      revenueLast7Days: Number(revenueLast7DaysData?._sum?.total ?? 0),
      revenueLast30Days: Number(revenueLast30DaysData?._sum?.total ?? 0),
      avgOrderValue,
      // Sellers
      sellerDistribution,
      // Products
      totalProducts,
      activeProducts,
      outOfStockCount,
      // Inventory
      availableStock,
      reservedStock,
      lowStockCount,
      totalInventoryValue,
      // Payments
      paymentDistribution,
      // Refunds
      totalRefunds: refundsData?._count?.id ?? 0,
      totalRefundAmount: Number(refundsData?._sum?.amount ?? 0),
      // Returns
      totalReturns: Array.isArray(returnsData) ? returnsData[0] : 0,
      approvedReturns: Array.isArray(returnsData) ? returnsData[1] : 0,
      rejectedReturns: Array.isArray(returnsData) ? returnsData[2] : 0,
      totalReplacements: Array.isArray(returnsData) ? returnsData[3] : 0,
      // Reviews
      totalReviews: reviewsData?._count?.id ?? 0,
      avgRating: reviewsData?._avg?.rating || 0,
      reportedReviewsCount,
      pendingModerationCount,
      // Coupons
      totalCoupons: couponsData?._count?.id ?? 0,
      activeCoupons: activeCouponsCount,
      couponsUsedCount: couponsData?._sum?.usedCount || 0,
    };

    try {
      await this.redisService.set(cacheKey, JSON.stringify(stats), 300);
    } catch {}

    return stats;
  }

  async getAnalyticsTrends(range: string = '30days') {
    const cacheKey = `analytics:trends:${range}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let days = 30;
    if (range === '7days') days = 7;
    else if (range === '90days') days = 90;
    else if (range === 'today') days = 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Orders and Revenue trends
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' },
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Customer growth trend
    const customers = await this.prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Process trends in memory with pre-filled daily date buckets
    const revenueAndOrderTrend: Record<string, { revenue: number; orders: number }> = {};
    const customerGrowth: Record<string, number> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      revenueAndOrderTrend[dateStr] = { revenue: 0, orders: 0 };
      customerGrowth[dateStr] = 0;
    }

    orders.forEach((o) => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      if (revenueAndOrderTrend[dateStr]) {
        revenueAndOrderTrend[dateStr].revenue += Number(o.total);
        revenueAndOrderTrend[dateStr].orders += 1;
      }
    });

    customers.forEach((c) => {
      const dateStr = c.createdAt.toISOString().split('T')[0];
      if (customerGrowth[dateStr] !== undefined) {
        customerGrowth[dateStr] += 1;
      }
    });

    // Convert to lists sorted by date
    const revenueAndOrderTrendList = Object.entries(revenueAndOrderTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
      }));

    const customerGrowthList = Object.entries(customerGrowth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
      }));

    // 3. Top Performers
    const [topProducts, topCategories, topSellers] = await Promise.all([
      // Top products
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // Top categories
      this.prisma.product.groupBy({
        by: ['categoryId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      // Top sellers
      this.prisma.orderItem.groupBy({
        by: ['sellerId'],
        _sum: { price: true, quantity: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5,
      }),
    ]);

    // Hydrate names
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const prod = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        return {
          name: prod?.name || 'Unknown',
          quantity: item._sum.quantity || 0,
          revenue: Number(item._sum.price || 0) * (item._sum.quantity || 0),
        };
      }),
    );

    const topCategoriesWithDetails = await Promise.all(
      topCategories.map(async (item) => {
        if (!item.categoryId) return { name: 'Uncategorized', count: item._count.id };
        const cat = await this.prisma.category.findUnique({
          where: { id: item.categoryId },
          select: { name: true },
        });
        return {
          name: cat?.name || 'Unknown',
          count: item._count.id,
        };
      }),
    );

    const topSellersWithDetails = await Promise.all(
      topSellers.map(async (item) => {
        if (!item.sellerId) return { storeName: 'Unknown', revenue: 0 };
        const sel = await this.prisma.seller.findUnique({
          where: { id: item.sellerId },
          select: { storeName: true },
        });
        return {
          storeName: sel?.storeName || 'Unknown',
          revenue: Number(item._sum.price || 0) * (item._sum.quantity || 0),
        };
      }),
    );

    const result = {
      trends: revenueAndOrderTrendList,
      customerGrowth: customerGrowthList,
      topProducts: topProductsWithDetails,
      topCategories: topCategoriesWithDetails,
      topSellers: topSellersWithDetails,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300); // 5 minutes cache
    return result;
  }
}
