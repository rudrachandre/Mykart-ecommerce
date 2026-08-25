'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getSellers } from '@/lib/api/admin';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminSellersPage() {
  const [data, setData] = useState<{ sellers: any[], total: number }>({ sellers: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 10;
  
  const router = useRouter();

  useEffect(() => {
    const fetchSellers = async () => {
      setLoading(true);
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const skip = (page - 1) * limit;
        const result = await getSellers(token, skip, limit, search);
        setData(result);
      } catch (err: any) {
        setError('Failed to load sellers.');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchSellers();
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [router, page, search]);

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Sellers ({data.total})</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search store, name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border p-2 rounded w-64 bg-background"
          />
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
                  <th className="px-4 py-3 border-b">Store Name</th>
                  <th className="px-4 py-3 border-b">Owner</th>
                  <th className="px-4 py-3 border-b">Products</th>
                  <th className="px-4 py-3 border-b">Orders Fulfillments</th>
                  <th className="px-4 py-3 border-b">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data.sellers.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No sellers found.</td></tr>
                ) : (
                  data.sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{seller.storeName}</td>
                      <td className="px-4 py-3">
                        <p>{seller.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{seller.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono">{seller._count.products}</td>
                      <td className="px-4 py-3 font-mono">{seller._count.orderItems}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/sellers/${seller.id}`}>
                          <Button variant="outline" size="sm">Manage</Button>
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
              Showing {data.sellers.length} of {data.total}
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
