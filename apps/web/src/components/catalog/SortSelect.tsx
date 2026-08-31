'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function SortSelect({ currentSort = 'NEWEST' }: { currentSort?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', e.target.value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <select
      value={currentSort}
      name="sortBy"
      aria-label="Sort products by"
      className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground cursor-pointer"
      onChange={handleSortChange}
    >
      <option value="NEWEST">Newest</option>
      <option value="POPULARITY">Popularity</option>
      <option value="PRICE_ASC">Price: Low to High</option>
      <option value="PRICE_DESC">Price: High to Low</option>
      <option value="RATING">Highest Rated</option>
      <option value="DISCOUNT_DESC">Biggest Discount</option>
    </select>
  );
}
