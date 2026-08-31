'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Star, X, Check, Search, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { formatPrice } from '@/lib/pricing';

interface FilterSidebarProps {
  categories?: any[];
  brands?: any[];
  currentCategorySlug?: string;
  className?: string;
}

const DISCOUNT_OPTIONS = [
  { label: '10% off or more', value: '10' },
  { label: '20% off or more', value: '20' },
  { label: '30% off or more', value: '30' },
  { label: '40% off or more', value: '40' },
  { label: '50% off or more', value: '50' },
  { label: '60% off or more', value: '60' },
  { label: '70% off or more', value: '70' },
];

const PRICE_PRESETS = [
  { label: 'Under ₹1,000', min: '0', max: '1000' },
  { label: '₹1,000 – ₹5,000', min: '1000', max: '5000' },
  { label: '₹5,000 – ₹15,000', min: '5000', max: '15000' },
  { label: '₹15,000 – ₹50,000', min: '15000', max: '50000' },
  { label: 'Over ₹50,000', min: '50000', max: '' },
];

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
  const activeDiscount = searchParams.get('minDiscount') || '';
  const activeMinPrice = searchParams.get('minPrice') || '';
  const activeMaxPrice = searchParams.get('maxPrice') || '';
  const activeInStock = searchParams.get('inStock') === 'true';

  // Local UI states
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState(activeMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(activeMaxPrice);

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

  const toggleBrand = (brandSlug: string) => {
    let nextBrands: string[];
    if (activeBrands.includes(brandSlug)) {
      nextBrands = activeBrands.filter((b) => b !== brandSlug);
    } else {
      nextBrands = [...activeBrands, brandSlug];
    }
    updateFilters({ brandSlug: nextBrands.length > 0 ? nextBrands.join(',') : null });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      minPrice: minPriceInput || null,
      maxPrice: maxPriceInput || null,
    });
  };

  const clearAllFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters =
    Boolean(activeCategory) ||
    activeBrands.length > 0 ||
    Boolean(activeRating) ||
    Boolean(activeDiscount) ||
    Boolean(activeMinPrice) ||
    Boolean(activeMaxPrice) ||
    activeInStock;

  return (
    <div className={`flex flex-col gap-6 text-sm ${className} ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Header & Clear Filter */}
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold text-base text-foreground tracking-tight">Filters</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear All</span>
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
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Brand</h4>
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
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Customer Reviews</h4>
        <div className="space-y-1.5">
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

      {/* Price Range Filter */}
      <div className="flex flex-col gap-2.5 border-t pt-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Price</h4>

        {/* Quick presets */}
        <div className="space-y-1">
          {PRICE_PRESETS.map((preset, idx) => {
            const isSelected = activeMinPrice === preset.min && activeMaxPrice === preset.max;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMinPriceInput(preset.min);
                  setMaxPriceInput(preset.max);
                  updateFilters({
                    minPrice: preset.min || null,
                    maxPrice: preset.max || null,
                  });
                }}
                className={`w-full text-left rounded px-2 py-1 text-xs transition-colors ${
                  isSelected ? 'font-bold text-primary bg-primary/10' : 'text-foreground hover:bg-muted'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Manual Inputs */}
        <form onSubmit={handlePriceSubmit} className="flex items-center gap-2 pt-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₹</span>
            <input
              type="number"
              placeholder="Min"
              min="0"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="h-8 w-full rounded-md border bg-background pl-6 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="text-xs text-muted-foreground">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₹</span>
            <input
              type="number"
              placeholder="Max"
              min="0"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="h-8 w-full rounded-md border bg-background pl-6 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="h-8 rounded-md bg-secondary border px-3 text-xs font-semibold hover:bg-foreground hover:text-background transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {/* Discount Filter */}
      <div className="flex flex-col gap-2.5 border-t pt-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Discount</h4>
        <div className="space-y-1">
          {DISCOUNT_OPTIONS.map((opt) => {
            const isSelected = activeDiscount === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilters({ minDiscount: isSelected ? null : opt.value })}
                className={`w-full text-left rounded-md px-2 py-1 text-xs transition-colors ${
                  isSelected ? 'font-bold text-primary bg-primary/10' : 'text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability Filter */}
      <div className="flex flex-col gap-2.5 border-t pt-4 pb-2">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Availability</h4>
        <label className="flex items-center gap-2.5 cursor-pointer py-1 px-1 rounded hover:bg-muted/50 transition-colors">
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
