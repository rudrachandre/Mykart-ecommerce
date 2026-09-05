import { cookies } from 'next/headers';
import { getOrderById } from '@/lib/api/orders';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, Package, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

import { OrderStatusStepper } from '@/components/orders/OrderStatusStepper';
import { OrderActionsClient } from '@/components/orders/OrderActionsClient';

export const metadata = {
  title: 'Order Details | MyKart',
};

export default async function AccountOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; payment?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  if (!token) return null;

  let order: any;
  try {
    order = await getOrderById(token, id);
  } catch (error) {
    notFound();
  }

  const isSuccess = sp.success === 'true';
  const isFailed = sp.payment === 'failed';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
        </Link>
      </div>

      {isSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold">Payment Successful</h2>
            <p className="text-xs">Your order has been confirmed and is now being processed.</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
          <XCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold">Payment Failed</h2>
            <p className="text-xs">There was an issue processing your payment. Your order is pending payment.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-muted-foreground">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <OrderStatusStepper currentStatus={order.status} />

      <OrderActionsClient
        orderId={order.id}
        status={order.status}
        paymentStatus={order.payments?.[0]?.status}
        token={token}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Items Ordered</h2>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-4 items-start border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <div className="w-20 h-24 bg-secondary flex-shrink-0 relative overflow-hidden rounded-lg border border-border/40">
                    {item.product.images?.[0]?.url ? (
                      <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link href={`/products/${item.product.slug}`} className="font-medium text-sm hover:underline line-clamp-1">
                        {item.product.name}
                      </Link>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                        {item.variant.size && <span>Size: {item.variant.size}</span>}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center w-full text-xs">
                      <span className="text-muted-foreground font-medium">Qty: {item.quantity}</span>
                      <span className="font-bold text-base text-foreground">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.price))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-secondary/60 p-6 rounded-xl border border-border/40">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 text-xs text-muted-foreground mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.subtotal))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-foreground">
                  {parseFloat(order.shippingFee) === 0
                    ? 'FREE'
                    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.shippingFee))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.tax))}
                </span>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4 flex justify-between items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total</span>
              <span className="text-2xl font-extrabold text-foreground">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(order.total))}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Shipping Information</h2>
            <div className="text-xs space-y-1.5 text-foreground/80 bg-card border border-border/40 p-5 rounded-xl">
              <p className="font-bold text-foreground text-sm mb-2">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="pt-2 font-medium text-foreground">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
