import { getBrandBySlug, getProducts } from '@/lib/api/catalog';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { Suspense } from 'react';
import Image from 'next/image';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const brand = await getBrandBySlug(resolvedParams.slug).catch(() => null);
  
  if (!brand) {
    return { title: 'Brand Not Found | MyKart' };
  }

  return {
    title: `${brand.name} | MyKart`,
  };
}

export default async function BrandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const brand = await getBrandBySlug(resolvedParams.slug);

  if (!brand) {
    notFound();
  }

  const query = {
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    limit: 20,
    brandSlug: resolvedParams.slug,
    ...(resolvedSearchParams.sortBy && { sortBy: String(resolvedSearchParams.sortBy) }),
  };

  const productsData = await getProducts(query).catch(() => ({ items: [], meta: null }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center mb-12 py-8 border-b">
        {brand.logo && (
          <div className="relative w-32 h-32 mb-4">
            <Image src={brand.logo} alt={brand.name} fill className="object-contain" />
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight">{brand.name}</h1>
      </div>
      
      <div className="flex-1">
        <Suspense fallback={<div className="animate-pulse bg-muted h-[400px] rounded-lg w-full" />}>
          <ProductGrid 
            products={productsData.items || []} 
            meta={productsData.meta} 
            searchParams={Object.fromEntries(Object.entries(resolvedSearchParams).map(([k, v]) => [k, String(v)]))} 
          />
        </Suspense>
      </div>
    </div>
  );
}
