import { getProducts, getCategories } from '@/lib/api/catalog';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { HeroBanner } from '@/components/marketing/hero-banner';
import { CategoryShortcuts } from '@/components/marketing/CategoryShortcuts';
import { FeaturedCategories } from '@/components/marketing/featured-categories';
import { DealsBanner } from '@/components/marketing/deals-banner';
import { TestimonialsSection } from '@/components/marketing/testimonials';
import { NewsletterSection } from '@/components/marketing/newsletter';
import { TodaysDealsSection } from '@/components/deals/TodaysDealsSection';

export const metadata = {
  title: 'MyKart — Curated everyday essentials',
  description:
    'Thoughtfully designed pieces from independent makers. Shop categories, trending products and limited-time offers.',
};

export default async function Home() {
  const [deals, trending, categories] = await Promise.all([
    getProducts({ limit: 8, onSale: true }).catch(() => ({ items: [] })),
    getProducts({ limit: 8, sortBy: 'RATING' }).catch(() => ({ items: [] })),
    getCategories().catch(() => []),
  ]);

  const dealProducts = ((deals as any).items?.length > 0) 
    ? (deals as any).items 
    : ((trending as any).items ?? []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 1. HeroBanner */}
      <HeroBanner />

      {/* 2. Category Shortcuts Bar */}
      <CategoryShortcuts />

      {/* 3. Today's Big Deals Discovery Section */}
      <TodaysDealsSection
        initialProducts={dealProducts}
        categories={categories as any[]}
      />

      {/* 4. FeaturedCategories */}
      <FeaturedCategories
        categories={((categories ?? []) as unknown as Array<{
          id: string;
          name: string;
          slug: string;
          _count?: { products?: number };
        }>).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: c._count?.products ?? null,
        }))}
      />

      {/* 5. Trending Right Now */}
      <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Trending Right Now
          </h2>
          <p className="text-base text-muted-foreground">
            Our community&apos;s favorite pieces this week
          </p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ProductGrid products={(trending as any).items ?? []} />
      </section>

      {/* 6. DealsBanner */}
      <DealsBanner />

      {/* 7. Testimonials */}
      <TestimonialsSection />

      {/* 8. Newsletter */}
      <NewsletterSection />
    </div>
  );
}