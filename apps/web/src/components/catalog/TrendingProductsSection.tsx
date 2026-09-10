'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { ProductGrid } from './ProductGrid';

interface TrendingProductsSectionProps {
  initialProducts?: any[];
}

export function TrendingProductsSection({ initialProducts = [] }: TrendingProductsSectionProps) {
  const [products, setProducts] = useState<any[]>(initialProducts);

  useEffect(() => {
    if (!initialProducts.length) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mykart-ecommerce.onrender.com';
      fetch(`${apiUrl}/api/v1/products?limit=8&sortBy=RATING`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items?.length) {
            setProducts(data.items);
          }
        })
        .catch(() => {});
    }
  }, [initialProducts]);

  return <ProductGrid products={products} />;
}
