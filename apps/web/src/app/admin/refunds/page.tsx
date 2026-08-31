'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getRefunds } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;
  const token = Cookies.get('accessToken') || '';

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      const data = await getRefunds(token, skip, limit);
      setRefunds(data.refunds);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load refunds history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadRefunds();
    }
  }, [token, page]);

  const totalPages = Math.ceil(total / limit);

  if (loading && refunds.length === 0) {
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
          <RefreshCw className="w-8 h-8 text-primary animate-spin-slow" /> Refunds History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform customer return refunds and order reimbursement registers.</p>
      </div>

      {refunds.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No refunds history found.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Refund Date</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-primary">
                      <Link href={`/admin/orders/${r.orderId}`} className="hover:underline">
                        {r.orderId.slice(-8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-xs">{r.order?.user?.name || 'Guest'}</p>
                      <p className="text-[10px] text-muted-foreground">{r.order?.user?.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{r.reason}</td>
                    <td className="px-6 py-4 font-medium">₹{parseFloat(r.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'COMPLETED' ? 'bg-green-500/20 text-green-700' : 'bg-yellow-500/20 text-yellow-700'}`}>
                        {r.status}
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
