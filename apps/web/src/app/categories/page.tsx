/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCategories } from '@/lib/api/catalog';
import Link from 'next/link';

export const metadata = {
  title: 'Categories | MyKart',
  description: 'Browse all categories',
};

export default async function CategoriesPage() {
  const categories = await getCategories().catch(() => []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Categories</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category: any) => (
          <Link 
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group flex flex-col p-6 rounded-lg border bg-card hover:border-foreground/50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:underline">{category.name}</h2>
            {category.description && (
              <p className="text-muted-foreground line-clamp-2">{category.description}</p>
            )}
            {category.children && category.children.length > 0 && (
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                {category.children.length} subcategories
              </p>
            )}
          </Link>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No categories available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}

