import { cookies } from 'next/headers';
import { getOrderById } from '@/lib/api/orders';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import Image from 'next/image';

import { OrderStatusStepper } from '@/components/orders/OrderStatusStepper';

export const metadata = {
  title: 'Order Details | MyKart',
};

export default async function OrderDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ success?: string, payment?: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <h1 className="text-3xl font-bold mb-4">Order Details</h1>
        <p className="text-muted-foreground mb-8">Please sign in to view this order.</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  let order;
  try {
    order = await getOrderById(token, id);
  } catch (error) {
    notFound();
  }

  const isSuccess = sp.success === 'true';
  const isFailed = sp.payment === 'failed';

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/orders" className="text-xs uppercase tracking-widest font-bold text-foreground/50 hover:text-foreground transition-colors">
          &larr; Back to Orders
        </Link>
      </div>
      
      {isSuccess && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 text-green-900 rounded-lg flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-lg font-bold">Payment Successful</h2>
            <p className="text-sm">Your order has been confirmed and is now being processed.</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="mb-8 p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-4">
          <XCircle className="w-8 h-8" />
          <div>
            <h2 className="text-lg font-bold">Payment Failed</h2>
            <p className="text-sm">There was an issue processing your payment. Your order is pending payment.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12 border-b border-border/40 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <OrderStatusStepper currentStatus={order.status} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Items Ordered</h2>
            <div className="space-y-6">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-6 items-start border-b border-border/40 pb-6 last:border-0 last:pb-0">
                  <div className="w-24 h-32 bg-secondary flex-shrink-0 relative overflow-hidden border border-border/40">
                    {item.product.images?.[0]?.url ? (
                      <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-foreground/30" /></div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col h-full justify-between">
                    <div>
                      <Link href={`/products/${item.product.slug}`} className="font-medium text-lg hover:text-primary transition-colors">{item.product.name}</Link>
                      <div className="flex gap-4 mt-2 text-sm text-foreground/60 font-light">
                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                        {item.variant.size && <span>Size: {item.variant.size}</span>}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center w-full">
                      <span className="text-sm text-foreground/60 font-medium">Qty: {item.quantity}</span>
                      <span className="font-bold text-lg text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.price))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-12">
          <div className="bg-secondary p-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Order Summary</h2>
            <div className="space-y-4 text-sm font-light text-foreground/70 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-foreground">{parseFloat(order.shippingFee) === 0 ? 'FREE' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.shippingFee))}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-medium text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.tax))}</span>
              </div>
            </div>
            <div className="border-t border-border/40 pt-6 flex justify-between items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">Total</span>
              <span className="text-3xl font-extrabold text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.total))}</span>
            </div>
          </div>
          
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Shipping Information</h2>
            <div className="text-sm space-y-2 text-foreground/80 bg-background border border-border/40 p-6">
              <p className="font-bold text-foreground text-base mb-4">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="pt-4 font-medium text-foreground">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
