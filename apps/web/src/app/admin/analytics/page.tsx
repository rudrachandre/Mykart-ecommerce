'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getAnalyticsTrends } from '@/lib/api/analytics';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, ShoppingBag, FolderOpen, Store, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminAnalyticsPage() {
  const [trends, setTrends] = useState<any>(null);
  const [range, setRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadTrends() {
      setLoading(true);
      const token = Cookies.get('accessToken') || '';
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const data = await getAnalyticsTrends(token, range);
        setTrends(data);
      } catch (err: any) {
        setError('Failed to load platform analytics');
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, [router, range]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-red-500 bg-red-100 p-6 rounded border border-red-200 text-center max-w-sm">
          <p className="font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Find max value in trends for relative height calculation
  const maxRevenue = Math.max(...(trends?.trends || []).map((t: any) => t.revenue), 1);
  const maxOrders = Math.max(...(trends?.trends || []).map((t: any) => t.orders), 1);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive database-backed sales and trends dashboard.</p>
        </div>
        <div className="flex gap-2">
          {['today', '7days', '30days', '90days'].map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
              className="capitalize"
            >
              {r === 'today' ? 'Today' : r.replace('days', ' Days')}
            </Button>
          ))}
        </div>
      </div>

      {/* Charts / Trends list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Revenue Trend Visualizer */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" /> Revenue Trend
          </h3>
          <div className="flex items-end gap-1 h-64 border-b pb-2">
            {(trends?.trends || []).map((item: any, idx: number) => {
              const heightPercent = (item.revenue / maxRevenue) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-green-500/20 hover:bg-green-500 rounded-t transition-colors relative group h-full flex flex-col justify-end"
                >
                  <div
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    className="bg-green-600 rounded-t w-full"
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-[10px] p-2 rounded shadow border whitespace-nowrap z-20">
                    <p className="font-bold">{item.date}</p>
                    <p>₹{Number(item.revenue).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>{trends?.trends?.[0]?.date}</span>
            <span>{trends?.trends?.[trends.trends.length - 1]?.date}</span>
          </div>
        </div>

        {/* Order Trend Visualizer */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" /> Orders Count Trend
          </h3>
          <div className="flex items-end gap-1 h-64 border-b pb-2">
            {(trends?.trends || []).map((item: any, idx: number) => {
              const heightPercent = (item.orders / maxOrders) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500 rounded-t transition-colors relative group h-full flex flex-col justify-end"
                >
                  <div
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    className="bg-blue-600 rounded-t w-full"
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-[10px] p-2 rounded shadow border whitespace-nowrap z-20">
                    <p className="font-bold">{item.date}</p>
                    <p>{item.orders} Orders</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>{trends?.trends?.[0]?.date}</span>
            <span>{trends?.trends?.[trends.trends.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Top Products */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-500" /> Top Selling Products
          </h3>
          <div className="divide-y space-y-3">
            {(trends?.topProducts || []).map((prod: any, idx: number) => (
              <div key={idx} className="pt-3 first:pt-0 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium line-clamp-1">{prod.name}</p>
                  <p className="text-xs text-muted-foreground">{prod.quantity} items sold</p>
                </div>
                <span className="font-bold text-xs bg-muted p-1 rounded">₹{prod.revenue.toFixed(2)}</span>
              </div>
            ))}
            {(!trends?.topProducts || trends.topProducts.length === 0) && (
              <p className="text-xs text-muted-foreground">No records.</p>
            )}
          </div>
        </div>

        {/* Top Categories */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-500" /> Top Categories
          </h3>
          <div className="divide-y space-y-3">
            {(trends?.topCategories || []).map((cat: any, idx: number) => (
              <div key={idx} className="pt-3 first:pt-0 flex justify-between items-center text-sm">
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded">{cat.count} products</span>
              </div>
            ))}
            {(!trends?.topCategories || trends.topCategories.length === 0) && (
              <p className="text-xs text-muted-foreground">No records.</p>
            )}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-500" /> Best Performing Sellers
          </h3>
          <div className="divide-y space-y-3">
            {(trends?.topSellers || []).map((seller: any, idx: number) => (
              <div key={idx} className="pt-3 first:pt-0 flex justify-between items-center text-sm">
                <span className="font-medium">{seller.storeName}</span>
                <span className="font-bold text-xs bg-muted p-1 rounded">₹{seller.revenue.toFixed(2)}</span>
              </div>
            ))}
            {(!trends?.topSellers || trends.topSellers.length === 0) && (
              <p className="text-xs text-muted-foreground">No records.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
