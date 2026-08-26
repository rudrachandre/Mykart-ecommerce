'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getDashboardStats } from '@/lib/api/analytics';
import { DollarSign, Activity, TrendingUp, Users, Package, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminAnalyticsPage() {
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
        setError('Failed to load analytics.');
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
          <p className="text-muted-foreground font-medium animate-pulse">Loading analytics...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-8 max-w-md text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Platform Analytics</h1>
        <p className="text-muted-foreground mt-2">Comprehensive view of platform performance.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-3xl font-bold">₹{Number(stats?.totalRevenue ?? 0).toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Orders</p>
              <h3 className="text-3xl font-bold">{stats?.totalOrders || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/10 rounded-full text-green-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Users</p>
              <h3 className="text-3xl font-bold">{stats?.totalUsers || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-full text-purple-500">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Products</p>
              <h3 className="text-3xl font-bold">{stats?.totalProducts || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-8 shadow-sm text-center py-20">
        <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">More Analytics Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We are currently gathering more detailed data to provide charts, conversion rates, and sales trends.
        </p>
      </div>
    </div>
  );
}
