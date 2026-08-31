import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

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
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }),

      // ORDERS
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: oneDayAgo } } }),
      this.prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // REVENUE
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: oneDayAgo }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      }),

      // ORDER STATUS DISTRIBUTION
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // SELLER STATUS DISTRIBUTION
      this.prisma.seller.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // PRODUCTS
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),

      // INVENTORY
      this.prisma.productVariant.findMany({
        include: { inventory: true },
      }),

      // PAYMENTS
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // REFUNDS
      this.prisma.refund.aggregate({
        _count: { id: true },
        _sum: { amount: true },
      }),

      // RETURNS / REPLACEMENTS
      Promise.all([
        this.prisma.return.count(),
        this.prisma.return.count({ where: { status: 'APPROVED' } }),
        this.prisma.return.count({ where: { status: 'REJECTED' } }),
        this.prisma.replacement.count(),
      ]),

      // REVIEWS
      this.prisma.review.aggregate({
        _count: { id: true },
        _avg: { rating: true },
        where: { status: 'APPROVED' },
      }),

      // COUPONS
      this.prisma.coupon.aggregate({
        _count: { id: true },
        _sum: { usedCount: true },
      }),
    ]);

    // Format distributions
    const orderDistribution = orderStatuses.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const sellerDistribution = sellerStatuses.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const paymentDistribution = paymentsData.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Process inventory
    let availableStock = 0;
    let reservedStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValue = 0;

    inventoryData.forEach((v) => {
      const qty = v.inventory?.quantity ?? 0;
      const res = v.inventory?.reserved ?? 0;
      const avail = qty - res;
      availableStock += avail;
      reservedStock += res;
      totalInventoryValue += Number(v.price) * qty;

      if (avail <= 0) outOfStockCount += 1;
      else if (avail <= 10) lowStockCount += 1;
    });

    const totalRevenue = Number(totalRevenueData._sum.total ?? 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Process reported reviews
    const reportedReviewsCount = await this.prisma.review.count({ where: { reported: true } });
    const pendingModerationCount = await this.prisma.review.count({ where: { status: 'PENDING' } });

    // Active coupons
    const activeCouponsCount = await this.prisma.coupon.count({ where: { active: true } });

    return {
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
      revenueToday: Number(revenueTodayData._sum.total ?? 0),
      revenueLast7Days: Number(revenueLast7DaysData._sum.total ?? 0),
      revenueLast30Days: Number(revenueLast30DaysData._sum.total ?? 0),
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
      totalRefunds: refundsData._count.id,
      totalRefundAmount: Number(refundsData._sum.amount ?? 0),
      // Returns
      totalReturns: returnsData[0],
      approvedReturns: returnsData[1],
      rejectedReturns: returnsData[2],
      totalReplacements: returnsData[3],
      // Reviews
      totalReviews: reviewsData._count.id,
      avgRating: reviewsData._avg.rating || 0,
      reportedReviewsCount,
      pendingModerationCount,
      // Coupons
      totalCoupons: couponsData._count.id,
      activeCoupons: activeCouponsCount,
      couponsUsedCount: couponsData._sum.usedCount || 0,
    };
  }

  async getAnalyticsTrends(range: string = '30days') {
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
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Customer growth trend
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
        role: 'CUSTOMER',
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Grouping by date in JavaScript to keep it DB-agnostic
    const orderTrend: Record<string, { count: number; revenue: number }> = {};
    const customerTrend: Record<string, number> = {};

    // Initialize date slots
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      orderTrend[dateString] = { count: 0, revenue: 0 };
      customerTrend[dateString] = 0;
    }

    orders.forEach((o) => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      if (orderTrend[dateStr]) {
        orderTrend[dateStr].count += 1;
        orderTrend[dateStr].revenue += Number(o.total);
      }
    });

    users.forEach((u) => {
      const dateStr = u.createdAt.toISOString().split('T')[0];
      if (customerTrend[dateStr] !== undefined) {
        customerTrend[dateStr] += 1;
      }
    });

    // Convert to sorted arrays
    const revenueAndOrderTrendList = Object.entries(orderTrend)
      .map(([date, data]) => ({
        date,
        orders: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const customerGrowthList = Object.entries(customerTrend)
      .map(([date, count]) => ({
        date,
        newCustomers: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top categories, sellers, products
    const [topProducts, topCategories, topSellers] = await Promise.all([
      // Top products by quantity sold
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

    return {
      trends: revenueAndOrderTrendList,
      customerGrowth: customerGrowthList,
      topProducts: topProductsWithDetails,
      topCategories: topCategoriesWithDetails,
      topSellers: topSellersWithDetails,
    };
  }
}
