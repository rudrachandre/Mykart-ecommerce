'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getPayments } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;
  const token = Cookies.get('accessToken') || '';

  const loadPayments = async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      const data = await getPayments(token, skip, limit);
      setPayments(data.payments);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load payments history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadPayments();
    }
  }, [token, page]);

  const totalPages = Math.ceil(total / limit);

  if (loading && payments.length === 0) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-primary hover:underline mb-2 block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-primary" /> Payments History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform transaction registers and processing logs.</p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No payments history found.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-primary">
                      <Link href={`/admin/orders/${p.orderId}`} className="hover:underline">
                        {p.orderId.slice(-8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-xs">{p.order?.user?.name || 'Guest'}</p>
                      <p className="text-[10px] text-muted-foreground">{p.order?.user?.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{p.provider}</td>
                    <td className="px-6 py-4 font-medium">₹{parseFloat(p.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.status === 'COMPLETED' ? 'bg-green-500/20 text-green-700' : p.status === 'FAILED' ? 'bg-red-500/20 text-red-700' : 'bg-muted'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
