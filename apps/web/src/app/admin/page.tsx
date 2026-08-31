'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getDashboardStats } from '@/lib/api/analytics';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  Package,
  TrendingUp,
  Activity,
  Percent,
  MessageSquare,
  FileText,
  Boxes,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const data = await getDashboardStats(token);
        setStats(data);
      } catch (err: any) {
        setError('Failed to load dashboard stats. Make sure you are an admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-8 max-w-md text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹${Number(stats?.totalRevenue ?? 0).toFixed(2)}`,
      desc: `Today: ₹${Number(stats?.revenueToday ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      desc: `Today: ${stats?.ordersToday || 0}`,
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      desc: `Sellers: ${stats?.totalSellers || 0} | New (30d): ${stats?.newCustomers || 0}`,
      icon: Users,
      color: 'text-indigo-500',
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      desc: `Active: ${stats?.activeProducts || 0} | Out of Stock: ${stats?.outOfStockCount || 0}`,
      icon: Package,
      color: 'text-orange-500',
    },
    {
      title: 'Inventory Value',
      value: `₹${Number(stats?.totalInventoryValue ?? 0).toFixed(2)}`,
      desc: `Low Stock Items: ${stats?.lowStockCount || 0}`,
      icon: Boxes,
      color: 'text-cyan-600',
    },
    {
      title: 'Average Order Value',
      value: `₹${Number(stats?.avgOrderValue ?? 0).toFixed(2)}`,
      desc: `Total Refunds: ${stats?.totalRefunds || 0} (₹${Number(stats?.totalRefundAmount ?? 0).toFixed(2)})`,
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
    {
      title: 'Product Reviews',
      value: stats?.totalReviews || 0,
      desc: `Avg Rating: ${Number(stats?.avgRating ?? 0).toFixed(1)} ★ | Reported: ${stats?.reportedReviewsCount || 0}`,
      icon: MessageSquare,
      color: 'text-pink-500',
    },
    {
      title: 'Active Coupons',
      value: stats?.activeCoupons || 0,
      desc: `Total Coupons: ${stats?.totalCoupons || 0} | Used: ${stats?.couponsUsedCount || 0}`,
      icon: Percent,
      color: 'text-yellow-600',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-2">Real-time business indicators and metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-card border rounded-lg p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                <div className={`p-2 bg-muted/50 rounded ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-2">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

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
