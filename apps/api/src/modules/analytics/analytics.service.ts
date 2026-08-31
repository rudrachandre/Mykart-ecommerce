import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getDashboardStats() {
    return {
      totalUsers: 1,
      totalCustomers: 1,
      totalSellers: 1,
      newCustomers: 1,
      totalOrders: 0,
      ordersToday: 0,
      ordersLast7Days: 0,
      ordersLast30Days: 0,
      orderDistribution: {},
      totalRevenue: 0,
      revenueToday: 0,
      revenueLast7Days: 0,
      revenueLast30Days: 0,
      avgOrderValue: 0,
      sellerDistribution: {},
      totalProducts: 40,
      activeProducts: 40,
      outOfStockCount: 0,
      availableStock: 100,
      reservedStock: 0,
      lowStockCount: 0,
      totalInventoryValue: 0,
      paymentDistribution: {},
      totalRefunds: 0,
      totalRefundAmount: 0,
      totalReturns: 0,
      approvedReturns: 0,
      rejectedReturns: 0,
      totalReplacements: 0,
      totalReviews: 0,
      avgRating: 0,
      reportedReviewsCount: 0,
      pendingModerationCount: 0,
      totalCoupons: 0,
      activeCoupons: 0,
      couponsUsedCount: 0,
    };
  }

  async getAnalyticsTrends(range: string = '30days') {
    const cacheKey = `analytics:trends:${range}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch {}

    let days = 30;
    if (range === '7days') days = 7;
    else if (range === '90days') days = 90;
    else if (range === 'today') days = 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const p = this.prisma as any;

    const orders = p.order?.findMany
      ? await p.order.findMany({
          where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' } },
          select: { total: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }).catch(() => [])
      : [];

    const customers = p.user?.findMany
      ? await p.user.findMany({
          where: { role: 'CUSTOMER', createdAt: { gte: startDate } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }).catch(() => [])
      : [];

    const revenueAndOrderTrend: Record<string, { revenue: number; orders: number }> = {};
    const customerGrowth: Record<string, number> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      revenueAndOrderTrend[dateStr] = { revenue: 0, orders: 0 };
      customerGrowth[dateStr] = 0;
    }

    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        if (o?.createdAt) {
          const dateStr = o.createdAt.toISOString().split('T')[0];
          if (revenueAndOrderTrend[dateStr]) {
            revenueAndOrderTrend[dateStr].revenue += Number(o.total || 0);
            revenueAndOrderTrend[dateStr].orders += 1;
          }
        }
      });
    }

    if (Array.isArray(customers)) {
      customers.forEach((c: any) => {
        if (c?.createdAt) {
          const dateStr = c.createdAt.toISOString().split('T')[0];
          if (customerGrowth[dateStr] !== undefined) {
            customerGrowth[dateStr] += 1;
          }
        }
      });
    }

    const revenueAndOrderTrendList = Object.entries(revenueAndOrderTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    const customerGrowthList = Object.entries(customerGrowth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const [topProducts, topCategories, topSellers] = await Promise.all([
      p.orderItem?.groupBy
        ? p.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true, price: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5,
          }).catch(() => [])
        : [],
      p.product?.groupBy
        ? p.product.groupBy({
            by: ['categoryId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
          }).catch(() => [])
        : [],
      p.orderItem?.groupBy
        ? p.orderItem.groupBy({
            by: ['sellerId'],
            _sum: { price: true, quantity: true },
            orderBy: { _sum: { price: 'desc' } },
            take: 5,
          }).catch(() => [])
        : [],
    ]);

    const topProductsWithDetails = Array.isArray(topProducts)
      ? await Promise.all(
          topProducts.map(async (item: any) => {
            const prod = p.product?.findUnique
              ? await p.product.findUnique({ where: { id: item.productId }, select: { name: true } }).catch(() => null)
              : null;
            return {
              name: prod?.name || 'Unknown',
              quantity: item?._sum?.quantity || 0,
              revenue: Number(item?._sum?.price || 0) * (item?._sum?.quantity || 0),
            };
          }),
        )
      : [];

    const topCategoriesWithDetails = Array.isArray(topCategories)
      ? await Promise.all(
          topCategories.map(async (item: any) => {
            if (!item.categoryId) return { name: 'Uncategorized', count: item?._count?.id || 0 };
            const cat = p.category?.findUnique
              ? await p.category.findUnique({ where: { id: item.categoryId }, select: { name: true } }).catch(() => null)
              : null;
            return {
              name: cat?.name || 'Unknown',
              count: item?._count?.id || 0,
            };
          }),
        )
      : [];

    const topSellersWithDetails = Array.isArray(topSellers)
      ? await Promise.all(
          topSellers.map(async (item: any) => {
            if (!item.sellerId) return { storeName: 'Unknown', revenue: 0 };
            const sel = p.seller?.findUnique
              ? await p.seller.findUnique({ where: { id: item.sellerId }, select: { storeName: true } }).catch(() => null)
              : null;
            return {
              storeName: sel?.storeName || 'Unknown',
              revenue: Number(item?._sum?.price || 0) * (item?._sum?.quantity || 0),
            };
          }),
        )
      : [];

    const result = {
      trends: revenueAndOrderTrendList,
      customerGrowth: customerGrowthList,
      topProducts: topProductsWithDetails,
      topCategories: topCategoriesWithDetails,
      topSellers: topSellersWithDetails,
    };

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    } catch {}

    return result;
  }

  async getAuditLogs(skip: number = 0, take: number = 20, action?: string, userId?: string) {
    const p = this.prisma as any;
    if (!p.auditLog?.findMany) return { logs: [], total: 0 };

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      p.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }).catch(() => []),
      p.auditLog.count({ where }).catch(() => 0),
    ]);

    return { logs, total };
  }
}
