import { cookies } from 'next/headers';
import { getSellerOrders } from '@/lib/api/sellers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'My Orders | Seller Dashboard',
};

export default async function SellerOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  let orders = [];
  try {
    orders = await getSellerOrders(token);
  } catch (error) {
    redirect('/seller/onboard');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/seller" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Orders for My Products</h1>
        </div>
      </div>
      
      {orders.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">You have no orders yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Order ID</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Qty</th>
                <th className="px-6 py-4 font-medium">Earnings</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium text-xs">{item.orderId.slice(0, 8)}</td>
                  <td className="px-6 py-4">{new Date(item.order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{item.order.user?.name || 'Guest'}</td>
                  <td className="px-6 py-4">
                    <p>{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.variant.sku && `SKU: ${item.variant.sku}`}
                    </p>
                  </td>
                  <td className="px-6 py-4">{item.quantity}</td>
                  <td className="px-6 py-4 font-medium">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="bg-foreground text-background px-2 py-1 text-[10px] uppercase font-bold tracking-widest">
                      {item.order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/seller/orders/${item.orderId}`}>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
