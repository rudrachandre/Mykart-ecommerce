'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SearchFilters({ categories = [], brands = [] }: { categories?: any[], brands?: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [rating, setRating] = useState(searchParams.get('rating') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [onSale, setOnSale] = useState(searchParams.get('onSale') || '');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');
    
    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');
    
    if (sort) params.set('sort', sort);
    else params.delete('sort');

    if (category) params.set('category', category);
    else params.delete('category');

    if (brand) params.set('brand', brand);
    else params.delete('brand');

    if (rating) params.set('rating', rating);
    else params.delete('rating');

    if (status) params.set('status', status);
    else params.delete('status');

    if (onSale) params.set('onSale', onSale);
    else params.delete('onSale');
    
    params.set('page', '1');
    
    router.push(`/search?${params.toString()}`);
  };

  const handleClear = () => {
    setMinPrice('');
    setMaxPrice('');
    setSort('');
    setCategory('');
    setBrand('');
    setRating('');
    setStatus('');
    setOnSale('');

    const params = new URLSearchParams(searchParams.toString());
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('sort');
    params.delete('category');
    params.delete('brand');
    params.delete('rating');
    params.delete('status');
    params.delete('onSale');
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="w-full lg:w-64 shrink-0">
      <div className="sticky top-24 rounded-lg border bg-card p-5 shadow-sm space-y-6">
        <h3 className="font-semibold text-lg border-b pb-2">Filters</h3>
        <form onSubmit={handleApply} className="space-y-6">
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Category</h4>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Brand</h4>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Price Range</h4>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Rating</h4>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Any Rating</option>
              <option value="4">4 Stars & Up</option>
              <option value="3">3 Stars & Up</option>
              <option value="2">2 Stars & Up</option>
            </select>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Availability</h4>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Any Status</option>
              <option value="ACTIVE">In Stock</option>
            </select>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">On Sale</h4>
            <select
              value={onSale}
              onChange={(e) => setOnSale(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Any</option>
              <option value="true">On Sale</option>
            </select>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Sort By</h4>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Relevance</option>
              <option value="basePrice:asc">Price: Low to High</option>
              <option value="basePrice:desc">Price: High to Low</option>
              <option value="rating:desc">Top Rated</option>
              <option value="reviewCount:desc">Most Popular</option>
              <option value="salePrice:asc">Sale Price: Low to High</option>
              <option value="salePrice:desc">Sale Price: High to Low</option>
              <option value="createdAt:desc">Newest Arrivals</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" className="w-full font-medium">Apply Filters</Button>
            <Button type="button" variant="outline" className="w-full text-muted-foreground hover:text-foreground" onClick={handleClear}>Clear All</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
