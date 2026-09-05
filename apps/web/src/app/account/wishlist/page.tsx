'use client';

import { useState, useEffect, startTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, ArrowRight, Trash2, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

type WishlistItem = {
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

export default function AccountWishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem: addCartItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
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
      } catch (error) {
        console.error(error);
        toast.error('Failed to load guest wishlist');
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const data = await getWishlist(token);
      setItems(data.items || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchWishlist();
    });
  }, [user]);

  const handleRemove = async (itemId: string) => {
    const token = Cookies.get('accessToken');
    if (!token) {
      try {
        const guestWishlist = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        const updated = guestWishlist.filter((id: string) => id !== itemId);
        localStorage.setItem('guest_wishlist', JSON.stringify(updated));
        toast.success('Removed from wishlist');
        await fetchWishlist();
      } catch (error) {
        console.error(error);
        toast.error('Failed to remove item');
      }
      return;
    }

    try {
      const loadingToast = toast.loading('Removing from wishlist...');
      await removeFromWishlist(token, itemId);
      await fetchWishlist();
      toast.dismiss(loadingToast);
      toast.success('Removed from wishlist');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to remove from wishlist');
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    try {
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

      await addCartItem(item.product.id, variantId, 1);
      await handleRemove(item.id);
    } catch (error) {
      // Toast handled by addCartItem
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">My Wishlist</h1>
          <p className="text-muted-foreground text-sm">Save your favorite items for later.</p>
        </div>
        <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 border border-dashed rounded-xl bg-card"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Your wishlist is empty</h2>
          <p className="text-muted-foreground text-sm mb-6">Save items you love to review them later.</p>
          <Link href="/products">
            <Button size="sm" className="rounded-full px-6 font-semibold">
              Discover Products <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const stockQty = item.product.variants?.[0]?.inventory?.quantity || 0;
            const isOutOfStock = stockQty <= 0;
            const price = item.product.salePrice || item.product.basePrice;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all hover:border-border hover:shadow-md"
              >
                <Link href={`/products/${item.product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  {item.product.images?.[0]?.url && (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-background text-foreground px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex flex-col gap-3 p-4 flex-1 justify-between">
                  <div>
                    <Link href={`/products/${item.product.slug}`} className="font-medium text-sm line-clamp-2 hover:underline hover:text-primary transition-colors">
                      {item.product.name}
                    </Link>
                    <div className="mt-2 text-base font-bold text-foreground">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(price))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    <Button
                      onClick={() => handleMoveToCart(item)}
                      disabled={isOutOfStock}
                      size="sm"
                      className="w-full font-bold uppercase tracking-wider text-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Move to Cart
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                      className="w-full font-bold uppercase tracking-wider text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
