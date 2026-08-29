'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const STORAGE_KEY = 'mykart:recently-viewed';
const MAX_ITEMS = 8;

type RecentlyViewedItem = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

/**
 * Recently-viewed products, persisted client-side in localStorage.
 *
 * Deliberately stores only identity/navigation fields — never cached prices,
 * inventory, or variant data. The PDP always loads fresh data, so stale
 * prices and internal inventory are never shown. Deterministic and
 * explainable (most-recently-first, deduped, capped).
 */
export function RecentlyViewed({ currentProduct }: { currentProduct: { id: string; name: string; slug: string; image: string | null } }) {
  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    let stored: RecentlyViewedItem[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = [];
    }

    const entry: RecentlyViewedItem = {
      id: currentProduct.id,
      name: currentProduct.name,
      slug: currentProduct.slug,
      image: currentProduct.image,
    };
    const next = [
      entry,
      ...stored.filter((item) => item.id !== currentProduct.id),
    ].slice(0, MAX_ITEMS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — non-fatal */
    }

    // Render the previously-viewed products (exclude the one just viewed).
    setRecent(next.filter((item) => item.id !== currentProduct.id));
  }, [currentProduct.id]);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="mt-24 pt-12 border-t border-border/50">
      <h2 className="text-2xl font-bold tracking-tight mb-8">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {recent.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug}`}
            className="group rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-primary/40"
          >
            <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                  {item.name}
                </div>
              )}
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {item.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}