'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Heart, Minus, Plus, Share2, Check } from 'lucide-react';
import { addToWishlist } from '@/lib/api/wishlist';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

type Variant = {
  id: string;
  sku: string;
  color?: string;
  size?: string;
  price?: number;
  inventory?: {
    quantity?: number;
  };
};

export function ProductActions({ 
  product 
}: { 
  product: {
    id: string;
    slug?: string;
    name: string;
    basePrice: number;
    salePrice?: number;
    variants: Variant[];
  }
}) {
  const router = useRouter();
  const { addItem: addCartItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const availableQuantity = selectedVariant?.inventory?.quantity || 0;
  const isOutOfStock = availableQuantity === 0;

  const currentPrice = selectedVariant?.price || product.salePrice || product.basePrice;
  const hasDiscount = !selectedVariant?.price && product.salePrice && product.salePrice < product.basePrice;
  const originalPrice = product.basePrice;

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= availableQuantity) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant || isOutOfStock) {
      toast.error('Please select a valid, in-stock variant.');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addCartItem(product.id, selectedVariant.id, quantity);
    } catch (err: any) {
      if (err.message === 'Not authenticated') {
        router.push(`/login?callbackUrl=/products/${product.slug || product.id}`);
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant || isOutOfStock) return;

    setIsAddingToCart(true);
    try {
      await addCartItem(product.id, selectedVariant.id, quantity);
      router.push('/checkout');
    } catch (err: any) {
      if (err.message === 'Not authenticated') {
        router.push(`/login?callbackUrl=/products/${product.slug || product.id}`);
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push(`/login?callbackUrl=/products/${product.slug || product.id}`);
      return;
    }

    setIsAddingToWishlist(true);
    try {
      const loadingToast = toast.loading('Adding to wishlist...');
      await addToWishlist(token, product.id);
      toast.dismiss(loadingToast);
      toast.success('Added to wishlist');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to add to wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mt-6 flex items-end gap-4">
        {hasDiscount ? (
          <div className="flex items-center gap-4">
            <span className="font-display text-3xl font-bold text-foreground">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(currentPrice)}
            </span>
            <span className="text-xl font-light text-foreground/40 line-through mb-0.5">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(originalPrice)}
            </span>
            <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-sm mb-1">
              {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF
            </span>
          </div>
        ) : (
          <span className="font-display text-3xl font-bold text-foreground">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(currentPrice)}
          </span>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest font-semibold text-foreground">Select Variant</h3>
          {selectedVariant && (
            <span className="text-xs text-muted-foreground">SKU: {selectedVariant.sku}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {product.variants?.length > 0 ? (
            product.variants.map((variant) => {
              const vQty = variant.inventory?.quantity || 0;
              const isSelected = selectedVariant?.id === variant.id;
              
              return (
                <button
                  key={variant.id}
                  onClick={() => {
                    setSelectedVariant(variant);
                    setQuantity(1); // Reset quantity on variant change
                  }}
                  className={`inline-flex flex-col p-4 border transition-all text-left ${
                    isSelected ? 'border-foreground ring-1 ring-foreground bg-foreground/5' : 'border-border bg-background hover:border-foreground/50'
                  } ${vQty === 0 ? 'opacity-50' : ''}`}
                >
                  <span className="font-medium text-sm text-foreground">
                    {variant.color && <span>{variant.color}</span>}
                    {variant.color && variant.size && <span className="mx-1">•</span>}
                    {variant.size && <span>{variant.size}</span>}
                    {!variant.color && !variant.size && <span>Standard</span>}
                  </span>
                  <span className="text-xs mt-1 font-medium">
                    {vQty > 0 ? (
                      <span className="text-green-600">{vQty} in stock</span>
                    ) : (
                      <span className="text-destructive">Out of stock</span>
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <span className="text-sm text-foreground/60 bg-muted px-5 py-3 border border-transparent">Standard Edition</span>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex items-center border border-border bg-background">
          <button 
            type="button" 
            className="p-3 text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1 || isOutOfStock}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-sm font-medium">{isOutOfStock ? 0 : quantity}</span>
          <button 
            type="button" 
            className="p-3 text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= availableQuantity || isOutOfStock}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm text-muted-foreground flex-1">
          {!isOutOfStock && availableQuantity < 5 && (
            <span className="text-orange-500 font-medium">Only {availableQuantity} left!</span>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button
          size="lg"
          className="h-14 w-full rounded-lg font-display text-[15px] font-semibold"
          onClick={handleAddToCart}
          disabled={isAddingToCart || isOutOfStock}
        >
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </Button>
        <Button
          size="lg"
          variant="ink"
          className="h-14 w-full rounded-lg px-6 text-[15px]"
          onClick={handleBuyNow}
          disabled={isAddingToCart || isOutOfStock}
        >
          Buy Now
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Button 
          variant="ghost" 
          className="flex-1 text-muted-foreground hover:text-foreground text-sm"
          onClick={handleWishlist}
          disabled={isAddingToWishlist}
        >
          <Heart className="mr-2 h-4 w-4" />
          {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
        </Button>
        <div className="w-px h-4 bg-border" />
        <Button 
          variant="ghost" 
          className="flex-1 text-muted-foreground hover:text-foreground text-sm"
          onClick={handleShare}
        >
          {isShared ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Share2 className="mr-2 h-4 w-4" />}
          {isShared ? 'Copied!' : 'Share'}
        </Button>
      </div>
    </div>
  );
}
