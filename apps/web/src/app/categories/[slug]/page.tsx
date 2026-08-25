
import { getCategoryBySlug, getProducts, getCategories } from '@/lib/api/catalog';
import { notFound, redirect } from 'next/navigation';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const category = await getCategoryBySlug(resolvedParams.slug).catch(() => null);
  
  if (!category) {
    return { title: 'Category Not Found | MyKart' };
  }

  return {
    title: `${category.name} | MyKart`,
    description: category.description,
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const category = await getCategoryBySlug(resolvedParams.slug);

  if (!category) {
    notFound();
  }

  const query = {
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    limit: 20,
    categorySlug: resolvedParams.slug,
    ...(resolvedSearchParams.sortBy && { sortBy: String(resolvedSearchParams.sortBy) }),
  };

  const [productsData, categoriesData] = await Promise.all([
    getProducts(query).catch(() => ({ items: [], meta: null })),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <CategorySidebar categories={categoriesData} currentCategorySlug={resolvedParams.slug} />
        
        <div className="flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-muted-foreground">{category.description}</p>
            )}
          </div>
          
          <Suspense fallback={<div className="animate-pulse bg-muted h-[400px] rounded-lg w-full" />}>
            <ProductGrid 
              products={productsData.items || []} 
              meta={productsData.meta} 
              searchParams={Object.fromEntries(Object.entries(resolvedSearchParams).map(([k, v]) => [k, String(v)]))} 
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

