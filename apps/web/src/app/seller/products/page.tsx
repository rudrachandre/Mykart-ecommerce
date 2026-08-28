import { cookies } from 'next/headers';
import { getSellerProducts } from '@/lib/api/sellers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { ProductActions } from '@/components/seller/ProductActions';

export const metadata = {
  title: 'My Products | Seller Dashboard',
};

export default async function SellerProductsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  let products = [];
  try {
    products = await getSellerProducts(token);
  } catch (error) {
    redirect('/seller/onboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/seller" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">My Products</h1>
        </div>
        <Link href="/seller/products/new">
          <Button>Add New Product</Button>
        </Link>
      </div>
      
      {products.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground mb-4">You have not added any products yet.</p>
          <Link href="/seller/products/new">
            <Button>Add Your First Product</Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Base Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product: any) => (
                <tr key={product.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4">{product.category?.name || 'Uncategorized'}</td>
                  <td className="px-6 py-4">{product.status}</td>
                  <td className="px-6 py-4">₹{parseFloat(product.basePrice).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {(product.variants || []).map((v: any) => {
                      const qty = v.inventory?.quantity ?? 0;
                      const reserved = v.inventory?.reserved ?? 0;
                      const available = qty - reserved;
                      return (
                        <div key={v.id} className="text-xs">
                          <span className="font-mono">{v.sku}</span>
                          <span className="text-muted-foreground"> Q:{qty} R:{reserved} A:{available}</span>
                        </div>
                      );
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <ProductActions productId={product.id} slug={product.slug} />
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
