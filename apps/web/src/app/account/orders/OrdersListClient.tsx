'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, ArrowRight, Clock, CheckCircle2, XCircle, Search, CreditCard, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OrdersListClientProps {
  initialOrders: any[];
}

export function OrdersListClient({ initialOrders }: OrdersListClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOrders = initialOrders.filter((order) => {
    // Status filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesId = order.id.toLowerCase().includes(q);
      const matchesItem = order.items.some((item: any) =>
        item.product?.name?.toLowerCase().includes(q)
      );
      return matchesId || matchesItem;
    }

    return true;
  });

  const getStatusCounts = (status: string) => {
    if (status === 'ALL') return initialOrders.length;
    return initialOrders.filter((o) => o.status === status).length;
  };

  return (
    <div className="space-y-6">
      {/* Search & Status Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PROCESSING', label: 'Processing' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => {
            const count = getStatusCounts(tab.id);
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[10px] rounded-full font-bold',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search orders or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 border border-dashed border-border/60 rounded-xl bg-card p-8"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">No orders found</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No orders match your search or status filter criteria.'
              : "You haven't placed any orders yet. Discover our premium electronics catalog."}
          </p>

          {searchQuery || statusFilter !== 'ALL' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="font-semibold text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            <Link href="/products">
              <Button size="sm" className="rounded-full px-6 font-semibold shadow-sm">
                Start Shopping <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order: any) => {
              const isDelivered = order.status === 'DELIVERED';
              const isCancelled = order.status === 'CANCELLED';
              const payment = order.payments?.[0];
              const isPaid = payment?.status === 'COMPLETED';

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border border-border/40 bg-card rounded-xl overflow-hidden shadow-sm hover:border-border transition-colors"
                >
                  {/* Order Header Bar */}
                  <div className="flex flex-wrap justify-between items-center p-4 md:p-5 bg-secondary/40 border-b border-border/40 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Order Placed</p>
                      <p className="font-semibold text-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Total Amount</p>
                      <p className="font-bold text-foreground text-sm">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                          parseFloat(order.total)
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Payment</p>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full',
                          isPaid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        )}
                      >
                        <CreditCard className="w-3 h-3" />
                        {payment?.provider || 'COD'} ({payment?.status || 'PENDING'})
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Order Status</p>
                      <div className="flex items-center gap-1.5">
                        {isDelivered ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : isCancelled ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        )}
                        <span className="font-bold uppercase tracking-wider text-xs">{order.status}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex justify-end">
                      <Link href={`/account/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 md:p-5 space-y-3">
                    {order.items.map((item: any) => {
                      const imgUrl = item.product?.images?.[0]?.url || (typeof item.product?.images?.[0] === 'string' ? item.product.images[0] : null);
                      const productName = item.product?.name || 'Product';
                      const productSlug = item.product?.slug || '#';

                      return (
                        <div key={item.id} className="flex gap-4 items-center">
                          <div className="w-16 h-20 bg-secondary flex-shrink-0 rounded-lg border border-border/40 overflow-hidden relative">
                            {imgUrl ? (
                              <Image src={imgUrl} alt={productName} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={productSlug !== '#' ? `/products/${productSlug}` : '#'} className="font-semibold text-sm hover:underline hover:text-primary transition-colors line-clamp-1">
                              {productName}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                              Qty: {item.quantity} <span className="mx-1.5">•</span>{' '}
                              <span className="font-semibold text-foreground">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                                  parseFloat(item.price || 0)
                                )}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
