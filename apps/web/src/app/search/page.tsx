import { searchProducts } from '@/lib/api/search';
import { getCategories, getBrands } from '@/lib/api/catalog';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { SearchFilters } from '@/components/search/SearchFilters';
import { Suspense } from 'react';

export const metadata = {
  title: 'Search | MyKart',
  description: 'Search for products',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  
  const query = {
    q: resolvedSearchParams.q ? String(resolvedSearchParams.q) : '',
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    limit: 20,
    ...(resolvedSearchParams.category && { category: String(resolvedSearchParams.category) }),
    ...(resolvedSearchParams.brand && { brand: String(resolvedSearchParams.brand) }),
    ...(resolvedSearchParams.minPrice && { minPrice: String(resolvedSearchParams.minPrice) }),
    ...(resolvedSearchParams.maxPrice && { maxPrice: String(resolvedSearchParams.maxPrice) }),
    ...(resolvedSearchParams.sort && { sort: String(resolvedSearchParams.sort) }),
    ...(resolvedSearchParams.rating && { rating: String(resolvedSearchParams.rating) }),
    ...(resolvedSearchParams.status && { status: String(resolvedSearchParams.status) }),
  };

  const [productsData, categoriesData, brandsData] = await Promise.all([
    searchProducts(query).catch(() => ({ items: [], meta: null })),
    getCategories().catch(() => []),
    getBrands().catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        {query.q ? (
          <p className="mt-2 text-muted-foreground">
            Showing results for <span className="font-medium text-foreground">&quot;{query.q}&quot;</span>
            {productsData.meta && ` (${productsData.meta.total} found)`}
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            {productsData.meta ? `${productsData.meta.total} products found` : 'Enter a search term'}
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
      {/* SearchFilters uses useSearchParams(): Next.js requires a Suspense
          boundary around it, otherwise the route deopts to client rendering
          and the subtree can double-mount during hydration in dev. */}
      <Suspense fallback={<div className="w-full lg:w-64 shrink-0 animate-pulse rounded-lg bg-muted h-[420px]" />}>
        <SearchFilters categories={categoriesData} brands={brandsData} />
      </Suspense>
        
        <div className="flex-1 flex flex-col gap-6">
          <Suspense fallback={<div className="animate-pulse bg-muted h-[400px] rounded-lg w-full" />}>
            {productsData.items && productsData.items.length > 0 ? (
              <ProductGrid 
                products={productsData.items} 
                meta={productsData.meta} 
                searchParams={Object.fromEntries(Object.entries(resolvedSearchParams).map(([k, v]) => [k, String(v)]))} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-card text-center">
                <p className="text-lg font-semibold mb-2">No products found</p>
                <p className="text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
