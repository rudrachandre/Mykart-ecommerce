'use client';

import { useState, useEffect, startTransition, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, ArrowRight, Trash2, ShoppingCart, Loader2, Package, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

export type WishlistItem = {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: string;
    salePrice?: string;
    images: { url: string }[];
    variants: any[];
  };
};

interface WishlistContentProps {
  isAccountShell?: boolean;
}

export function WishlistContent({ isAccountShell = false }: WishlistContentProps) {
  const { user, loading: authLoading } = useAuth();
  const { addItem: addCartItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'move' | 'remove' | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = Cookies.get('accessToken');

    if (!token) {
      // Guest wishlist handling
      try {
        const guestWishlist = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        if (guestWishlist.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/v1/wishlist/guest?productIds=${guestWishlist.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error('Guest wishlist fetch error:', err);
        setError('Unable to load guest wishlist. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const data = await getWishlist(token);
      setItems(data.items || []);
    } catch (err: any) {
      console.error('Wishlist fetch error:', err);
      setError(err.message || 'Failed to load wishlist. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      fetchWishlist();
    });
  }, [user, fetchWishlist]);

  const handleRemove = async (itemId: string) => {
    if (actionItemId) return; // Prevent concurrent duplicate actions
    setActionItemId(itemId);
    setActionType('remove');

    const token = Cookies.get('accessToken');
    if (!token) {
      try {
        const guestWishlist = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        const updated = guestWishlist.filter((id: string) => id !== itemId);
        localStorage.setItem('guest_wishlist', JSON.stringify(updated));
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        toast.success('Item removed from wishlist');
      } catch (err: any) {
        toast.error('Failed to remove item');
      } finally {
        setActionItemId(null);
        setActionType(null);
      }
      return;
    }

    try {
      await removeFromWishlist(token, itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success('Item removed from wishlist');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove from wishlist');
    } finally {
      setActionItemId(null);
      setActionType(null);
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    if (actionItemId) return;

    const variantId = item.product.variants?.[0]?.id;
    if (!variantId) {
      toast.error('This product is unavailable to add to cart directly.');
      return;
    }

    const inventory = item.product.variants[0].inventory?.quantity || 0;
    if (inventory <= 0) {
      toast.error('This product is out of stock.');
      return;
    }

    setActionItemId(item.id);
    setActionType('move');

    try {
      await addCartItem(item.product.id, variantId, 1);
      const token = Cookies.get('accessToken');
      if (token) {
        await removeFromWishlist(token, item.id);
      } else {
        const guestWishlist = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        const updated = guestWishlist.filter((id: string) => id !== item.id);
        localStorage.setItem('guest_wishlist', JSON.stringify(updated));
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('Moved to cart!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to move item to cart');
    } finally {
      setActionItemId(null);
      setActionType(null);
    }
  };

  const wrapperClass = isAccountShell
    ? 'space-y-6'
    : 'container mx-auto px-4 py-8 md:py-12 max-w-6xl space-y-6';

  if (authLoading || loading) {
    return (
      <div className={wrapperClass}>
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded-md mb-2" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <div className="aspect-[4/5] bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-5 bg-muted animate-pulse rounded w-1/3" />
                <div className="h-9 bg-muted animate-pulse rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapperClass}>
        <div className="text-center py-16 border border-destructive/20 rounded-xl bg-destructive/5 p-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Failed to load wishlist</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button onClick={fetchWishlist} variant="outline" className="font-semibold">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">My Wishlist</h1>
          <p className="text-muted-foreground text-sm">Save your favorite items to purchase later.</p>
        </div>
        <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs" aria-label={`${items.length} items in wishlist`}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 border border-dashed border-border/60 rounded-xl bg-card p-8"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Your wishlist is empty</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Explore our catalog and save your favorite products to keep track of prices and stock.
          </p>
          <Link href="/products">
            <Button size="sm" className="rounded-full px-6 font-semibold shadow-sm">
              Discover Products <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const stockQty = item.product.variants?.[0]?.inventory?.quantity || 0;
              const isOutOfStock = stockQty <= 0;
              const price = item.product.salePrice || item.product.basePrice;
              const isMoving = actionItemId === item.id && actionType === 'move';
              const isRemoving = actionItemId === item.id && actionType === 'remove';
              const isItemBusy = actionItemId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all hover:border-border hover:shadow-md"
                >
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="relative aspect-[4/5] overflow-hidden bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`View ${item.product.name}`}
                  >
                    {item.product.images?.[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-destructive/90 text-destructive-foreground px-3 py-1 font-bold uppercase tracking-widest text-[10px] rounded shadow-sm">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-col gap-3 p-4 flex-1 justify-between">
                    <div>
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-semibold text-sm line-clamp-2 hover:underline hover:text-primary transition-colors text-foreground"
                      >
                        {item.product.name}
                      </Link>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-foreground">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(price))}
                        </span>
                        {item.product.salePrice && parseFloat(item.product.basePrice) > parseFloat(item.product.salePrice) && (
                          <span className="text-xs text-muted-foreground line-through">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.product.basePrice))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                      <Button
                        onClick={() => handleMoveToCart(item)}
                        disabled={isOutOfStock || isItemBusy}
                        size="sm"
                        className="w-full font-bold uppercase tracking-wider text-xs shadow-sm"
                        aria-label={`Move ${item.product.name} to cart`}
                      >
                        {isMoving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Moving...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Move to Cart
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(item.id)}
                        disabled={isItemBusy}
                        className="w-full font-bold uppercase tracking-wider text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        aria-label={`Remove ${item.product.name} from wishlist`}
                      >
                        {isRemoving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
