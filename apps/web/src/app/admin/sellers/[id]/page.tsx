'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { getSellerById } from '@/lib/api/admin';
import { deleteProduct } from '@/lib/api/sellers';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function AdminSellerDetailPage() {
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const sellerId = params.id as string;

  useEffect(() => {
    const fetchSeller = async () => {
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const result = await getSellerById(token, sellerId);
        setSeller(result);
      } catch (err: any) {
        setError('Failed to load seller details. Seller may not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [sellerId, router]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = Cookies.get('accessToken');
      if (!token) return;
      await deleteProduct(token, productId);
      setSeller((prev: any) => ({
        ...prev,
        products: prev.products.filter((p: any) => p.id !== productId),
        _count: {
          ...prev._count,
          products: prev._count.products - 1
        }
      }));
      toast.success('Product deleted');
    } catch (err: any) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) return <div className="p-8">Loading seller...</div>;
  if (error) return <div className="p-8 text-red-500 font-medium">{error}</div>;
  if (!seller) return <div className="p-8">Seller not found.</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{seller.storeName}</h1>
          <p className="text-muted-foreground mt-1">
            Owner: {seller.user?.name} ({seller.user?.email})
          </p>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>ID: {seller.id}</span>
            <span>Status: <span className="text-primary font-medium">{seller.status || 'ACTIVE'}</span></span>
          </div>
        </div>
        <Link 
          href={`/admin/sellers/${seller.id}/products/new`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          List Product Manually
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Products</h3>
          <p className="text-3xl font-bold">{seller._count?.products || 0}</p>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Orders</h3>
          <p className="text-3xl font-bold">{seller._count?.orderItems || 0}</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Products</h2>
        </div>

        {seller.products && seller.products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Inventory</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {seller.products.map((product: any) => {
                  const variant = product.variants?.[0] || {};
                  const inventory = variant.inventory?.quantity || 0;
                  const price = variant.price || product.basePrice || 0;
                  const imageUrl = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

                  return (
                    <tr key={product.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                          <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                        </div>
                        <span className="font-medium text-primary line-clamp-1">{product.name}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{variant.sku || '-'}</td>
                      <td className="px-4 py-3 font-medium">₹{price}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${inventory > 0 ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
                          {inventory} in stock
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${product.status === 'ACTIVE' ? 'bg-green-500/20 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/products/${product.slug}/edit`}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
            <p className="text-muted-foreground mb-4">No products listed for this seller yet.</p>
            <Link 
              href={`/admin/sellers/${seller.id}/products/new`}
              className="text-primary hover:underline font-medium"
            >
              List the first product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
