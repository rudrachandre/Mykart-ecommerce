import { cookies } from 'next/headers';
import { getSellerOrderDetail } from '@/lib/api/sellers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { OrderStatusClient } from './OrderStatusClient';
import { approveReturn, rejectReturn } from '@/lib/api/sellers';
import { toast } from 'sonner';

export default async function SellerOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const resolvedParams = await params;

  let order;
  try {
    order = await getSellerOrderDetail(token, resolvedParams.id);
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Order Not Found</h1>
        <p className="mt-4 text-muted-foreground">This order does not exist or does not contain your products.</p>
        <Link href="/seller/orders" className="text-primary hover:underline mt-4 inline-block">
          Return to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/seller/orders" className="text-sm text-primary hover:underline mb-6 block">
        &larr; Back to Orders
      </Link>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Order Details</h1>
          <p className="text-muted-foreground mt-2 font-mono">ID: {order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Date Placed</p>
          <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Items to Fulfill</h2>
            <div className="divide-y">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {item.product.images?.[0] && (
                      <img src={item.product.images[0].url} alt={item.product.name} className="w-16 h-16 object-cover rounded" />
                    )}
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.variant.color && `Color: ${item.variant.color}`} 
                        {item.variant.size && ` | Size: ${item.variant.size}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">SKU: {item.variant.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{parseFloat(item.price).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    <p className="font-bold mt-1">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.returns && order.returns.length > 0 && (
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-medium mb-4">Return Requests</h2>
              <div className="divide-y">
                {order.returns.map((returnItem: any) => (
                  <div key={returnItem.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Reason: {returnItem.reason}</p>
                        <p className="text-sm text-muted-foreground mt-1">Status: {returnItem.status}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested: {new Date(returnItem.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {returnItem.status === 'REQUESTED' && (
                        <div className="flex gap-2">
                          <form action={async () => {
                            try {
                              await approveReturn(token, order.id, returnItem.id);
                              toast.success('Return approved');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to approve return');
                            }
                          }}>
                            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                          </form>
                          <form action={async () => {
                            try {
                              await rejectReturn(token, order.id, returnItem.id);
                              toast.success('Return rejected');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to reject return');
                            }
                          }}>
                            <Button type="submit" size="sm" variant="destructive">Reject</Button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Order Status</h2>
            <OrderStatusClient orderId={resolvedParams.id} initialStatus={order.status} />
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Customer Details</h2>
            {order.user ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {order.user.name}</p>
                <p><span className="font-medium">Email:</span> {order.user.email}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Guest Checkout</p>
            )}
            
            {order.shippingAddress && (
              <div className="mt-4 pt-4 border-t">
                <p className="font-medium mb-2 text-sm">Shipping Address</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.country}</p>
                  <p>Phone: {order.shippingAddress.phone}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Payment Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{parseFloat(order.shippingFee) === 0 ? 'FREE' : `₹${parseFloat(order.shippingFee).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{parseFloat(order.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total</span>
                <span>₹{parseFloat(order.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment Status</span>
                <span>{order.payments?.[0]?.status || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
