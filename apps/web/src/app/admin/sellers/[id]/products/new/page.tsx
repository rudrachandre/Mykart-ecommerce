import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProductForm } from '@/components/seller/ProductForm';
import { getSellerById } from '@/lib/api/admin';
import Link from 'next/link';

export const metadata = {
  title: 'List Product Manually | Admin',
};

async function getOptions() {
  const [catRes, brandRes] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/categories', { cache: 'no-store' }),
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/brands', { cache: 'no-store' })
  ]);
  
  const categories = catRes.ok ? await catRes.json() : [];
  const brands = brandRes.ok ? await brandRes.json() : [];
  
  return { categories, brands };
}

export default async function AdminNewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const sellerId = resolvedParams.id;
  
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  let seller;
  try {
    seller = await getSellerById(token, sellerId);
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <h1 className="text-2xl font-bold text-red-500">Seller not found or access denied.</h1>
        <Link href="/admin/sellers" className="text-primary hover:underline mt-4 inline-block">
          Return to Seller Management
        </Link>
      </div>
    );
  }

  const { categories, brands } = await getOptions();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/admin/sellers/${sellerId}`} className="text-sm text-primary hover:underline mb-4 block">
        &larr; Back to {seller.storeName}
      </Link>
      <div className="mb-8 p-6 bg-muted/20 border border-muted rounded-xl">
        <h1 className="text-3xl font-bold">List Product for {seller.storeName}</h1>
        <p className="text-muted-foreground mt-2">
          You are manually listing a product on behalf of this seller. The product will belong to their store.
        </p>
      </div>
      <ProductForm 
        categories={categories} 
        brands={brands} 
        adminMode={true} 
        sellerId={sellerId} 
      />
    </div>
  );
}
