import { ProductForm } from '@/components/seller/ProductForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Edit Product | Seller Dashboard',
};

async function getProductAndOptions(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const [prodRes, catRes, brandRes] = await Promise.all([
    fetch(baseUrl + '/api/v1/products/' + slug, { cache: 'no-store' }),
    fetch(baseUrl + '/api/v1/categories', { cache: 'no-store' }),
    fetch(baseUrl + '/api/v1/brands', { cache: 'no-store' })
  ]);
  
  if (!prodRes.ok) return null;

  const product = await prodRes.json();
  const categories = catRes.ok ? await catRes.json() : [];
  const brands = brandRes.ok ? await brandRes.json() : [];
  
  return { product, categories, brands };
}

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const data = await getProductAndOptions(resolvedParams.slug);
  
  if (!data) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/seller/products" className="text-sm text-primary hover:underline mb-4 block">
        &larr; Back to Products
      </Link>
      <h1 className="text-3xl font-bold mb-8">Edit Product: {data.product.name}</h1>
      <ProductForm initialData={data.product} categories={data.categories} brands={data.brands} />
    </div>
  );
}
