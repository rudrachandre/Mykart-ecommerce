'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Heart, ShoppingCart, Tag, Zap, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { addToWishlist } from '@/lib/api/wishlist';
import { StarRating } from '@/components/marketing/star-rating';
import { ProductImage } from '@/components/ui/ProductImage';
import { calculateDiscount, formatPrice, formatDiscountBadge, getDealStatus } from '@/lib/pricing';

export interface DealProductCardProps {
  product: any;
  priority?: boolean;
}

export function DealProductCard({ product, priority = false }: DealProductCardProps) {
  const router = useRouter();
  const { addItem: addCartItem } = useCart();
  const [wished, setWished] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  // Variant support
  const variants: any[] = product.variants || [];
  const defaultVariantIndex = variants.findIndex(
    (v) => (v.inventory?.quantity ?? 0) > (v.inventory?.reserved ?? 0)
  );
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(
    defaultVariantIndex >= 0 ? defaultVariantIndex : 0
  );

  const selectedVariant = variants[selectedVariantIndex] || null;
  const currentPrice = selectedVariant?.price 
    ? Number(selectedVariant.price) 
    : (product.salePrice ? Number(product.salePrice) : Number(product.basePrice));
  const basePrice = Number(product.basePrice);

  const discount = calculateDiscount(basePrice, currentPrice);
  const stockAvailable = selectedVariant 
    ? ((selectedVariant.inventory?.quantity ?? 0) - (selectedVariant.inventory?.reserved ?? 0))
    : 0;
  const isOutOfStock = variants.length > 0 ? stockAvailable <= 0 : false;
  const dealStatus = getDealStatus(discount.discountPercent, stockAvailable);

  const imageUrl = product.images?.[0]?.url || null;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || !selectedVariant) {
      toast.error('Selected item is out of stock');
      return;
    }

    setCartLoading(true);
    try {
      await addCartItem(product.id, selectedVariant.id, 1);
      toast.success('Added to cart!');
    } catch (err: any) {
      if (err?.message === 'Not authenticated') {
        router.push(`/login?callbackUrl=/products/${product.slug}`);
      }
    } finally {
      setCartLoading(false);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = Cookies.get('accessToken');
    if (!token) {
      router.push(`/login?callbackUrl=/products/${product.slug}`);
      return;
    }

    setWishLoading(true);
    try {
      await addToWishlist(token, product.id);
      setWished(true);
      toast.success('Saved to wishlist');
    } catch (err: any) {
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex flex-col w-full h-full overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:border-foreground/30 hover:shadow-md"
    >
      {/* Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-secondary/40 p-3 sm:p-4">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 z-10">
          <span className="sr-only">View {product.name}</span>
        </Link>

        <div className="relative w-full h-full">
          <ProductImage
            src={imageUrl}
            alt={product.name}
            priority={priority}
            className="object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-105"
          />
        </div>

        {/* Top-Left Deal Badges */}
        <div className="absolute left-2.5 top-2.5 z-20 flex flex-col gap-1.5 pointer-events-none">
          {discount.hasDiscount && (
            <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <Zap className="h-3 w-3 fill-current" />
              {formatDiscountBadge(discount.discountPercent, true)}
            </span>
          )}

          {dealStatus?.variant === 'limited' && (
            <span className="rounded bg-black/80 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium text-white">
              Limited time deal
            </span>
          )}

          {dealStatus?.variant === 'fast' && (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-black">
              Selling fast
            </span>
          )}

          {isOutOfStock && (
            <span className="rounded bg-muted-foreground px-2 py-0.5 text-[11px] font-semibold text-white">
              Out of stock
            </span>
          )}
        </div>

        {/* Top-Right Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          disabled={wishLoading}
          aria-label={wished ? 'Saved to wishlist' : 'Add to wishlist'}
          className={`absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition-all duration-200 ${
            wished
              ? 'border-red-300 text-red-500'
              : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground'
          }`}
        >
          <Heart className={`h-4 w-4 ${wished ? 'fill-current text-red-500' : ''}`} />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4 gap-2">
        {/* Brand */}
        {product.brand && (
          <Link
            href={`/brands/${product.brand.slug}`}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {product.brand.name}
          </Link>
        )}

        {/* Title */}
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* Star Rating & Review Count */}
        <div className="flex items-center gap-1.5">
          <StarRating value={product.averageRating || 0} count={product.reviewCount || 0} />
        </div>

        {/* Color / Variant Swatches (if available) */}
        {variants.length > 1 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {variants.slice(0, 4).map((variant, idx) => {
              const isSelected = selectedVariantIndex === idx;
              const hasColor = Boolean(variant.color);
              return (
                <button
                  key={variant.id || idx}
                  type="button"
                  onClick={() => setSelectedVariantIndex(idx)}
                  aria-label={`Select variant ${variant.color || variant.size || idx + 1}`}
                  className={`relative flex h-5 min-w-5 items-center justify-center rounded-full border text-[10px] px-1 transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 font-bold bg-primary/10'
                      : 'border-border hover:border-foreground/40 bg-muted/50'
                  }`}
                  style={hasColor ? { backgroundColor: variant.color.toLowerCase() } : undefined}
                >
                  {!hasColor && (variant.size || idx + 1)}
                  {isSelected && hasColor && (
                    <Check className="h-2.5 w-2.5 text-white stroke-[3] drop-shadow" />
                  )}
                </button>
              );
            })}
            {variants.length > 4 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                +{variants.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Pricing Block */}
        <div className="mt-auto pt-2 flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold text-foreground tracking-tight">
              {formatPrice(discount.sellingPrice)}
            </span>
            {discount.hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                M.R.P. {formatPrice(discount.mrp)}
              </span>
            )}
          </div>

          {/* Savings / Coupon Callout */}
          {discount.hasDiscount && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Tag className="h-3 w-3" />
              <span>Save {formatPrice(discount.savings)} ({discount.discountPercent}% off)</span>
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || cartLoading}
            className={`mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              isOutOfStock
                ? 'cursor-not-allowed border bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {cartLoading ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function DealProductCardSkeleton() {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border bg-card animate-pulse">
      <div className="aspect-square bg-muted/60" />
      <div className="flex flex-col gap-2.5 p-3.5 sm:p-4">
        <div className="h-3 w-16 rounded bg-muted/70" />
        <div className="h-4 w-full rounded bg-muted/70" />
        <div className="h-3 w-24 rounded bg-muted/70" />
        <div className="mt-4 flex items-baseline gap-2">
          <div className="h-5 w-20 rounded bg-muted/70" />
          <div className="h-3 w-14 rounded bg-muted/60" />
        </div>
        <div className="mt-2 h-9 w-full rounded-lg bg-muted/70" />
      </div>
    </div>
  );
}
