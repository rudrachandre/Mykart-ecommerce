'use client';

import React, { createContext, useContext, useState, useEffect, startTransition, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { getCart, addToCart, updateCartItem, removeFromCart } from '@/lib/api/cart';
import { toast } from 'sonner';

export type CartItem = {
  id: string;
  quantity: number;
  price: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: { url: string }[];
  };
  variant: {
    id: string;
    color: string | null;
    size: string | null;
    inventory?: {
      quantity: number;
    };
  };
};

interface CartContextType {
  cart: { items: CartItem[] } | null;
  loading: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<{ items: CartItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCart = async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      setCart({ items: [] });
      setLoading(false);
      return;
    }

    try {
      const data = await getCart(token);
      setCart(data);
    } catch (error) {
      console.error('Failed to fetch cart', error);
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchCart();
    });
  }, []);

  const addItem = async (productId: string, variantId: string, quantity: number) => {
    const token = Cookies.get('accessToken');
    if (!token) {
      toast.error('Please sign in to add to cart');
      throw new Error('Not authenticated');
    }

    try {
      const loadingToast = toast.loading('Adding to cart...');
      await addToCart(token, productId, variantId, quantity);
      await fetchCart();
      toast.dismiss(loadingToast);
      toast.success('Added to cart');
      setIsOpen(true);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to add to cart');
      throw error;
    }
  };

  const updateItem = async (itemId: string, quantity: number) => {
    const token = Cookies.get('accessToken');
    if (!token) return;

    try {
      const loadingToast = toast.loading('Updating quantity...');
      await updateCartItem(token, itemId, quantity);
      await fetchCart();
      toast.dismiss(loadingToast);
      toast.success('Cart updated');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to update item');
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    const token = Cookies.get('accessToken');
    if (!token) return;

    try {
      const loadingToast = toast.loading('Removing item...');
      await removeFromCart(token, itemId);
      await fetchCart();
      toast.dismiss(loadingToast);
      toast.success('Item removed from cart');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to remove item');
      throw error;
    }
  };

  const clearCart = async () => {
    // Requires a clear cart API endpoint or looping through items
    if (!cart?.items.length) return;
    const token = Cookies.get('accessToken');
    if (!token) return;

    try {
      const loadingToast = toast.loading('Clearing cart...');
      for (const item of cart.items) {
        await removeFromCart(token, item.id);
      }
      await fetchCart();
      toast.dismiss(loadingToast);
      toast.success('Cart cleared');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to clear cart');
      throw error;
    }
  };

  return (
    <CartContext.Provider value={{ cart, loading, isOpen, setIsOpen, refreshCart: fetchCart, addItem, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
