/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProductBySlug, getProducts } from '@/lib/api/catalog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductReviews } from '@/components/catalog/ProductReviews';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { ProductActions } from '@/components/catalog/ProductActions';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { RecentlyViewed } from '@/components/catalog/RecentlyViewed';
import { ChevronLeft, Star, Truck, RefreshCcw, ShieldCheck } from 'lucide-react';
import * as motion from 'framer-motion/client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const product = await getProductBySlug(resolvedParams.slug).catch(() => null);
  
  if (!product) {
    return { title: 'Product Not Found | MyKart' };
  }

  return {
    title: `${product.name} | MyKart`,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params;
  const product = await getProductBySlug(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  const relatedData = await getProducts({ categorySlug: product.category?.slug, limit: 5 }).catch(() => ({ items: [] }));
  const relatedProducts = relatedData.items?.filter((p: any) => p.id !== product.id).slice(0, 4) || [];

  const hasDiscount = product.salePrice && product.salePrice < product.basePrice;

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="mb-6">
        <Link href="/products" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Product Image Gallery (Left) */}
        <div className="lg:col-span-6">
          <ProductGallery 
            images={product.images || []} 
            productName={product.name} 
            hasDiscount={!!hasDiscount} 
          />
        </div>

        {/* Product Details (Right - Sticky) */}
        <div className="lg:col-span-6 relative">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="flex flex-col sticky top-24"
          >
            <div>
              {product.brand && (
                <Link href={`/brands/${product.brand.slug}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline transition-colors mb-3 block">
                  {product.brand.name}
                </Link>
              )}
              <h1 className="font-display text-3xl font-semibold leading-[1.2] tracking-tight text-foreground lg:text-4xl">
                {product.name}
              </h1>
              
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="flex text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < Math.round(Number(product.averageRating) || 0) ? 'fill-current' : 'text-muted-foreground/30'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium ml-1">
                    {Number(product.averageRating || 0).toFixed(1)}
                  </span>
                </div>
                <div className="w-1 h-1 rounded-full bg-border" />
                <a href="#reviews" className="text-sm text-muted-foreground hover:text-primary transition-colors hover:underline">
                  {product.reviewCount || 0} reviews
                </a>
              </div>
            </div>

            <ProductActions product={product} />

            <div className="mt-10 pt-8 border-t border-border/40 prose prose-slate dark:prose-invert max-w-none">
              <h3 className="text-sm uppercase tracking-widest font-semibold text-foreground mb-4">Description</h3>
              <p className="text-sm text-foreground/80 font-normal leading-relaxed">{product.description}</p>
            </div>

            <div className="mt-8 pt-8 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-foreground/80 font-light">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 mt-0.5 text-primary/70" />
                <div>
                  <p className="font-semibold text-foreground">Fast Delivery</p>
                  <p className="text-muted-foreground text-xs mt-1">Usually ships within 24 hours.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCcw className="w-5 h-5 mt-0.5 text-primary/70" />
                <div>
                  <p className="font-semibold text-foreground">7 Days Return</p>
                  <p className="text-muted-foreground text-xs mt-1">Hassle-free returns if unsatisfied.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 mt-0.5 text-primary/70" />
                <div>
                  <p className="font-semibold text-foreground">Secure Payment</p>
                  <p className="text-muted-foreground text-xs mt-1">100% secure Razorpay transactions.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 mt-0.5 text-primary/70" />
                <div>
                  <p className="font-semibold text-foreground">Top Rated Seller</p>
                                    <p className="text-muted-foreground text-xs mt-1">
                    Sold by <span className="font-medium text-foreground">{product.seller?.storeName || 'Verified Partner'}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Product Reviews */}
      <div id="reviews" className="mt-24 pt-12 border-t border-border/50">
        <ProductReviews productId={product.id} productSlug={product.slug} />
      </div>

      {/* Related Products */}
      <div className="mt-24 pt-12 border-t border-border/50">
        <h2 className="text-2xl font-bold tracking-tight mb-8">Related Products</h2>
        <ProductGrid products={relatedProducts} meta={undefined} searchParams={{}} />
      </div>

      {/* Recently Viewed (client-side persistence) */}
      <RecentlyViewed
        currentProduct={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0]?.url ?? null,
        }}
      />
    </div>
  );
}
