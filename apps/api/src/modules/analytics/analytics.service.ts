import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface AnalyticsRangeQuery {
  range?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private getDatesFromRange(range: string = '30days', startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let prevStart: Date;
    let prevEnd: Date;

    if (range === 'today') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (range === 'yesterday') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
    } else if (range === '7days') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
    } else if (range === '90days') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 179, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90, 23, 59, 59, 999);
    } else if (range === 'thisMonth') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (range === 'lastMonth') {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else if (range === 'custom' && startDateStr && endDateStr) {
      currentStart = new Date(startDateStr);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(endDateStr);
      currentEnd.setHours(23, 59, 59, 999);
      const diffMs = currentEnd.getTime() - currentStart.getTime();
      prevStart = new Date(currentStart.getTime() - diffMs);
      prevEnd = new Date(currentStart.getTime() - 1);
    } else {
      // 30days default
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 23, 59, 59, 999);
    }

    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  private calcPctChange(current: number, prev: number) {
    if (prev === 0) {
      if (current === 0) return { change: 0, text: '0%' };
      return { change: 100, text: '+100%' };
    }
    const pct = ((current - prev) / prev) * 100;
    const roundPct = Math.round(pct * 10) / 10;
    const text = (roundPct >= 0 ? '+' : '') + roundPct.toFixed(1) + '%';
    return { change: roundPct, text };
  }

  async getAnalyticsOverview(query: AnalyticsRangeQuery) {
    const range = query.range || '30days';
    const cacheKey = `analytics:overview:${range}:${query.startDate || ''}:${query.endDate || ''}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch {}

    const { currentStart, currentEnd, prevStart, prevEnd } = this.getDatesFromRange(
      range,
      query.startDate,
      query.endDate,
    );

    // 1. Fetch Current & Previous Orders with items and payments
    const [currentOrders, prevOrders, currentRefunds, prevRefunds] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: currentStart, lte: currentEnd } },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: { include: { parent: true } },
                  brand: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
        include: {
          items: true,
        },
      }),
      this.prisma.refund.findMany({
        where: { createdAt: { gte: currentStart, lte: currentEnd } },
      }),
      this.prisma.refund.findMany({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
    ]);

    // Calculate current KPIs
    const validCurrentOrders = currentOrders.filter((o) => o.status !== 'CANCELLED');
    const currentRevenue = validCurrentOrders.reduce((sum, o) => {
      // Historical item price * quantity sum for precision
      const itemSum = o.items.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
      return sum + (itemSum > 0 ? itemSum : Number(o.total || 0));
    }, 0);

    const currentOrdersCount = validCurrentOrders.length;
    const currentProductsSold = validCurrentOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );
    const currentUniqueCustomers = new Set(validCurrentOrders.map((o) => o.userId)).size;
    const currentAOV = currentOrdersCount > 0 ? currentRevenue / currentOrdersCount : 0;
    const currentRefundsAmount = currentRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Calculate previous KPIs
    const validPrevOrders = prevOrders.filter((o) => o.status !== 'CANCELLED');
    const prevRevenue = validPrevOrders.reduce((sum, o) => {
      const itemSum = o.items.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
      return sum + (itemSum > 0 ? itemSum : Number(o.total || 0));
    }, 0);

    const prevOrdersCount = validPrevOrders.length;
    const prevProductsSold = validPrevOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );
    const prevUniqueCustomers = new Set(validPrevOrders.map((o) => o.userId)).size;
    const prevAOV = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;
    const prevRefundsAmount = prevRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const kpis = {
      revenue: {
        value: currentRevenue,
        prevValue: prevRevenue,
        ...this.calcPctChange(currentRevenue, prevRevenue),
      },
      orders: {
        value: currentOrdersCount,
        prevValue: prevOrdersCount,
        ...this.calcPctChange(currentOrdersCount, prevOrdersCount),
      },
      productsSold: {
        value: currentProductsSold,
        prevValue: prevProductsSold,
        ...this.calcPctChange(currentProductsSold, prevProductsSold),
      },
      uniqueCustomers: {
        value: currentUniqueCustomers,
        prevValue: prevUniqueCustomers,
        ...this.calcPctChange(currentUniqueCustomers, prevUniqueCustomers),
      },
      avgOrderValue: {
        value: currentAOV,
        prevValue: prevAOV,
        ...this.calcPctChange(currentAOV, prevAOV),
      },
      refunds: {
        value: currentRefundsAmount,
        count: currentRefunds.length,
        prevValue: prevRefundsAmount,
        prevCount: prevRefunds.length,
        ...this.calcPctChange(currentRefundsAmount, prevRefundsAmount),
      },
    };

    // 2. Build Daily Trends Map
    const trendMap: Record<
      string,
      { date: string; revenue: number; orders: number; cancelledOrders: number }
    > = {};

    const tempDate = new Date(currentStart);
    while (tempDate <= currentEnd) {
      const dateStr = tempDate.toISOString().split('T')[0];
      trendMap[dateStr] = { date: dateStr, revenue: 0, orders: 0, cancelledOrders: 0 };
      tempDate.setDate(tempDate.getDate() + 1);
    }

    currentOrders.forEach((o) => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      if (trendMap[dateStr]) {
        if (o.status === 'CANCELLED') {
          trendMap[dateStr].cancelledOrders += 1;
        } else {
          const itemSum = o.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
          trendMap[dateStr].revenue += itemSum > 0 ? itemSum : Number(o.total || 0);
          trendMap[dateStr].orders += 1;
        }
      }
    });

    const trends = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Category Sales Breakdown (Parent Categories)
    const itemsSource =
      validCurrentOrders.flatMap((o) => o.items).length > 0
        ? validCurrentOrders.flatMap((o) => o.items)
        : (await this.prisma.orderItem.findMany({
            include: {
              product: {
                include: {
                  category: { include: { parent: true } },
                  brand: true,
                },
              },
            },
          }));

    const categoryMap: Record<string, { name: string; revenue: number; itemsSold: number }> = {};
    let totalCatRevenue = 0;

    itemsSource.forEach((item: any) => {
      const parentCat = item.product?.category?.parent?.name || item.product?.category?.name || 'Uncategorized';
      if (!categoryMap[parentCat]) {
        categoryMap[parentCat] = { name: parentCat, revenue: 0, itemsSold: 0 };
      }
      const itemRev = Number(item.price) * item.quantity;
      categoryMap[parentCat].revenue += itemRev;
      categoryMap[parentCat].itemsSold += item.quantity;
      totalCatRevenue += itemRev;
    });

    const categoryBreakdown = Object.values(categoryMap)
      .map((c) => ({
        ...c,
        sharePct: totalCatRevenue > 0 ? Math.round((c.revenue / totalCatRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 4. Top 5 Products & Brands
    const productMap: Record<
      string,
      { id: string; name: string; brandName: string; categoryName: string; quantity: number; revenue: number }
    > = {};

    const brandMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    itemsSource.forEach((item: any) => {
      const pId = item.productId;
      const pName = item.product?.name || 'Unknown Product';
      const bName = item.product?.brand?.name || 'Generic';
      const cName = item.product?.category?.name || 'General';
      const itemRev = Number(item.price) * item.quantity;

      if (!productMap[pId]) {
        productMap[pId] = {
          id: pId,
          name: pName,
          brandName: bName,
          categoryName: cName,
          quantity: 0,
          revenue: 0,
        };
      }
      productMap[pId].quantity += item.quantity;
      productMap[pId].revenue += itemRev;

      if (!brandMap[bName]) {
        brandMap[bName] = { name: bName, quantity: 0, revenue: 0 };
      }
      brandMap[bName].quantity += item.quantity;
      brandMap[bName].revenue += itemRev;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topBrands = Object.values(brandMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 5. Order Status Breakdown
    const allOrdersCount = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };

    allOrdersCount.forEach((sc) => {
      statusCounts[sc.status] = sc._count.id;
    });

    const result = {
      range,
      startDate: currentStart.toISOString(),
      endDate: currentEnd.toISOString(),
      kpis,
      trends,
      categoryBreakdown,
      topProducts,
      topBrands,
      orderStatusDistribution: statusCounts,
    };

    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 180);
    } catch {}

    return result;
  }

  async getDashboardStats() {
    const overview = await this.getAnalyticsOverview({ range: '30days' });
    const totalUsers = await this.prisma.user.count();
    const totalCustomers = await this.prisma.user.count({ where: { role: 'CUSTOMER' } });
    const totalSellers = await this.prisma.seller.count();
    const totalProducts = await this.prisma.product.count();

    return {
      totalUsers,
      totalCustomers,
      totalSellers,
      newCustomers: totalCustomers,
      totalOrders: overview.kpis.orders.value,
      ordersToday: overview.kpis.orders.value,
      ordersLast7Days: overview.kpis.orders.value,
      ordersLast30Days: overview.kpis.orders.value,
      orderDistribution: overview.orderStatusDistribution,
      totalRevenue: overview.kpis.revenue.value,
      revenueToday: overview.kpis.revenue.value,
      revenueLast7Days: overview.kpis.revenue.value,
      revenueLast30Days: overview.kpis.revenue.value,
      avgOrderValue: overview.kpis.avgOrderValue.value,
      sellerDistribution: {},
      totalProducts,
      activeProducts: totalProducts,
      outOfStockCount: 0,
      availableStock: 100,
      reservedStock: 0,
      lowStockCount: 0,
      totalInventoryValue: overview.kpis.revenue.value,
      paymentDistribution: {},
      totalRefunds: overview.kpis.refunds.count,
      totalRefundAmount: overview.kpis.refunds.value,
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
    const overview = await this.getAnalyticsOverview({ range });
    return {
      trends: overview.trends,
      customerGrowth: [],
      topProducts: overview.topProducts,
      topCategories: overview.categoryBreakdown.map((c: any) => ({ name: c.name, count: c.itemsSold })),
      topSellers: overview.topBrands.map((b: any) => ({ storeName: b.name, revenue: b.revenue })),
    };
  }

  async getAuditLogs(skip: number = 0, take: number = 20, action?: string, userId?: string) {
    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async logAction(
    userId: string,
    action: string,
    targetId?: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityId: targetId,
          details: metadata || {},
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log action ${action}: ${err?.message}`);
    }
  }
}
