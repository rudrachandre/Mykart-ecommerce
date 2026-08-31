'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Star, Check, Search, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { DualRangeSlider } from '@/components/ui/DualRangeSlider';

interface FilterSidebarProps {
  categories?: any[];
  brands?: any[];
  currentCategorySlug?: string;
  className?: string;
}

export function FilterSidebar({
  categories = [],
  brands = [],
  className = '',
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Active filter states from URL
  const activeCategory = searchParams.get('categorySlug') || '';
  const activeBrands = searchParams.get('brandSlug')?.split(',').filter(Boolean) || [];
  const activeRating = searchParams.get('rating') || '';
  const activeMinDiscount = searchParams.get('minDiscount') ? Number(searchParams.get('minDiscount')) : 0;
  const activeMaxDiscount = searchParams.get('maxDiscount') ? Number(searchParams.get('maxDiscount')) : 100;
  const activeMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0;
  const activeMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 500000;
  const activeInStock = searchParams.get('inStock') === 'true';

  // Local UI states
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  const filteredBrands = brands.filter((b) =>
    (b.name || '').toLowerCase().includes(brandSearch.toLowerCase())
  );
  const displayedBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 7);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page'); // Reset to page 1 on filter change

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters =
    Boolean(activeCategory) ||
    activeBrands.length > 0 ||
    Boolean(activeRating) ||
    activeMinDiscount > 0 ||
    activeMaxDiscount < 100 ||
    activeMinPrice > 0 ||
    activeMaxPrice < 500000 ||
    activeInStock;

  const formatPriceLabel = (v: number) => `₹${v.toLocaleString('en-IN')}`;
  const formatDiscountLabel = (v: number) => `${v}%`;

  return (
    <div className={`flex flex-col gap-6 text-sm ${className} ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Header & Clear Filter */}
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold text-base text-foreground tracking-tight">FILTERED BY</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Category</h4>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <li>
              <button
                type="button"
                onClick={() => updateFilters({ categorySlug: null })}
                className={`w-full text-left rounded-md px-2 py-1 transition-colors ${
                  !activeCategory
                    ? 'font-bold text-primary bg-primary/10'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                All Categories
              </button>
            </li>
            {categories.map((c) => {
              const isSelected = activeCategory === c.slug;
              return (
                <li key={c.id || c.slug}>
                  <button
                    type="button"
                    onClick={() => updateFilters({ categorySlug: c.slug })}
                    className={`w-full text-left rounded-md px-2 py-1 transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'font-bold text-primary bg-primary/10'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    {c._count?.products !== undefined && (
                      <span className="text-[11px] text-muted-foreground ml-1">
                        ({c._count.products})
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Brands Filter */}
      {brands.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t pt-4">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">BRANDS</h4>
          {brands.length > 6 && (
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {displayedBrands.map((b) => {
              const isChecked = activeBrands.includes(b.slug);
              return (
                <label
                  key={b.id || b.slug}
                  className="flex items-center gap-2.5 cursor-pointer py-1 px-1 rounded hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      let nextBrands: string[];
                      if (isChecked) {
                        nextBrands = activeBrands.filter((item) => item !== b.slug);
                      } else {
                        nextBrands = [...activeBrands, b.slug];
                      }
                      updateFilters({ brandSlug: nextBrands.length > 0 ? nextBrands.join(',') : null });
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isChecked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs text-foreground truncate">{b.name}</span>
                </label>
              );
            })}
          </div>

          {filteredBrands.length > 7 && (
            <button
              type="button"
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1 self-start"
            >
              {showAllBrands ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>See more ({filteredBrands.length - 7})</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Customer Reviews Filter */}
      <div className="flex flex-col gap-2.5 border-t pt-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">CUSTOMER REVIEWS</h4>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateFilters({ rating: null })}
            className={`w-full text-left rounded-md px-2 py-1 text-xs transition-colors ${
              !activeRating ? 'font-bold text-primary bg-primary/10' : 'hover:bg-muted text-foreground'
            }`}
          >
            All Ratings
          </button>
          {[4, 3, 2, 1].map((stars) => {
            const isSelected = activeRating === String(stars);
            return (
              <button
                key={stars}
                type="button"
                onClick={() => updateFilters({ rating: isSelected ? null : String(stars) })}
                className={`flex items-center gap-2 w-full text-left rounded-md px-2 py-1 transition-colors ${
                  isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs">& Up</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Dual Slider */}
      <div className="flex flex-col gap-2.5 border-t pt-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">PRICE</h4>
        <DualRangeSlider
          min={0}
          max={500000}
          step={500}
          value={[activeMinPrice, activeMaxPrice]}
          formatLabel={formatPriceLabel}
          onChange={([minVal, maxVal]) => {
            updateFilters({
              minPrice: minVal > 0 ? String(minVal) : null,
              maxPrice: maxVal < 500000 ? String(maxVal) : null,
            });
          }}
        />
      </div>

      {/* Discount Dual Slider */}
      <div className="flex flex-col gap-2.5 border-t pt-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">DISCOUNT</h4>
        <DualRangeSlider
          min={0}
          max={100}
          step={1}
          value={[activeMinDiscount, activeMaxDiscount]}
          formatLabel={formatDiscountLabel}
          onChange={([minVal, maxVal]) => {
            updateFilters({
              minDiscount: minVal > 0 ? String(minVal) : null,
              maxDiscount: maxVal < 100 ? String(maxVal) : null,
            });
          }}
        />
      </div>

      {/* Availability Filter */}
      <div className="flex flex-col gap-2.5 border-t pt-4 pb-2">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">AVAILABILITY</h4>
        <label className="flex items-center gap-2.5 cursor-pointer py-1 px-1 rounded hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={activeInStock}
            onChange={() => updateFilters({ inStock: activeInStock ? null : 'true' })}
            className="sr-only"
          />
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
              activeInStock ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
            }`}
          >
            {activeInStock && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
          <span className="text-xs text-foreground">In Stock Only</span>
        </label>
      </div>
    </div>
  );
}
