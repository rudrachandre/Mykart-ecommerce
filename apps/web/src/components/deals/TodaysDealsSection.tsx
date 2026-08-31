'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { DealProductCard, DealProductCardSkeleton } from './DealProductCard';

export interface DealTab {
  id: string;
  label: string;
  categorySlug?: string;
  dealType?: string;
}

const DEAL_TABS: DealTab[] = [
  { id: 'all', label: 'All Deals' },
  { id: 'trending', label: 'Trending', dealType: 'TRENDING' },
  { id: 'most-loved', label: "Customer's most loved", dealType: 'MOST_LOVED' },
  { id: 'lightning', label: 'Lightning Deals', dealType: 'LIGHTNING' },
  { id: 'mobiles', label: 'Mobiles', categorySlug: 'smartphones' },
  { id: 'electronics', label: 'Electronics', categorySlug: 'electronics' },
  { id: 'accessories', label: 'Mobile Accessories', categorySlug: 'mobile-accessories' },
  { id: 'appliances', label: 'Home Appliances', categorySlug: 'home-appliances' },
  { id: 'fashion', label: 'Fashion', categorySlug: 'fashion' },
  { id: 'home', label: 'Home & Kitchen', categorySlug: 'home-kitchen' },
];

interface TodaysDealsSectionProps {
  initialProducts?: any[];
  categories?: any[];
}

export function TodaysDealsSection({ initialProducts = [] }: TodaysDealsSectionProps) {
  const [activeTabId, setActiveTabId] = useState<string>('all');
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [loading, setLoading] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll boundary
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const handleTabChange = async (tab: DealTab) => {
    setActiveTabId(tab.id);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const params = new URLSearchParams();
      params.append('limit', '8');

      if (tab.categorySlug) {
        params.append('categorySlug', tab.categorySlug);
      }
      if (tab.dealType) {
        params.append('dealType', tab.dealType);
      } else {
        params.append('onSale', 'true');
      }

      const res = await fetch(`${apiUrl}/api/v1/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setProducts(items.length > 0 ? items : initialProducts);
      } else {
        setProducts(initialProducts);
      }
    } catch {
      setProducts(initialProducts);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full bg-gradient-to-b from-secondary/30 to-background py-10 sm:py-14 border-y border-border/50">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs sm:text-sm uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Limited Time Offers</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Today&apos;s Big Deals
            </h2>
          </div>

          <Link
            href="/deals"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline self-start sm:self-auto"
          >
            <span>Browse more deals</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Category Tabs with Left/Right Arrows */}
        <div className="relative mb-6">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Scroll tabs left"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background/95 shadow-md backdrop-blur text-foreground hover:bg-secondary transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {DEAL_TABS.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Scroll tabs right"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background/95 shadow-md backdrop-blur text-foreground hover:bg-secondary transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <DealProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold">No deals found in this category</h3>
            <p className="text-sm text-muted-foreground mt-1">Check back soon for new lightning deals and discounts.</p>
            <button
              type="button"
              onClick={() => handleTabChange(DEAL_TABS[0])}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              View All Deals
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {products.slice(0, 8).map((product, idx) => (
              <DealProductCard key={product.id || idx} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
