/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ProductGridProps {
  products: any[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  searchParams?: Record<string, string>;
}

export function ProductGrid({ products, meta, searchParams = {} }: ProductGridProps) {
  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  const prevPageParams = new URLSearchParams(searchParams);
  if (meta && meta.page > 1) {
    prevPageParams.set('page', String(meta.page - 1));
  }
  
  const nextPageParams = new URLSearchParams(searchParams);
  if (meta && meta.page < meta.totalPages) {
    nextPageParams.set('page', String(meta.page + 1));
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t">
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
          <Button variant="outline" disabled={meta.page >= meta.totalPages} asChild={meta.page < meta.totalPages}>
            {meta.page < meta.totalPages ? (
              <Link href={`?${nextPageParams.toString()}`}>Next</Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

