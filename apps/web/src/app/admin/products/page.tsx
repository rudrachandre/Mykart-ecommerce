'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getAdminProducts, setProductStatus } from '@/lib/api/admin';
import { deleteProduct } from '@/lib/api/sellers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';

export default function AdminProductsPage() {
  const [data, setData] = useState<{ products: any[], total: number }>({ products: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 10;

  const router = useRouter();

  const fetchProducts = async () => {
    setLoading(true);
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const skip = (page - 1) * limit;
      const result = await getAdminProducts(token, skip, limit, search);
      setData(result);
    } catch (err: any) {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts();
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [router, page, search]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = Cookies.get('accessToken');
      if (!token) return;
      await deleteProduct(token, productId);
      setData(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== productId),
        total: prev.total - 1
      }));
      toast.success('Product deleted');
    } catch (err: any) {
      toast.error('Failed to delete product');
    }
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    const token = Cookies.get('accessToken');
    if (!token) return;

    try {
      setUpdatingId(productId);
      await setProductStatus(token, productId, newStatus);
      toast.success('Product status updated successfully');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update product status');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Platform Products ({data.total})</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search products..."
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
              <thead className="bg-muted/50 font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Moderation</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data.products.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products found.</td></tr>
                ) : (
                  data.products.map((product) => {
                    const imageUrl = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
                    return (
                      <tr key={product.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-primary line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category?.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{product.seller?.storeName}</p>
                          <p className="text-xs text-muted-foreground">{product.seller?.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">₹{product.basePrice}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${product.status === 'ACTIVE' ? 'bg-green-500/20 text-green-700' : 'bg-muted'}`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(product.variants || []).map((v: any) => {
                            const qty = v.inventory?.quantity ?? 0;
                            const reserved = v.inventory?.reserved ?? 0;
                            const available = qty - reserved;
                            return (
                              <div key={v.id} className="text-xs">
                                <span className="font-mono">{v.sku}</span>
                                <span className="text-muted-foreground"> A:{available}</span>
                              </div>
                            );
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={product.status}
                            disabled={updatingId === product.id}
                            onChange={(e) => handleStatusChange(product.id, e.target.value)}
                            className="border p-1 rounded bg-background text-xs"
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link href={`/admin/products/${product.slug}/edit`}>
                              <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-xs text-muted-foreground">
              Showing {data.products.length} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
