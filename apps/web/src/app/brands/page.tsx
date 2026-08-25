/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBrands } from '@/lib/api/catalog';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Brands | MyKart',
  description: 'Browse our partner brands',
};

export default async function BrandsPage() {
  const brands = await getBrands().catch(() => []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Brands</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {brands.map((brand: any) => (
          <Link 
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="group flex flex-col items-center justify-center p-6 rounded-lg border bg-card hover:border-foreground/50 transition-colors aspect-square"
          >
            {brand.logo ? (
              <div className="relative w-full h-full p-4">
                <Image src={brand.logo} alt={brand.name} fill className="object-contain" />
              </div>
            ) : (
              <h2 className="text-xl font-semibold text-center group-hover:underline">{brand.name}</h2>
            )}
          </Link>
        ))}
        {brands.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No brands available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}

