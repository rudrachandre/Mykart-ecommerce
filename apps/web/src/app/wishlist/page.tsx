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

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem: addCartItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      // Guest wishlist preservation
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
      // Guest remove
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
      // Pick the first variant or default
      const variantId = item.product.variants?.[0]?.id;
      if (!variantId) {
        toast.error('This product is unavailable to add to cart directly.');
        return;
      }
      
      // Check stock
      const inventory = item.product.variants[0].inventory?.quantity || 0;
      if (inventory <= 0) {
        toast.error('This product is out of stock.');
        return;
      }

      await addCartItem(item.product.id, variantId, 1);
      // Remove from wishlist after moving to cart
      await handleRemove(item.id);
    } catch (error) {
      // toast is handled in addCartItem
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center gap-3 mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Your Wishlist</h1>
        <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      
      {items.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 border rounded-2xl bg-card shadow-sm"
        >
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">Your wishlist is empty</p>
          <p className="text-muted-foreground mb-8">Save items you love to review them later.</p>
          <Link href="/products">
            <Button size="lg" className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all">
              Discover Products <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const stockQty = item.product.variants?.[0]?.inventory?.quantity || 0;
            const isOutOfStock = stockQty <= 0;
            const price = item.product.salePrice || item.product.basePrice;

            return (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-background transition-colors hover:border-foreground/50 shadow-sm hover:shadow-md"
              >
                <Link href={`/products/${item.product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  {item.product.images?.[0]?.url && (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-background text-foreground px-4 py-2 font-bold uppercase tracking-widest text-xs">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex flex-col gap-3 p-5 flex-1 justify-between">
                  <div>
                    <Link href={`/products/${item.product.slug}`} className="font-medium line-clamp-2 hover:underline hover:text-primary transition-colors text-sm">
                      {item.product.name}
                    </Link>
                    <div className="mt-2 text-lg font-bold text-foreground">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(price))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button 
                      onClick={() => handleMoveToCart(item)}
                      disabled={isOutOfStock}
                      className="w-full font-bold uppercase tracking-widest text-xs bg-foreground text-background"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" /> Move to Cart
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleRemove(item.id)}
                      className="w-full font-bold uppercase tracking-widest text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Remove
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
