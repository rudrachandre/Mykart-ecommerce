import { cookies } from 'next/headers';
import { getSellerOrders } from '@/lib/api/sellers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OrderStatusClient } from './OrderStatusClient';

export default async function SellerOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const resolvedParams = await params;

  let orders = [];
  try {
    orders = await getSellerOrders(token);
  } catch (error) {
    redirect('/seller/onboard');
  }

  // Filter items in this specific order that belong to the seller
  const orderItems = orders.filter((item: any) => item.orderId === resolvedParams.id);

  if (orderItems.length === 0) {
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

  const orderInfo = orderItems[0].order;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/seller/orders" className="text-sm text-primary hover:underline mb-6 block">
        &larr; Back to Orders
      </Link>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Order Details</h1>
          <p className="text-muted-foreground mt-2 font-mono">ID: {resolvedParams.id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Date Placed</p>
          <p className="font-medium">{new Date(orderInfo.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Items to Fulfill</h2>
            <div className="divide-y">
              {orderItems.map((item: any) => (
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
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Order Status</h2>
            <OrderStatusClient orderId={resolvedParams.id} initialStatus={orderInfo.status} />
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">Customer Details</h2>
            {orderInfo.user ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {orderInfo.user.name}</p>
                <p><span className="font-medium">Email:</span> {orderInfo.user.email}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Guest Checkout</p>
            )}
            
            {orderInfo.shippingAddress && (
              <div className="mt-4 pt-4 border-t">
                <p className="font-medium mb-2 text-sm">Shipping Address</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{orderInfo.shippingAddress.fullName}</p>
                  <p>{orderInfo.shippingAddress.street}</p>
                  <p>{orderInfo.shippingAddress.city}, {orderInfo.shippingAddress.state} {orderInfo.shippingAddress.zipCode}</p>
                  <p>{orderInfo.shippingAddress.country}</p>
                  <p>Phone: {orderInfo.shippingAddress.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
