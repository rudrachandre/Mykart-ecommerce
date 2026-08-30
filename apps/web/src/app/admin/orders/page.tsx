'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getOrders } from '@/lib/api/admin';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminOrdersPage() {
  const [data, setData] = useState<{ orders: any[], total: number }>({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const limit = 10;
  
  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const skip = (page - 1) * limit;
        const result = await getOrders(token, skip, limit, search, status);
        setData(result);
      } catch (err: any) {
        setError('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchOrders();
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [router, page, search, status]);

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Platform Orders ({data.total})</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search order ID or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border p-2 rounded w-64 bg-background"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border p-2 rounded bg-background"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="text-red-500 bg-red-100 p-4 rounded">{error}</div>
      ) : (
        <>
          <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 font-medium">
                <tr>
                  <th className="px-4 py-3 border-b">Order ID</th>
                  <th className="px-4 py-3 border-b">Date</th>
                  <th className="px-4 py-3 border-b">Customer</th>
                  <th className="px-4 py-3 border-b">Total</th>
                  <th className="px-4 py-3 border-b">Status</th>
                  <th className="px-4 py-3 border-b">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data.orders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders found.</td></tr>
                ) : (
                  data.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{order.id.slice(-8)}</td>
                      <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{order.user?.name || 'Guest'}</td>
                      <td className="px-4 py-3 font-medium">₹{Number(order.total).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="bg-foreground text-background px-2 py-1 text-[10px] uppercase font-bold tracking-widest">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {data.orders.length} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
