import { ProductForm } from '@/components/seller/ProductForm';
import Link from 'next/link';

export const metadata = {
  title: 'Add New Product | Seller Dashboard',
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

export default async function NewProductPage() {
  const { categories, brands } = await getOptions();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/seller/products" className="text-sm text-primary hover:underline mb-4 block">
        &larr; Back to Products
      </Link>
      <h1 className="text-3xl font-bold mb-8">Add New Product</h1>
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
