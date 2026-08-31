import { getProducts, getCategories, getBrands } from '@/lib/api/catalog';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { FilterSidebar } from '@/components/catalog/FilterSidebar';
import { MobileFilterDrawer } from '@/components/catalog/MobileFilterDrawer';
import { SortSelect } from '@/components/catalog/SortSelect';
import { Suspense } from 'react';
import { ArrowUpDown } from 'lucide-react';

export const metadata = {
  title: 'All Products | MyKart',
  description: 'Browse our complete catalog of curated essentials, electronics, fashion, and home goods.',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const query: Record<string, unknown> = {
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    limit: 20,
    ...(resolvedSearchParams.categorySlug && { categorySlug: String(resolvedSearchParams.categorySlug) }),
    ...(resolvedSearchParams.brandSlug && { brandSlug: String(resolvedSearchParams.brandSlug) }),
    ...(resolvedSearchParams.search && { search: String(resolvedSearchParams.search) }),
    ...(resolvedSearchParams.sortBy && { sortBy: String(resolvedSearchParams.sortBy) }),
    ...(resolvedSearchParams.minPrice && { minPrice: Number(resolvedSearchParams.minPrice) }),
    ...(resolvedSearchParams.maxPrice && { maxPrice: Number(resolvedSearchParams.maxPrice) }),
    ...(resolvedSearchParams.rating && { rating: Number(resolvedSearchParams.rating) }),
    ...(resolvedSearchParams.minDiscount && { minDiscount: Number(resolvedSearchParams.minDiscount) }),
    ...(resolvedSearchParams.inStock && { inStock: true }),
  };

  const [productsData, categoriesData, brandsData] = await Promise.all([
    getProducts(query).catch(() => ({ items: [], meta: null })),
    getCategories().catch(() => []),
    getBrands().catch(() => []),
  ]);

  const items = productsData.items || [];
  const meta = productsData.meta;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <FilterSidebar categories={categoriesData} brands={brandsData} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Header & Controls Bar */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {resolvedSearchParams.categorySlug
                    ? String(resolvedSearchParams.categorySlug).replace(/-/g, ' ').toUpperCase()
                    : 'All Products'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Showing <strong className="text-foreground">{items.length}</strong> {meta?.total ? `of ${meta.total}` : ''} products
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filter Drawer */}
                <div className="lg:hidden">
                  <MobileFilterDrawer categories={categoriesData} brands={brandsData} />
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <span className="text-xs text-muted-foreground hidden sm:block">Sort by:</span>
                  <SortSelect currentSort={String(resolvedSearchParams.sortBy || 'NEWEST')} />
                </div>
              </div>
            </div>

            <Suspense fallback={<div className="animate-pulse bg-muted h-[400px] rounded-lg w-full" />}>
              <ProductGrid
                products={items}
                meta={meta}
                searchParams={Object.fromEntries(
                  Object.entries(query).map(([k, v]) => [k, String(v)])
                )}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
