import { getProducts, getCategories } from '@/lib/api/catalog';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { Suspense } from 'react';

export const metadata = {
  title: 'Products | MyKart',
  description: 'Browse our collection of products',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  
  const query = {
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    limit: 20,
    ...(resolvedSearchParams.categorySlug && { categorySlug: String(resolvedSearchParams.categorySlug) }),
    ...(resolvedSearchParams.brandSlug && { brandSlug: String(resolvedSearchParams.brandSlug) }),
    ...(resolvedSearchParams.search && { search: String(resolvedSearchParams.search) }),
    ...(resolvedSearchParams.sortBy && { sortBy: String(resolvedSearchParams.sortBy) }),
  };

  const [productsData, categoriesData] = await Promise.all([
    getProducts(query).catch(() => ({ items: [], meta: null })),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <CategorySidebar categories={categoriesData} currentCategorySlug={query.categorySlug} />
        
        <div className="flex-1">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          </div>
          
          <Suspense fallback={<div className="animate-pulse bg-muted h-[400px] rounded-lg w-full" />}>
            <ProductGrid 
              products={productsData.items || []} 
              meta={productsData.meta} 
              searchParams={Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))} 
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
