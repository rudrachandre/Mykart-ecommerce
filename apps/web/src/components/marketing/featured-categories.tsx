'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type CategoryCardData = {
  id: string;
  name: string;
  slug: string;
  count?: number | null;
};

/** Stable decorative photography per common slug; falls back to warm surface. */
const cover: Record<string, string> = {
  electronics:
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1200&auto=format&fit=crop',
  mobiles:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
  'laptops-computers':
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop',
  fashion:
    'https://images.unsplash.com/photo-1489987707025-afc232f7bdaf?q=80&w=1200&auto=format&fit=crop',
  'home-kitchen':
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=1200&auto=format&fit=crop',
  beauty:
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1200&auto=format&fit=crop',
  grocery:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop',
  sports:
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop',
  books:
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1200&auto=format&fit=crop',
  toys:
    'https://images.unsplash.com/photo-1558060370-d644479cb6f7?q=80&w=1200&auto=format&fit=crop',
  'home-decor':
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop',
  accessories:
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop',
};

/**
 * Figma §13 — section header row (title+subtitle left, "View All →" right)
 * over a 4-col grid of 320px image cards with dark overlay + bottom-left text.
 */
export function FeaturedCategories({ categories }: { categories: CategoryCardData[] }) {
  if (!categories?.length) return null;
  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 md:px-10 xl:px-20 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[32px]">
            Shop by Category
          </h2>
          <p className="text-base text-muted-foreground">
            Find exactly what your space is missing
          </p>
        </div>
        <Link
          href="/categories"
          className="group inline-flex items-center gap-2 font-display text-sm font-semibold text-foreground"
        >
          View All Categories
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {categories.slice(0, 4).map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '80px' }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
            className="min-w-0"
          >
            <Link
              href={`/products?category=${cat.slug}`}
              className="group relative block h-64 overflow-hidden rounded-2xl bg-secondary md:h-[320px]"
            >
              {cover[cat.slug] ? (
                <Image
                  src={cover[cat.slug]}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                />
              ) : null}
              <span aria-hidden="true" className="absolute inset-0 bg-[rgba(17,17,17,0.30)] transition-colors duration-200 group-hover:bg-[rgba(17,17,17,0.20)]" />
              <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-6">
                <span className="font-display text-xl font-semibold text-white md:text-2xl">{cat.name}</span>
                {typeof cat.count === 'number' && (
                  <span className="text-sm text-white/80">{cat.count} products</span>
                )}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}