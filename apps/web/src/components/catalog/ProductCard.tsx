'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { addToWishlist } from '@/lib/api/wishlist';
import { StarRating } from '@/components/marketing/star-rating';

interface ProductCardProps {
  product: any;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem: addCartItem } = useCart();
  const [wished, setWished] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  const imageUrl = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop';
  const hasDiscount = product.salePrice && product.salePrice < product.basePrice;

  const variants: any[] = product.variants || [];
  const inStockVariant = variants.find(
    (v) => (v.inventory?.quantity ?? 0) > 0,
  );
  const isOutOfStock = variants.length > 0 && !inStockVariant;
  const lowStockVariant = variants.find(
    (v) => {
      const available = (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
      return available > 0 && available <= 10;
    },
  );
  const discountPercent = hasDiscount 
    ? Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (!inStockVariant) return;
    try {
      await addCartItem(product.id, inStockVariant.id, 1);
    } catch (err: any) {
      if (err?.message === 'Not authenticated') {
        router.push(`/login?callbackUrl=/products/${product.slug}`);
      }
      // Other errors are already surfaced by CartContext toasts.
    }
  };

  const handleWishlistClick = async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push(`/login?callbackUrl=/products/${product.slug}`);
      return;
    }
    setWishLoading(true);
    try {
      await addToWishlist(token, product.id);
      setWished(true);
      toast.success('Added to wishlist');
    } catch (err: any) {
      // The backend rejects duplicates with 409; treat it as already saved.
      if (err?.message?.toLowerCase().includes('already')) {
        setWished(true);
        toast.info('Already in your wishlist');
      } else {
        toast.error(err?.message || 'Failed to add to wishlist');
      }
    } finally {
      setWishLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "100px" }}
      className="group flex flex-col w-full overflow-hidden rounded-2xl border bg-card transition-colors duration-200 hover:border-foreground/25"
    >
      {/* Image Container — Figma §10: warm neutral backdrop, 1:1 */}
      <div className="relative aspect-square w-full overflow-hidden bg-secondary p-4">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 z-10">
          <span className="sr-only">View {product.name}</span>
        </Link>
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain mix-blend-multiply transition-transform duration-200 ease-out group-hover:scale-105"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
        </div>

        {/* Badges — Figma §9 product label: brand pill, top-left */}
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
          {hasDiscount && (
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              {discountPercent}% OFF
            </span>
          )}
          {isOutOfStock && (
            <span className="rounded-md bg-muted-foreground px-2 py-1 text-xs font-semibold text-white">
              OUT OF STOCK
            </span>
          )}
          {!isOutOfStock && lowStockVariant && (
            <span className="rounded-md bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-white">
              LOW STOCK
            </span>
          )}
        </div>

        {/* Wishlist Float */}
        <button
          onClick={handleWishlistClick}
          disabled={wishLoading}
          aria-label={wished ? 'Saved to wishlist' : 'Add to wishlist'}
          className={`absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border bg-background/90 backdrop-blur transition-colors duration-200 ${
            wished
              ? 'border-brand/30 text-brand'
              : 'text-muted-foreground hover:border-brand/40 hover:text-brand'
          }`}
        >
          <Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Details — Figma §10 anatomy */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand && (
          <Link
            href={`/brands/${product.brand.slug}`}
            className="text-xs text-muted-foreground transition-colors hover:text-brand"
          >
            {product.brand.name}
          </Link>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 font-display text-base font-semibold text-foreground transition-colors hover:text-brand"
        >
          {product.name}
        </Link>

        {/* Rating — stroke stars #FFB000 + count */}
        <StarRating value={product.averageRating} count={product.reviewCount} />

        <div className="mt-auto flex flex-col gap-3 pt-2">
          {/* Pricing */}
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-lg font-bold text-foreground">
              ₹{(product.salePrice || product.basePrice).toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                M.R.P: ₹{product.basePrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Add to Cart — Figma secondary style: 1px ink border, transparent */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] font-display text-sm font-semibold transition-colors duration-200 ${
              isOutOfStock
                ? 'cursor-not-allowed border-border bg-secondary text-muted-foreground'
                : 'border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background active:scale-[0.99]'
            }`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex w-full animate-pulse flex-col overflow-hidden rounded-2xl border">
      <div className="aspect-square bg-secondary" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-16 rounded bg-secondary" />
        <div className="h-4 w-full rounded bg-secondary" />
        <div className="h-4 w-2/3 rounded bg-secondary" />
        <div className="mt-2 h-6 w-24 rounded bg-secondary" />
        <div className="mt-2 h-11 w-full rounded-lg bg-secondary" />
      </div>
    </div>
  );
}

