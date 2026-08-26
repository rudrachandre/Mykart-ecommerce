import { cookies } from 'next/headers';
import { getOrders } from '@/lib/api/orders';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PackageOpen, ArrowRight, Clock, CheckCircle2, Package } from 'lucide-react';
import * as motion from 'framer-motion/client';

export const metadata = {
  title: 'My Orders | MyKart',
  description: 'View your order history',
};

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <div className="bg-card border rounded-2xl p-12 shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <PackageOpen className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Sign In to View Orders</h1>
          <p className="text-muted-foreground mb-8 text-lg">You must be logged in to access your order history.</p>
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto rounded-full font-semibold px-8 hover:scale-105 active:scale-95 transition-all">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  let orders = [];
  try {
    orders = await getOrders(token);
  } catch (error) {
    console.error('Failed to fetch orders', error);
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Order History</h1>
          <p className="text-muted-foreground">Track and manage your recent purchases.</p>
        </div>
        <div className="bg-primary/10 text-primary font-bold px-4 py-1.5 rounded-full text-sm self-start sm:self-auto">
          {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Total
        </div>
      </div>
      
      {orders.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 border rounded-2xl bg-card shadow-sm"
        >
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">No orders found</p>
          <p className="text-muted-foreground mb-8">You haven&apos;t placed any orders yet.</p>
          <Link href="/products">
            <Button size="lg" className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all">
              Start Shopping <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-12"
        >
          {orders.map((order: any) => (
            <div key={order.id} className="border border-border/40 bg-background overflow-hidden group">
              <div className="flex flex-wrap justify-between items-center p-6 bg-secondary border-b border-border/40 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-1">Order Placed</p>
                  <p className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-1">Total</p>
                  <p className="font-medium text-foreground">₹{parseFloat(order.total).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {order.status === 'DELIVERED' ? (
                      <CheckCircle2 className="w-4 h-4 text-foreground" />
                    ) : (
                      <Clock className="w-4 h-4 text-foreground/70" />
                    )}
                    <span className="font-medium text-foreground tracking-wide uppercase text-xs">{order.status}</span>
                  </div>
                </div>
                <div className="flex-1 flex justify-end">
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="outline" className="rounded-none px-8 h-10 border-foreground text-foreground uppercase tracking-widest text-[10px] font-bold hover:bg-foreground hover:text-background transition-colors">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-8 space-y-6">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex gap-6 items-center">
                    <div className="w-20 h-24 bg-secondary flex-shrink-0 border border-border/40 flex items-center justify-center overflow-hidden relative">
                      {item.product.images?.[0]?.url ? (
                        <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-base hover:text-foreground/70 transition-colors cursor-pointer line-clamp-1">{item.product.name}</p>
                      <p className="text-sm font-light text-foreground/60 mt-2">
                        Qty: {item.quantity} <span className="mx-2">•</span> <span className="text-foreground font-medium">₹{parseFloat(item.price).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
