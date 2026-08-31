'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterSidebar } from './FilterSidebar';
import { useSearchParams } from 'next/navigation';

interface MobileFilterDrawerProps {
  categories?: any[];
  brands?: any[];
}

export function MobileFilterDrawer({ categories = [], brands = [] }: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  // Close drawer on URL change
  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
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

            {/* Slide-over Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col bg-background shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-bold text-base text-foreground">Filter & Sort</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <FilterSidebar categories={categories} brands={brands} />
              </div>

              {/* Drawer Footer */}
              <div className="border-t p-4 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
