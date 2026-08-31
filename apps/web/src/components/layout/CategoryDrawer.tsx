'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronRight, ChevronLeft, Flame, Sparkles, TrendingUp, Tag, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  children?: Array<{ id: string; name: string; slug: string }>;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'mobiles',
    name: 'Mobiles & Tablets',
    slug: 'mobiles',
    children: [
      { id: 'all-mobiles', name: 'All Mobile Phones', slug: 'mobiles' },
      { id: 'mobile-acc', name: 'Mobile Accessories', slug: 'mobile-accessories' },
      { id: 'cases', name: 'Cases & Covers', slug: 'cases-covers' },
      { id: 'screen-prot', name: 'Screen Protectors', slug: 'screen-protectors' },
      { id: 'power-banks', name: 'Power Banks', slug: 'power-banks' },
      { id: 'tablets', name: 'Tablets & iPads', slug: 'tablets' },
      { id: 'wearables', name: 'Wearable Devices & Smartwatches', slug: 'wearables' },
    ],
  },
  {
    id: 'computers',
    name: 'Computers & Accessories',
    slug: 'computers',
    children: [
      { id: 'all-laptops', name: 'All Laptops', slug: 'laptops' },
      { id: 'gaming-pc', name: 'Gaming Laptops & Desktops', slug: 'gaming' },
      { id: 'monitors', name: 'Monitors & Displays', slug: 'monitors' },
      { id: 'storage', name: 'Hard Drives & SSDs', slug: 'storage' },
      { id: 'keyboards', name: 'Keyboards & Mice', slug: 'keyboards' },
      { id: 'networking', name: 'Routers & Networking', slug: 'networking' },
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics & Audio',
    slug: 'electronics',
    children: [
      { id: 'headphones', name: 'Headphones & Earbuds', slug: 'headphones' },
      { id: 'speakers', name: 'Bluetooth Speakers', slug: 'speakers' },
      { id: 'cameras', name: 'Cameras & Photography', slug: 'cameras' },
      { id: 'tvs', name: 'Smart TVs & Soundbars', slug: 'tvs' },
      { id: 'home-audio', name: 'Home Theater Systems', slug: 'audio' },
    ],
  },
  {
    id: 'fashion',
    name: 'Fashion & Apparel',
    slug: 'fashion',
    children: [
      { id: 'mens', name: "Men's Clothing", slug: 'mens-fashion' },
      { id: 'womens', name: "Women's Clothing", slug: 'womens-fashion' },
      { id: 'footwear', name: 'Shoes & Footwear', slug: 'footwear' },
      { id: 'watches', name: 'Watches & Accessories', slug: 'watches' },
      { id: 'bags', name: 'Bags & Luggage', slug: 'bags' },
    ],
  },
  {
    id: 'home',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    children: [
      { id: 'kitchen', name: 'Kitchen & Dining', slug: 'kitchen' },
      { id: 'appliances', name: 'Small Home Appliances', slug: 'appliances' },
      { id: 'decor', name: 'Home Decor & Lighting', slug: 'decor' },
      { id: 'furniture', name: 'Furniture & Living', slug: 'furniture' },
    ],
  },
  {
    id: 'books',
    name: 'Books & Stationery',
    slug: 'books',
    children: [
      { id: 'fiction', name: 'Fiction & Literature', slug: 'fiction' },
      { id: 'tech-books', name: 'Technology & Programming', slug: 'tech-books' },
      { id: 'business', name: 'Business & Management', slug: 'business-books' },
      { id: 'stationery', name: 'Office Supplies & Notebooks', slug: 'stationery' },
    ],
  },
];

export function CategoryDrawer({ dynamicCategories = [] }: { dynamicCategories?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryItem | null>(null);

  // Combine dynamic categories with rich tree data
  const categoriesList: CategoryItem[] =
    dynamicCategories.length > 0
      ? dynamicCategories.map((c) => {
          const match = DEFAULT_CATEGORIES.find(
            (dc) => dc.slug === c.slug || dc.name.toLowerCase() === c.name.toLowerCase()
          );
          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            children: match?.children || [
              { id: `${c.slug}-all`, name: `All ${c.name}`, slug: c.slug },
            ],
          };
        })
      : DEFAULT_CATEGORIES;

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setActiveCategory(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open category menu"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">All Categories</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 flex w-full max-w-[340px] sm:max-w-[380px] flex-col bg-background shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between bg-primary px-5 py-3.5 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  <h3 className="font-bold text-base tracking-tight">Browse MyKart</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1 hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Multi-level Navigation Viewport */}
              <div className="relative flex-1 overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  {!activeCategory ? (
                    /* MAIN MENU VIEW */
                    <motion.div
                      key="main-menu"
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -30, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full overflow-y-auto px-4 py-4 space-y-6"
                    >
                      {/* Quick Deals & Highlights */}
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                          Trending & Deals
                        </h4>
                        <ul className="space-y-0.5">
                          <li>
                            <Link
                              href="/deals"
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                            >
                              <Tag className="h-4 w-4 text-red-500" />
                              <span>Today&apos;s Big Deals</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/products?sortBy=POPULARITY"
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                            >
                              <Flame className="h-4 w-4 text-amber-500" />
                              <span>Bestsellers</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/products?sortBy=NEWEST"
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                            >
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span>New Releases</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/products?dealType=TRENDING"
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                            >
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                              <span>Trending Items</span>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Shop By Category */}
                      <div className="border-t pt-4">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                          Shop By Category
                        </h4>
                        <ul className="space-y-0.5">
                          {categoriesList.map((category) => (
                            <li key={category.id || category.slug}>
                              <button
                                type="button"
                                onClick={() => setActiveCategory(category)}
                                className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors group text-left"
                              >
                                <span>{category.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ) : (
                    /* SUB-CATEGORY VIEW */
                    <motion.div
                      key={`sub-menu-${activeCategory.id}`}
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 30, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full overflow-y-auto px-4 py-4 space-y-4"
                    >
                      {/* Back to Main Menu Button */}
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors w-full"
                      >
                        <ChevronLeft className="h-4 w-4 stroke-[3]" />
                        <span>MAIN MENU</span>
                      </button>

                      {/* Subcategory Header */}
                      <div className="border-b pb-2 px-3">
                        <h4 className="text-base font-extrabold text-foreground tracking-tight">
                          {activeCategory.name}
                        </h4>
                      </div>

                      {/* Subcategory Links */}
                      <ul className="space-y-0.5">
                        {activeCategory.children && activeCategory.children.length > 0 ? (
                          activeCategory.children.map((child) => (
                            <li key={child.id || child.slug}>
                              <Link
                                href={`/products?categorySlug=${child.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary hover:text-primary transition-colors"
                              >
                                <span>{child.name}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li>
                            <Link
                              href={`/products?categorySlug=${activeCategory.slug}`}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              <span>All {activeCategory.name}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </Link>
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
