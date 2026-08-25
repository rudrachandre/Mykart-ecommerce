/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';

interface CategorySidebarProps {
  categories: any[];
  currentCategorySlug?: string;
}

export function CategorySidebar({ categories, currentCategorySlug }: CategorySidebarProps) {
  if (!categories || categories.length === 0) return null;

    return (
    <div className="w-full md:w-64 shrink-0">
      <div className="sticky top-20 rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-4 font-semibold">Categories</h3>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className={`block text-sm hover:text-foreground transition-colors ${
                  currentCategorySlug === category.slug
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {category.name}
              </Link>
              {category.children && category.children.length > 0 && (
                <ul className="mt-2 ml-4 space-y-2 border-l pl-4">
                  {category.children.map((child: any) => (
                    <li key={child.id}>
                      <Link
                        href={`/categories/${child.slug}`}
                        className={`block text-sm hover:text-foreground transition-colors ${
                          currentCategorySlug === child.slug
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CategorySidebarSkeleton() {
    return (
    <div className="w-full md:w-64 shrink-0">
      <div className="sticky top-20 rounded-lg border bg-card p-4 shadow-sm h-[400px]">
        <div className="h-5 w-24 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

