'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAnalyticsTrends } from '@/lib/api/analytics';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, ShoppingBag, FolderOpen, Store, Loader2, Calendar } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [trends, setTrends] = useState<any>(null);
  const [range, setRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadTrends() {
      if (authLoading) return;

      if (!user || user.role !== 'ADMIN') {
        router.push('/login?callbackUrl=/admin/analytics');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getAnalyticsTrends(undefined, range);
        setTrends(data);
      } catch (err: any) {
        console.error('[AdminAnalytics] error:', err);
        setError('Failed to load platform analytics trends.');
      } finally {
        setLoading(false);
      }
    }

    loadTrends();
  }, [user, authLoading, range, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading analytics trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-8 max-w-md text-center">
          <p className="font-bold mb-2">Error Loading Analytics</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const trendList: any[] = trends?.trends || [];
  const totalRevenue = trendList.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const totalOrders = trendList.reduce((sum, t) => sum + (t.orders || 0), 0);

  const maxRevenue = Math.max(...trendList.map((t) => t.revenue || 0), 1);
  const maxOrders = Math.max(...trendList.map((t) => t.orders || 0), 1);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground mt-2">Database-backed revenue and order trend intelligence.</p>
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
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" /> Revenue Trend
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-500/10 text-green-600 rounded-full">
              Total: ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {totalRevenue === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20 text-center p-6">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm text-foreground">No sales data available for this period</p>
              <p className="text-xs text-muted-foreground mt-1">Select a different date range or place test orders.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1 h-64 border-b border-l pb-2 pl-2 pt-4 relative">
                {trendList.map((item: any, idx: number) => {
                  const pct = (item.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/30 rounded-t transition-colors relative group h-full flex flex-col justify-end"
                    >
                      <div
                        style={{ height: `${item.revenue > 0 ? Math.max(pct, 4) : 0}%` }}
                        className={`w-full rounded-t transition-all ${item.revenue > 0 ? 'bg-green-600' : 'bg-transparent'}`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-md border whitespace-nowrap z-30">
                        <p className="font-bold">{item.date}</p>
                        <p className="text-green-600 font-semibold">₹{Number(item.revenue).toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium mt-3">
                <span>{trendList[0]?.date}</span>
                <span>{trendList[Math.floor(trendList.length / 2)]?.date}</span>
                <span>{trendList[trendList.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Order Trend Visualizer */}
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Orders Count Trend
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-full">
              Total: {totalOrders} {totalOrders === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          {totalOrders === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20 text-center p-6">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm text-foreground">No orders recorded for this period</p>
              <p className="text-xs text-muted-foreground mt-1">Select a different date range to view order activity.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1 h-64 border-b border-l pb-2 pl-2 pt-4 relative">
                {trendList.map((item: any, idx: number) => {
                  const pct = (item.orders / maxOrders) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500/30 rounded-t transition-colors relative group h-full flex flex-col justify-end"
                    >
                      <div
                        style={{ height: `${item.orders > 0 ? Math.max(pct, 4) : 0}%` }}
                        className={`w-full rounded-t transition-all ${item.orders > 0 ? 'bg-blue-600' : 'bg-transparent'}`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-md border whitespace-nowrap z-30">
                        <p className="font-bold">{item.date}</p>
                        <p className="text-blue-600 font-semibold">{item.orders} Orders</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium mt-3">
                <span>{trendList[0]?.date}</span>
                <span>{trendList[Math.floor(trendList.length / 2)]?.date}</span>
                <span>{trendList[trendList.length - 1]?.date}</span>
              </div>
            </div>
          )}
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
                <span className="font-bold text-xs bg-muted p-1 rounded">
                  ₹{Number(prod.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            {(!trends?.topProducts || trends.topProducts.length === 0) && (
              <p className="text-xs text-muted-foreground">No records available.</p>
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
              <p className="text-xs text-muted-foreground">No records available.</p>
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
                <span className="font-bold text-xs bg-muted p-1 rounded">
                  ₹{Number(seller.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            {(!trends?.topSellers || trends.topSellers.length === 0) && (
              <p className="text-xs text-muted-foreground">No records available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
