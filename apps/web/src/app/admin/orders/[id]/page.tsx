import { cookies } from 'next/headers';
import { getAdminOrderDetail } from '@/lib/api/admin';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import Image from 'next/image';

import { OrderStatusStepper } from '@/components/orders/OrderStatusStepper';

export const metadata = {
  title: 'Order Details | Admin',
};

export default async function AdminOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const { id } = await params;

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <h1 className="text-3xl font-bold mb-4">Admin Order Details</h1>
        <p className="text-muted-foreground mb-8">Please sign in as admin.</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  let order;
  try {
    order = await getAdminOrderDetail(token, id);
  } catch (error) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/admin/orders" className="text-xs uppercase tracking-widest font-bold text-foreground/50 hover:text-foreground transition-colors">
          &larr; Back to Orders
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12 border-b border-border/40 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Customer</p>
          <p className="font-medium">{order.user?.name || 'Guest'}</p>
          <p className="text-sm text-muted-foreground">{order.user?.email}</p>
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
                      <p className="font-medium text-lg">{item.product.name}</p>
                      <div className="flex gap-4 mt-2 text-sm text-foreground/60 font-light">
                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                        {item.variant.size && <span>Size: {item.variant.size}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Seller: {item.seller.storeName}</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center w-full">
                      <span className="text-sm text-foreground/60 font-medium">Qty: {item.quantity}</span>
                      <span className="font-bold text-lg text-foreground">₹{parseFloat(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.returns && order.returns.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Returns</h2>
              <div className="space-y-4">
                {order.returns.map((returnItem: any) => (
                  <div key={returnItem.id} className="border border-border/40 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Reason: {returnItem.reason}</p>
                        <p className="text-sm text-muted-foreground">Status: {returnItem.status}</p>
                        <p className="text-xs text-muted-foreground">Requested: {new Date(returnItem.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.replacements && order.replacements.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Replacements</h2>
              <div className="space-y-4">
                {order.replacements.map((replacement: any) => (
                  <div key={replacement.id} className="border border-border/40 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Reason: {replacement.reason}</p>
                        <p className="text-sm text-muted-foreground">Status: {replacement.status}</p>
                        <p className="text-xs text-muted-foreground">Requested: {new Date(replacement.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-12">
          <div className="bg-secondary p-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Order Summary</h2>
            <div className="space-y-4 text-sm font-light text-foreground/70 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">₹{parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-foreground">{parseFloat(order.shippingFee) === 0 ? 'FREE' : `₹${parseFloat(order.shippingFee).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-medium text-foreground">₹{parseFloat(order.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="font-medium text-green-600">-₹{parseFloat(order.discount).toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t border-border/40 pt-6 flex justify-between items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">Total</span>
              <span className="text-3xl font-extrabold text-foreground">₹{parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Payment Information</h2>
            <div className="text-sm space-y-2 text-foreground/80 bg-background border border-border/40 p-6">
              <div className="flex justify-between">
                <span>Payment Status</span>
                <span className="font-medium">{order.payments?.[0]?.status || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="font-medium">{order.payments?.[0]?.provider || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID</span>
                <span className="font-mono text-xs">{order.payments?.[0]?.transactionId || 'N/A'}</span>
              </div>
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

          {order.refunds && order.refunds.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-6">Refunds</h2>
              <div className="space-y-4">
                {order.refunds.map((refund: any) => (
                  <div key={refund.id} className="border border-border/40 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Amount: ₹{parseFloat(refund.amount).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Reason: {refund.reason}</p>
                        <p className="text-sm text-muted-foreground">Status: {refund.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
