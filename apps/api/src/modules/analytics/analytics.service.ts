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
    try {
      const cacheKey = 'analytics:dashboard-stats';
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached && typeof cached === 'string') {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {}

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const p = this.prisma as any;

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
        p.user?.count ? p.user.count().catch(() => 0) : 0,
        p.user?.count ? p.user.count({ where: { role: 'CUSTOMER' } }).catch(() => 0) : 0,
        p.user?.count ? p.user.count({ where: { role: 'SELLER' } }).catch(() => 0) : 0,
        p.user?.count ? p.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0) : 0,

        // ORDERS
        p.order?.count ? p.order.count().catch(() => 0) : 0,
        p.order?.count ? p.order.count({ where: { createdAt: { gte: oneDayAgo } } }).catch(() => 0) : 0,
        p.order?.count ? p.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0) : 0,
        p.order?.count ? p.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0) : 0,

        // REVENUE
        p.order?.aggregate ? p.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }).catch(() => ({ _sum: { total: null } })) : { _sum: { total: null } },
        p.order?.aggregate ? p.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: oneDayAgo }, status: { not: 'CANCELLED' } } }).catch(() => ({ _sum: { total: null } })) : { _sum: { total: null } },
        p.order?.aggregate ? p.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'CANCELLED' } } }).catch(() => ({ _sum: { total: null } })) : { _sum: { total: null } },
        p.order?.aggregate ? p.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } } }).catch(() => ({ _sum: { total: null } })) : { _sum: { total: null } },

        // STATUS DISTRIBUTION
        p.order?.groupBy ? p.order.groupBy({ by: ['status'], _count: { id: true } }).catch(() => []) : [],
        p.seller?.groupBy ? p.seller.groupBy({ by: ['status'], _count: { id: true } }).catch(() => []) : [],

        // PRODUCTS
        p.product?.count ? p.product.count().catch(() => 0) : 0,
        p.product?.count ? p.product.count({ where: { status: 'ACTIVE' } }).catch(() => 0) : 0,

        // INVENTORY
        p.inventory?.findMany ? p.inventory.findMany({ select: { quantity: true, reserved: true } }).catch(() => []) : [],

        // PAYMENTS
        p.payment?.groupBy ? p.payment.groupBy({ by: ['status'], _count: { id: true } }).catch(() => []) : [],

        // REFUNDS
        p.refund?.aggregate ? p.refund.aggregate({ _count: { id: true }, _sum: { amount: true } }).catch(() => ({ _count: { id: 0 }, _sum: { amount: null } })) : { _count: { id: 0 }, _sum: { amount: null } },

        // RETURNS & REPLACEMENTS
        Promise.all([
          p.return?.count ? p.return.count().catch(() => 0) : 0,
          p.return?.count ? p.return.count({ where: { status: 'APPROVED' } }).catch(() => 0) : 0,
          p.return?.count ? p.return.count({ where: { status: 'REJECTED' } }).catch(() => 0) : 0,
          p.replacement?.count ? p.replacement.count().catch(() => 0) : 0,
        ]).catch(() => [0, 0, 0, 0]),

        // REVIEWS
        p.review?.aggregate ? p.review.aggregate({ _count: { id: true }, _avg: { rating: true } }).catch(() => ({ _count: { id: 0 }, _avg: { rating: null } })) : { _count: { id: 0 }, _avg: { rating: null } },

        // COUPONS
        p.coupon?.aggregate ? p.coupon.aggregate({ _count: { id: true }, _sum: { usedCount: true } }).catch(() => ({ _count: { id: 0 }, _sum: { usedCount: null } })) : { _count: { id: 0 }, _sum: { usedCount: null } },
      ]);

      // Map order status distribution
      const orderDistribution: Record<string, number> = {};
      if (Array.isArray(orderStatuses)) {
        orderStatuses.forEach((g) => {
          if (g && g.status && g._count) orderDistribution[g.status] = g._count.id || 0;
        });
      }

      // Map seller status distribution
      const sellerDistribution: Record<string, number> = {};
      if (Array.isArray(sellerStatuses)) {
        sellerStatuses.forEach((g) => {
          if (g && g.status && g._count) sellerDistribution[g.status] = g._count.id || 0;
        });
      }

      // Map payment status distribution
      const paymentDistribution: Record<string, number> = {};
      if (Array.isArray(paymentsData)) {
        paymentsData.forEach((g) => {
          if (g && g.status && g._count) paymentDistribution[g.status] = g._count.id || 0;
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
          if (item) {
            const qty = item.quantity || 0;
            const res = item.reserved || 0;
            const avail = qty - res;
            availableStock += avail;
            reservedStock += res;
            if (avail <= 0) outOfStockCount += 1;
            else if (avail <= 10) lowStockCount += 1;
          }
        });
      }

      const totalRevenue = Number(totalRevenueData?._sum?.total ?? 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Process reported reviews
      const reportedReviewsCount = p.review?.count ? await p.review.count({ where: { reported: true } }).catch(() => 0) : 0;
      const pendingModerationCount = p.review?.count ? await p.review.count({ where: { status: 'PENDING' } }).catch(() => 0) : 0;

      // Active coupons
      const activeCouponsCount = p.coupon?.count ? await p.coupon.count({ where: { active: true } }).catch(() => 0) : 0;

      const stats = {
        totalUsers: Number(totalUsers || 0),
        totalCustomers: Number(totalCustomers || 0),
        totalSellers: Number(totalSellers || 0),
        newCustomers: Number(newCustomers || 0),
        totalOrders: Number(totalOrders || 0),
        ordersToday: Number(ordersToday || 0),
        ordersLast7Days: Number(ordersLast7Days || 0),
        ordersLast30Days: Number(ordersLast30Days || 0),
        orderDistribution,
        totalRevenue: Number(totalRevenue || 0),
        revenueToday: Number(revenueTodayData?._sum?.total ?? 0),
        revenueLast7Days: Number(revenueLast7DaysData?._sum?.total ?? 0),
        revenueLast30Days: Number(revenueLast30DaysData?._sum?.total ?? 0),
        avgOrderValue: Number(avgOrderValue || 0),
        sellerDistribution,
        totalProducts: Number(totalProducts || 0),
        activeProducts: Number(activeProducts || 0),
        outOfStockCount: Number(outOfStockCount || 0),
        availableStock: Number(availableStock || 0),
        reservedStock: Number(reservedStock || 0),
        lowStockCount: Number(lowStockCount || 0),
        totalInventoryValue: Number(totalInventoryValue || 0),
        paymentDistribution,
        totalRefunds: Number(refundsData?._count?.id ?? 0),
        totalRefundAmount: Number(refundsData?._sum?.amount ?? 0),
        totalReturns: Number(Array.isArray(returnsData) ? returnsData[0] || 0 : 0),
        approvedReturns: Number(Array.isArray(returnsData) ? returnsData[1] || 0 : 0),
        rejectedReturns: Number(Array.isArray(returnsData) ? returnsData[2] || 0 : 0),
        totalReplacements: Number(Array.isArray(returnsData) ? returnsData[3] || 0 : 0),
        totalReviews: Number(reviewsData?._count?.id ?? 0),
        avgRating: Number(reviewsData?._avg?.rating || 0),
        reportedReviewsCount: Number(reportedReviewsCount || 0),
        pendingModerationCount: Number(pendingModerationCount || 0),
        totalCoupons: Number(couponsData?._count?.id ?? 0),
        activeCoupons: Number(activeCouponsCount || 0),
        couponsUsedCount: Number(couponsData?._sum?.usedCount || 0),
      };

      const serialized = JSON.parse(
        JSON.stringify(stats, (_, v) => (typeof v === 'bigint' ? Number(v) : v))
      );

      try {
        await this.redisService.set(cacheKey, JSON.stringify(serialized), 300);
      } catch {}

      return serialized;
    } catch (err: any) {
      this.logger.error('[AnalyticsService] getDashboardStats error:', err);
      return {
        totalUsers: 0,
        totalCustomers: 0,
        totalSellers: 0,
        newCustomers: 0,
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
        totalProducts: 0,
        activeProducts: 0,
        outOfStockCount: 0,
        availableStock: 0,
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
