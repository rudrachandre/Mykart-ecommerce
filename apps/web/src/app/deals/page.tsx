import { getProducts, getCategories, getBrands } from '@/lib/api/catalog';
import { DealProductCard } from '@/components/deals/DealProductCard';
import { FilterSidebar } from '@/components/catalog/FilterSidebar';
import { MobileFilterDrawer } from '@/components/catalog/MobileFilterDrawer';
import { Sparkles, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: "Today's Big Deals & Limited Offers | MyKart",
  description: 'Shop limited time lightning deals, biggest discounts, and special offers across top categories.',
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const query: Record<string, unknown> = {
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    limit: 20,
    onSale: true,
    ...(resolvedSearchParams.categorySlug && { categorySlug: String(resolvedSearchParams.categorySlug) }),
    ...(resolvedSearchParams.brandSlug && { brandSlug: String(resolvedSearchParams.brandSlug) }),
    ...(resolvedSearchParams.search && { search: String(resolvedSearchParams.search) }),
    ...(resolvedSearchParams.sortBy && { sortBy: String(resolvedSearchParams.sortBy) }),
    ...(resolvedSearchParams.minPrice && { minPrice: Number(resolvedSearchParams.minPrice) }),
    ...(resolvedSearchParams.maxPrice && { maxPrice: Number(resolvedSearchParams.maxPrice) }),
    ...(resolvedSearchParams.rating && { rating: Number(resolvedSearchParams.rating) }),
    ...(resolvedSearchParams.inStock && { inStock: true }),
    ...(resolvedSearchParams.dealType && { dealType: String(resolvedSearchParams.dealType) }),
  };

  const [productsData, categoriesData, brandsData] = await Promise.all([
    getProducts(query).catch(() => ({ items: [], meta: null })),
    getCategories().catch(() => []),
    getBrands().catch(() => []),
  ]);

  const items = productsData.items || [];
  const meta = productsData.meta;

  const searchParamsRecord = Object.fromEntries(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  );

  const prevPageParams = new URLSearchParams(searchParamsRecord);
  if (meta && meta.page > 1) {
    prevPageParams.set('page', String(meta.page - 1));
  }

  const nextPageParams = new URLSearchParams(searchParamsRecord);
  if (meta && meta.page < meta.totalPages) {
    nextPageParams.set('page', String(meta.page + 1));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Deals Header Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-background to-primary/5 border-b py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Exclusive Promotions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Today&apos;s Big Deals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-2xl">
            Save big on curated electronics, mobile devices, accessories, fashion, and home essentials.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <FilterSidebar
              categories={categoriesData}
              brands={brandsData}
            />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Showing <strong className="text-foreground">{items.length}</strong> {meta?.total ? `of ${meta.total}` : ''} deals
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filter Drawer Trigger */}
                <div className="lg:hidden">
                  <MobileFilterDrawer categories={categoriesData} brands={brandsData} />
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <span className="text-xs text-muted-foreground hidden sm:block">Sort by:</span>
                  <SortSelect currentSort={String(resolvedSearchParams.sortBy || 'NEWEST')} />
                </div>
              </div>
            </div>

            {/* Deals Grid */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border rounded-2xl bg-card p-8">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-foreground">No deals match your current filters</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Try clearing some filters or changing your price range to discover more discounts.
                </p>
                <Link
                  href="/deals"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Reset All Filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {items.map((product: any, idx: number) => (
                  <DealProductCard key={product.id || idx} product={product} priority={idx < 4} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-10 mt-10 border-t">
                <Button variant="outline" disabled={meta.page <= 1} asChild={meta.page > 1}>
                  {meta.page > 1 ? (
                    <Link href={`?${prevPageParams.toString()}`}>Previous</Link>
                  ) : (
                    <span>Previous</span>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={meta.page >= meta.totalPages}
                  asChild={meta.page < meta.totalPages}
                >
                  {meta.page < meta.totalPages ? (
                    <Link href={`?${nextPageParams.toString()}`}>Next</Link>
                  ) : (
                    <span>Next</span>
                  )}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function SortSelect({ currentSort }: { currentSort: string }) {
  return (
    <form method="GET">
      <select
        defaultValue={currentSort}
        name="sortBy"
        aria-label="Sort products by"
        className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.submit();
        }}
      >
        <option value="NEWEST">Newest</option>
        <option value="DISCOUNT_DESC">Biggest Discount</option>
        <option value="POPULARITY">Popularity</option>
        <option value="PRICE_ASC">Price: Low to High</option>
        <option value="PRICE_DESC">Price: High to Low</option>
        <option value="RATING">Highest Rated</option>
      </select>
    </form>
  );
}
