import { cookies } from 'next/headers';
import { getOrders } from '@/lib/api/orders';
import { redirect } from 'next/navigation';
import { OrdersListClient } from './OrdersListClient';

export const metadata = {
  title: 'My Orders | MyKart',
  description: 'View and manage your order history.',
};

export default async function AccountOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">My Orders</h1>
          <p className="text-muted-foreground text-sm">Track, manage, and download invoices for your purchases.</p>
        </div>
        <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs self-start sm:self-auto">
          {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Total
        </span>
      </div>

      <OrdersListClient initialOrders={orders} />
    </div>
  );
}
