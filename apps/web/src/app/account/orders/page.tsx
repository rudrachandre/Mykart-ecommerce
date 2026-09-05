import { cookies } from 'next/headers';
import { getOrders } from '@/lib/api/orders';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PackageOpen, ArrowRight, Clock, CheckCircle2, Package, XCircle } from 'lucide-react';
import * as motion from 'framer-motion/client';

export const metadata = {
  title: 'My Orders | MyKart',
  description: 'View your order history',
};

export default async function AccountOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) return null;

  let orders: any[] = [];
  try {
    orders = await getOrders(token);
  } catch (error) {
    console.error('Failed to fetch orders', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">My Orders</h1>
          <p className="text-muted-foreground text-sm">Track and manage your order history.</p>
        </div>
        <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs self-start sm:self-auto">
          {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Total
        </div>
      </div>

      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 border border-dashed rounded-xl bg-card"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">No orders found</h2>
          <p className="text-muted-foreground text-sm mb-6">You haven&apos;t placed any orders yet.</p>
          <Link href="/products">
            <Button size="sm" className="rounded-full px-6 font-semibold">
              Start Shopping <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => {
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';

            return (
              <div key={order.id} className="border border-border/40 bg-card rounded-xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center p-4 md:p-6 bg-secondary/50 border-b border-border/40 gap-4 text-xs md:text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Order Placed</p>
                    <p className="font-semibold text-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Total</p>
                    <p className="font-semibold text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.total))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Status</p>
                    <div className="flex items-center gap-1.5">
                      {isDelivered ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCancelled ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="font-semibold uppercase tracking-wider text-xs">{order.status}</span>
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

                {/* Items */}
                <div className="p-4 md:p-6 space-y-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="w-16 h-20 bg-secondary flex-shrink-0 rounded-lg border border-border/40 overflow-hidden relative">
                        {item.product.images?.[0]?.url ? (
                          <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.product.slug}`} className="font-medium text-sm hover:underline line-clamp-1">
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          Qty: {item.quantity} <span className="mx-1">•</span>{' '}
                          <span className="font-medium text-foreground">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.price))}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
