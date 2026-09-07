'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats } from '@/lib/api/analytics';
import { getCoupons } from '@/lib/api/sellers';
import { getAdminReviews } from '@/lib/api/admin';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Activity,
  Percent,
  MessageSquare,
  Boxes,
  Loader2,
  RefreshCw,
  Star,
  Plus,
  ArrowRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeCouponsList, setActiveCouponsList] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState('');
  const router = useRouter();

  const getAuthToken = useCallback(() => {
    return Cookies.get('accessToken') || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  }, []);

  const isCouponActiveNow = (coupon: any) => {
    if (!coupon || !coupon.active) return false;
    const now = new Date();
    const isDateValid =
      (!coupon.startDate || new Date(coupon.startDate) <= now) &&
      (!coupon.expiryDate || new Date(coupon.expiryDate) >= now);
    const isUsageValid =
      coupon.usageLimit === null || coupon.usageLimit === undefined || (coupon.usedCount || 0) < coupon.usageLimit;
    return isDateValid && isUsageValid;
  };

  const loadDashboard = useCallback(async (silent = false) => {
    if (authLoading) return;

    if (!user || user.role !== 'ADMIN') {
      router.push('/login?callbackUrl=/admin');
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    const token = getAuthToken();

    try {
      const [statsRes, couponsRes, reviewsRes] = await Promise.allSettled([
        getDashboardStats(token),
        getCoupons(token),
        getAdminReviews(token, 0, 5),
      ]);

      const statsData = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const couponsData = couponsRes.status === 'fulfilled' ? couponsRes.value : [];
      const reviewsData = reviewsRes.status === 'fulfilled' ? reviewsRes.value : null;

      const activeList = Array.isArray(couponsData) ? couponsData.filter(isCouponActiveNow) : [];

      if (statsData) {
        if (Array.isArray(couponsData)) {
          statsData.totalCoupons = couponsData.length;
          statsData.activeCoupons = activeList.length;
          statsData.couponsUsedCount = couponsData.reduce((acc: number, c: any) => acc + (c.usedCount || 0), 0);
        }
        if (reviewsRes.status === 'fulfilled' && reviewsData && typeof reviewsData.total === 'number') {
          statsData.totalReviews = reviewsData.total;
        }
        setStats(statsData);
      } else if (statsRes.status === 'rejected') {
        throw statsRes.reason;
      }

      setActiveCouponsList(activeList);
      setRecentReviews(reviewsData?.reviews || []);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error('[AdminDashboard] error:', err);
      if (!silent) {
        setError('Failed to load dashboard stats. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading, router, getAuthToken]);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  // Real-time synchronization when tab re-focuses or window visibility changes
  useEffect(() => {
    const handleFocus = () => {
      loadDashboard(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadDashboard]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-8 max-w-md text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Dashboard Unavailable</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => loadDashboard(false)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:opacity-90"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹${Number(stats?.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      desc: `Today: ₹${Number(stats?.revenueToday ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      desc: `Today: ${stats?.ordersToday || 0}`,
      icon: ShoppingCart,
      color: 'text-blue-500',
      href: '/admin/orders',
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      desc: `Sellers: ${stats?.totalSellers || 0} | New (30d): ${stats?.newCustomers || 0}`,
      icon: Users,
      color: 'text-indigo-500',
      href: '/admin/users',
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      desc: `Active: ${stats?.activeProducts || 0} | Out of Stock: ${stats?.outOfStockCount || 0}`,
      icon: Package,
      color: 'text-orange-500',
      href: '/admin/products',
    },
    {
      title: 'Inventory Value',
      value: `₹${Number(stats?.totalInventoryValue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      desc: `Low Stock Items: ${stats?.lowStockCount || 0}`,
      icon: Boxes,
      color: 'text-cyan-600',
      href: '/admin/inventory',
    },
    {
      title: 'Average Order Value',
      value: `₹${Number(stats?.avgOrderValue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      desc: `Total Refunds: ${stats?.totalRefunds || 0} (₹${Number(stats?.totalRefundAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
    {
      title: 'Product Reviews',
      value: stats?.totalReviews ?? 0,
      desc: `Avg Rating: ${stats?.avgRating !== null && stats?.avgRating !== undefined ? Number(stats.avgRating).toFixed(1) : '0.0'} ★ | Reported: ${stats?.reportedReviewsCount ?? 0}`,
      icon: MessageSquare,
      color: 'text-pink-500',
      href: '/admin/reviews',
    },
    {
      title: 'Active Coupons',
      value: stats?.activeCoupons || 0,
      desc: `Total Coupons: ${stats?.totalCoupons || 0} | Used: ${stats?.couponsUsedCount || 0}`,
      icon: Percent,
      color: 'text-yellow-600',
      href: '/admin/coupons',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header with Live Sync Status & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Platform Overview</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live DB Sync
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time business indicators and metrics.
            {lastUpdated && <span className="text-xs ml-2 text-muted-foreground/70">Updated at {lastUpdated}</span>}
          </p>
        </div>

        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          title="Refresh dashboard metrics from database"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          {refreshing ? 'Syncing...' : 'Refresh Data'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const CardContent = (
            <div className="bg-card border rounded-lg p-6 shadow-sm flex flex-col justify-between h-full hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start mb-4 gap-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                <div className={`p-2 bg-muted/50 rounded flex-shrink-0 ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="min-w-0">
                <p
                  className={`font-bold tracking-tight mb-2 min-w-0 break-words tabular-nums ${
                    String(kpi.value).length > 15
                      ? 'text-lg sm:text-xl lg:text-lg xl:text-xl'
                      : String(kpi.value).length > 12
                      ? 'text-xl sm:text-2xl lg:text-xl xl:text-2xl'
                      : 'text-2xl sm:text-3xl'
                  }`}
                >
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground break-words min-w-0">{kpi.desc}</p>
              </div>
            </div>
          );

          if (kpi.href) {
            return (
              <Link key={idx} href={kpi.href} className="block transition-transform active:scale-[0.99]">
                {CardContent}
              </Link>
            );
          }

          return (
            <div key={idx}>
              {CardContent}
            </div>
          );
        })}
      </div>

      {/* Live Data Sections: Active Coupons & Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Active Platform Coupons Panel */}
        <div className="border rounded-lg p-6 bg-card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-bold">Active Platform Coupons</h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 rounded-full border border-yellow-200 dark:border-yellow-800">
                  {activeCouponsList.length} Active
                </span>
              </div>
              <Link
                href="/admin/coupons"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {activeCouponsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No active coupons right now.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Create coupons to boost store conversions.</p>
                <Link
                  href="/admin/coupons"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Coupon
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCouponsList.slice(0, 4).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm tracking-wide bg-background px-2 py-0.5 rounded border">
                          {c.code}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `₹${Number(c.value).toFixed(2)} OFF`}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {c.minimumOrder > 0 && `Min order ₹${Number(c.minimumOrder).toFixed(2)} • `}
                        {c.expiryDate ? `Expires ${new Date(c.expiryDate).toLocaleDateString()}` : 'No expiry'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground font-medium">
                        Used {c.usedCount || 0}
                        {c.usageLimit ? ` / ${c.usageLimit}` : ' times'}
                      </span>
                    </div>
                  </div>
                ))}
                {activeCouponsList.length > 4 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    + {activeCouponsList.length - 4} more active coupons
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
            <span>Total platform coupons: {stats?.totalCoupons || 0}</span>
            <Link href="/admin/coupons" className="text-primary hover:underline font-medium">
              View all coupons →
            </Link>
          </div>
        </div>

        {/* Recent Customer Reviews Panel */}
        <div className="border rounded-lg p-6 bg-card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-500" />
                <h3 className="text-lg font-bold">Recent Customer Reviews</h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 rounded-full border border-pink-200 dark:border-pink-800">
                  {stats?.totalReviews || 0} Total
                </span>
              </div>
              <Link
                href="/admin/reviews"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                All Reviews <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No reviews found in database.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Product reviews from customers will show here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReviews.slice(0, 4).map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < (r.rating || 0) ? 'fill-current text-amber-400' : 'text-zinc-300 dark:text-zinc-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold">{r.rating}.0</span>
                        {r.status && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                              r.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : r.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                            }`}
                          >
                            {r.status}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-foreground truncate">
                      {r.product?.title || 'Product'}
                    </p>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80">
                      <span>By {r.user?.name || r.user?.email || 'Anonymous'}</span>
                      {r.verifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="w-3 h-3" /> Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
            <span>Average rating: {Number(stats?.avgRating ?? 0).toFixed(1)} ★</span>
            <Link href="/admin/reviews" className="text-primary hover:underline font-medium">
              Moderate reviews →
            </Link>
          </div>
        </div>
      </div>

      {/* Order Status Distribution & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Status Distribution Card */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-bold mb-4">Order Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(stats?.orderDistribution || {}).map(([status, count]: any) => (
              <div key={status} className="flex justify-between items-center text-sm">
                <span className="font-mono text-xs uppercase tracking-wider">{status}</span>
                <span className="font-bold px-2 py-0.5 bg-muted rounded">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.orderDistribution || {}).length === 0 && (
              <p className="text-sm text-muted-foreground">No orders recorded.</p>
            )}
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="border rounded-lg p-6 bg-card flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Management Actions</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link href="/admin/users" className="p-3 border rounded hover:bg-muted text-center font-medium block">
                Manage Users
              </Link>
              <Link href="/admin/sellers" className="p-3 border rounded hover:bg-muted text-center font-medium block">
                Manage Sellers
              </Link>
              <Link href="/admin/products" className="p-3 border rounded hover:bg-muted text-center font-medium block">
                Manage Products
              </Link>
              <Link href="/admin/categories" className="p-3 border rounded hover:bg-muted text-center font-medium block">
                Categories & Brands
              </Link>
              <Link href="/admin/reviews" className="p-3 border rounded hover:bg-muted text-center font-medium block">
                Product Reviews
              </Link>
              <Link href="/admin/coupons" className="p-3 border rounded hover:bg-muted text-center font-medium block">
                Platform Coupons
              </Link>
            </div>
          </div>
          <div className="pt-6 border-t flex justify-between text-xs text-muted-foreground">
            <span>System: Online</span>
            <span>Version: 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
