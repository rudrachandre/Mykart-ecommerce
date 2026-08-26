import { getProducts, getCategories } from '@/lib/api/catalog';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { HeroBanner } from '@/components/marketing/hero-banner';
import { FeaturedCategories } from '@/components/marketing/featured-categories';
import { DealsBanner } from '@/components/marketing/deals-banner';
import { TestimonialsSection } from '@/components/marketing/testimonials';
import { NewsletterSection } from '@/components/marketing/newsletter';

export const metadata = {
  title: 'mykart — Curated everyday essentials',
  description:
    'Thoughtfully designed pieces from independent makers. Shop categories, trending products and limited-time offers.',
};

export default async function Home() {
  const [trending, categories] = await Promise.all([
    getProducts({ limit: 8, sortBy: 'RATING' }).catch(() => ({ items: [] })),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Figma §12 — HeroBanner */}
      <HeroBanner />

      {/* Figma §13 — FeaturedCategories */}
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

      {/* Figma §14 — Trending Right Now */}
      <section className="mx-auto w-full max-w-[1280px] px-5 py-12 md:px-10 md:py-16 xl:px-20">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[32px]">
            Trending Right Now
          </h2>
          <p className="text-base text-muted-foreground">
            Our community&apos;s favorite pieces this week
          </p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ProductGrid products={(trending as any).items ?? []} />
      </section>

      {/* Figma §20 — DealsBanner */}
      <DealsBanner />

      {/* Figma §21 — Testimonials */}
      <TestimonialsSection />

      {/* Figma §22 — Newsletter (border-y provides the full-perimeter hairline) */}
      <NewsletterSection />
    </div>
  );
}