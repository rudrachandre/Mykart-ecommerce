/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBrands } from '@/lib/api/catalog';
import Link from 'next/link';

export const metadata = {
  title: 'Brands | MyKart',
  description: 'Browse our partner brands',
};

const FALLBACK_BRANDS = [
  { id: 'b-1', name: 'Apple', slug: 'apple' },
  { id: 'b-2', name: 'Samsung', slug: 'samsung' },
  { id: 'b-3', name: 'Sony', slug: 'sony' },
  { id: 'b-4', name: 'Dell', slug: 'dell' },
  { id: 'b-5', name: 'ASUS', slug: 'asus' },
  { id: 'b-6', name: 'Razer', slug: 'razer' },
  { id: 'b-7', name: 'Nike', slug: 'nike' },
  { id: 'b-8', name: 'Adidas', slug: 'adidas' },
  { id: 'b-9', name: 'Puma', slug: 'puma' },
  { id: 'b-10', name: "Levi's", slug: 'levis' },
  { id: 'b-11', name: 'Lakme', slug: 'lakme' },
  { id: 'b-12', name: 'Maybelline', slug: 'maybelline' },
  { id: 'b-13', name: 'Ray-Ban', slug: 'rayban' },
  { id: 'b-14', name: 'MSI', slug: 'msi' },
  { id: 'b-15', name: 'Logitech', slug: 'logitech' },
  { id: 'b-16', name: 'JBL', slug: 'jbl' },
  { id: 'b-17', name: 'Nintendo', slug: 'nintendo' },
  { id: 'b-18', name: 'Philips', slug: 'philips' },
];

export default async function BrandsPage() {
  const fetchedBrands = await getBrands().catch(() => []);
  const brands = fetchedBrands && fetchedBrands.length > 0 ? fetchedBrands : FALLBACK_BRANDS;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Brands</h1>
      <p className="text-muted-foreground mb-8">Browse products from top global and domestic marketplace brands.</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {brands.map((brand: any) => (
          <Link 
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="group flex flex-col items-center justify-center p-6 rounded-lg border bg-card hover:border-foreground/50 transition-colors aspect-square text-center shadow-xs"
          >
            <span className="text-lg font-semibold group-hover:underline text-foreground">{brand.name}</span>
            <span className="text-xs text-muted-foreground mt-2">Browse catalog →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}


