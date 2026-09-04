'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAnalyticsOverview } from '@/lib/api/analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  ShoppingBag,
  FolderOpen,
  Store,
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  PackageCheck,
} from 'lucide-react';

interface KPIItem {
  value: number;
  prevValue?: number;
  change?: number;
  text?: string;
  count?: number;
}

interface OverviewData {
  range: string;
  startDate: string;
  endDate: string;
  kpis: {
    netRevenue: KPIItem;
    grossMerchandiseSales: KPIItem;
    totalChargedRevenue: KPIItem;
    orders: KPIItem;
    unitsSold: KPIItem;
    uniqueProductsSold: KPIItem;
    uniqueCustomers: KPIItem;
    avgOrderValue: KPIItem;
    discounts: KPIItem;
    tax: KPIItem;
    shipping: KPIItem;
    refunds: KPIItem;
  };
  trends: Array<{ date: string; revenue: number; merchandiseSales: number; orders: number; cancelledOrders: number }>;
  categoryBreakdown: Array<{ name: string; revenue: number; itemsSold: number; sharePct: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    brandName: string;
    categoryName: string;
    quantity: number;
    revenue: number;
  }>;
  topBrands: Array<{ name: string; quantity: number; revenue: number }>;
  orderStatusDistribution: Record<string, number>;
}

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [range, setRange] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadData = async () => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/login?callbackUrl=/admin/analytics');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await getAnalyticsOverview({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      });
      setData(result);
    } catch (err: any) {
      console.error('[AdminAnalyticsPage] load error:', err);
      setError('Failed to load database commerce analytics. ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, authLoading, range, router]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      loadData();
    }
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <TrendingUp className="w-6 h-6 text-primary absolute" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Querying Database Intelligence</h3>
            <p className="text-xs text-muted-foreground mt-1">Aggregating sales, orders, and item snapshot totals...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Analytics Data Error</h2>
          <p className="text-sm mb-6 text-muted-foreground">{error}</p>
          <Button onClick={() => loadData()} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry Query
          </Button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const trends = data?.trends || [];
  const categories = data?.categoryBreakdown || [];
  const topProducts = data?.topProducts || [];
  const topBrands = data?.topBrands || [];
  const statuses = data?.orderStatusDistribution || {};

  const maxRevenue = Math.max(...trends.map((t) => t.revenue), 1);

  const formatCurrency = (val: number) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderBadge = (change?: number, text?: string) => {
    if (change === undefined || text === undefined) return null;
    const isPos = change > 0;
    const isZero = change === 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isZero
            ? 'bg-muted text-muted-foreground'
            : isPos
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}
      >
        {isPos ? <ArrowUpRight className="w-3 h-3" /> : !isZero ? <ArrowDownRight className="w-3 h-3" /> : null}
        {text}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header & Date Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Commerce Intelligence</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
              Database Reconciled
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time revenue, merchandise sales, and catalog analytics derived strictly from non-cancelled database orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: '90days', label: '90 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' },
            { id: 'custom', label: 'Custom' },
          ].map((btn) => (
            <Button
              key={btn.id}
              variant={range === btn.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(btn.id)}
              className="text-xs font-medium"
            >
              {btn.label}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="p-2"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Custom Date Form */}
      {range === 'custom' && (
        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-4 bg-muted/40 p-4 rounded-xl border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 text-xs"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 text-xs"
              required
            />
          </div>
          <Button type="submit" size="sm" className="text-xs">
            Apply Range
          </Button>
        </form>
      )}

      {/* 6 Key KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* KPI 1: Net Revenue (Total Charged) */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Charged Revenue</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {formatCurrency(kpis?.netRevenue?.value || 0)}
              </h2>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">
              Prev: <span className="font-medium text-foreground">{formatCurrency(kpis?.netRevenue?.prevValue || 0)}</span>
            </span>
            {renderBadge(kpis?.netRevenue?.change, kpis?.netRevenue?.text)}
          </div>
        </div>

        {/* KPI 2: Gross Merchandise Sales (Item Subtotals) */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross Merchandise Sales</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {formatCurrency(kpis?.grossMerchandiseSales?.value || 0)}
              </h2>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">Item Subtotals Sum</span>
            <span className="text-[11px] font-bold text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded">
              Product Rev Base
            </span>
          </div>
        </div>

        {/* KPI 3: Qualifying Orders */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualifying Orders</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {kpis?.orders?.value || 0}
              </h2>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">
              Prev: <span className="font-medium text-foreground">{kpis?.orders?.prevValue || 0} orders</span>
            </span>
            {renderBadge(kpis?.orders?.change, kpis?.orders?.text)}
          </div>
        </div>

        {/* KPI 4: Total Units Sold & Unique Products */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Units Sold</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {kpis?.unitsSold?.value || 0} <span className="text-sm font-normal text-muted-foreground">units</span>
              </h2>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">
              Unique Products: <span className="font-bold text-foreground">{kpis?.uniqueProductsSold?.value || 0} distinct</span>
            </span>
            {renderBadge(kpis?.unitsSold?.change, kpis?.unitsSold?.text)}
          </div>
        </div>

        {/* KPI 5: Average Order Value (AOV) */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Order Value (AOV)</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {formatCurrency(kpis?.avgOrderValue?.value || 0)}
              </h2>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">
              Prev: <span className="font-medium text-foreground">{formatCurrency(kpis?.avgOrderValue?.prevValue || 0)}</span>
            </span>
            {renderBadge(kpis?.avgOrderValue?.change, kpis?.avgOrderValue?.text)}
          </div>
        </div>

        {/* KPI 6: Unique Customers */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unique Customers</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {kpis?.uniqueCustomers?.value || 0}
              </h2>
            </div>
            <div className="p-3 bg-violet-500/10 text-violet-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t text-xs">
            <span className="text-muted-foreground">
              Prev: <span className="font-medium text-foreground">{kpis?.uniqueCustomers?.prevValue || 0} customers</span>
            </span>
            {renderBadge(kpis?.uniqueCustomers?.change, kpis?.uniqueCustomers?.text)}
          </div>
        </div>
      </div>

      {/* Financial Reconciliation Summary Bar */}
      <div className="bg-muted/40 p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Merchandise Subtotal</p>
          <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(kpis?.grossMerchandiseSales?.value || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">+ Total Tax (GST 18%)</p>
          <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(kpis?.tax?.value || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">+ Shipping Fees</p>
          <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(kpis?.shipping?.value || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">= Net Charged Total</p>
          <p className="text-base font-extrabold text-emerald-600 mt-0.5">{formatCurrency(kpis?.netRevenue?.value || 0)}</p>
        </div>
      </div>

      {/* Visualizations: Revenue & Orders Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Visualizer */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Charged Revenue Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daily total charged order volume (tax & shipping inclusive)</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
              Total: {formatCurrency(kpis?.netRevenue?.value || 0)}
            </span>
          </div>

          {trends.every((t) => t.revenue === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/20 text-center p-6">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm text-foreground">No Sales Recorded in Period</p>
              <p className="text-xs text-muted-foreground mt-1">Select a broader date range or place test orders.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1 h-64 border-b border-l pb-2 pl-2 pt-4 relative">
                {trends.map((item, idx) => {
                  const pct = (item.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/30 rounded-t transition-colors relative group h-full flex flex-col justify-end"
                    >
                      <div
                        style={{ height: `${item.revenue > 0 ? Math.max(pct, 4) : 0}%` }}
                        className={`w-full rounded-t transition-all ${
                          item.revenue > 0 ? 'bg-emerald-600' : 'bg-transparent'
                        }`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2.5 rounded-lg shadow-xl border whitespace-nowrap z-30">
                        <p className="font-bold text-foreground">{item.date}</p>
                        <p className="text-emerald-600 font-bold mt-0.5">{formatCurrency(item.revenue)} charged</p>
                        <p className="text-[10px] text-muted-foreground">{item.orders} orders</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium mt-3">
                <span>{trends[0]?.date}</span>
                <span>{trends[Math.floor(trends.length / 2)]?.date}</span>
                <span>{trends[trends.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Orders Count & Status Trend */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" /> Daily Order Activity
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Qualifying non-cancelled vs cancelled order volume</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-full border border-blue-500/20">
              Total: {kpis?.orders?.value || 0} Orders
            </span>
          </div>

          {trends.every((t) => t.orders === 0 && t.cancelledOrders === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/20 text-center p-6">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm text-foreground">No Orders Recorded in Period</p>
              <p className="text-xs text-muted-foreground mt-1">Select a broader date range or place test orders.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1 h-64 border-b border-l pb-2 pl-2 pt-4 relative">
                {trends.map((item, idx) => {
                  const totalCount = item.orders + item.cancelledOrders;
                  const pct = (totalCount / Math.max(...trends.map((t) => t.orders + t.cancelledOrders), 1)) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500/30 rounded-t transition-colors relative group h-full flex flex-col justify-end"
                    >
                      <div
                        style={{ height: `${totalCount > 0 ? Math.max(pct, 4) : 0}%` }}
                        className={`w-full rounded-t transition-all ${
                          item.orders > 0 ? 'bg-blue-600' : item.cancelledOrders > 0 ? 'bg-rose-500' : 'bg-transparent'
                        }`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2.5 rounded-lg shadow-xl border whitespace-nowrap z-30">
                        <p className="font-bold text-foreground">{item.date}</p>
                        <p className="text-blue-600 font-bold mt-0.5">{item.orders} Qualifying</p>
                        {item.cancelledOrders > 0 && (
                          <p className="text-rose-600 font-bold">{item.cancelledOrders} Cancelled</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium mt-3">
                <span>{trends[0]?.date}</span>
                <span>{trends[Math.floor(trends.length / 2)]?.date}</span>
                <span>{trends[trends.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown & Order Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Revenue Share (2 Columns) */}
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-cyan-600" /> Category Revenue Breakdown
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Merchandise subtotal attribution across parent product categories</p>
            </div>
          </div>

          <div className="space-y-4">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-foreground">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{cat.itemsSold} units sold</span>
                    <span className="text-foreground font-bold">{formatCurrency(cat.revenue)}</span>
                    <span className="text-xs text-cyan-600 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                      {cat.sharePct}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(cat.sharePct, 2)}%` }}
                  />
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No category sales records found.</p>
            )}
          </div>
        </div>

        {/* Order Status Distribution (1 Column) */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-violet-600" /> Order Status Distribution
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">All-time order fulfillment pipeline state</p>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Pending', key: 'PENDING', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
              { label: 'Processing', key: 'PROCESSING', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
              { label: 'Shipped', key: 'SHIPPED', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
              { label: 'Delivered', key: 'DELIVERED', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
              { label: 'Cancelled', key: 'CANCELLED', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
              { label: 'Refunded', key: 'REFUNDED', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
            ].map((st) => (
              <div key={st.key} className="flex justify-between items-center p-3 rounded-xl border bg-muted/20">
                <span className="text-xs font-semibold text-foreground">{st.label}</span>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${st.color}`}>
                  {statuses[st.key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products & Top Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 5 Products Table */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" /> Top Performing Products
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ranked by historical item snapshot merchandise revenue</p>
            </div>
          </div>

          <div className="divide-y">
            {topProducts.map((prod, idx) => (
              <div key={prod.id || idx} className="py-3.5 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-[10px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-foreground line-clamp-1">{prod.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {prod.brandName} • {prod.categoryName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-foreground">{formatCurrency(prod.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{prod.quantity} units sold</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-4">No top product sales recorded.</p>
            )}
          </div>
        </div>

        {/* Top Brands Table */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-600" /> Top Brands by Merchandise Sales
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Brand performance across all qualifying non-cancelled items</p>
            </div>
          </div>

          <div className="divide-y">
            {topBrands.map((brand, idx) => (
              <div key={idx} className="py-3.5 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-foreground">{brand.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-foreground">{formatCurrency(brand.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{brand.quantity} units</p>
                </div>
              </div>
            ))}
            {topBrands.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-4">No brand sales records found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
