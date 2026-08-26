'use client';

import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, X, Plus, Minus, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export function CartDrawer() {
  const { cart, isOpen, setIsOpen, updateItem, removeItem, loading } = useCart();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, setIsOpen]);

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-200 flex items-center shrink-0"
      >
        <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
        {itemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-2xl z-50 flex flex-col"
              ref={drawerRef}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5" />
                  <h2 className="text-lg font-bold tracking-tight">Your Cart</h2>
                  <span className="bg-muted text-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                    {itemCount}
                  </span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!user ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-lg font-semibold mb-2">Sign in to view cart</p>
                    <p className="text-sm text-muted-foreground mb-6">You need to be logged in to manage your shopping cart.</p>
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <Button className="rounded-full">Sign In</Button>
                    </Link>
                  </div>
                ) : loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-lg font-semibold mb-2">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground mb-6">Looks like you haven&apos;t added anything yet.</p>
                    <Button variant="outline" className="rounded-full" onClick={() => setIsOpen(false)}>
                      Continue Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="relative w-24 h-24 bg-secondary rounded-md overflow-hidden shrink-0">
                          {item.product.images?.[0]?.url ? (
                            <Image 
                              src={item.product.images[0].url} 
                              alt={item.product.name} 
                              fill 
                              className="object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-muted" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1 justify-between">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <Link 
                                href={`/products/${item.product.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="font-medium text-sm line-clamp-2 hover:underline"
                              >
                                {item.product.name}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.variant.color && <span>{item.variant.color}</span>}
                                {item.variant.color && item.variant.size && <span className="mx-1">•</span>}
                                {item.variant.size && <span>{item.variant.size}</span>}
                              </p>
                            </div>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-destructive p-1"
                              title="Remove item"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border rounded-md">
                              <button 
                                className="p-1 hover:bg-muted disabled:opacity-50 transition-colors"
                                onClick={() => updateItem(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                              <button 
                                className="p-1 hover:bg-muted disabled:opacity-50 transition-colors"
                                onClick={() => updateItem(item.id, item.quantity + 1)}
                                disabled={item.quantity >= (item.variant.inventory?.quantity || 99)}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-semibold text-sm">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.price))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && user && (
                <div className="p-6 border-t bg-muted/10">
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subtotal</span>
                    <span className="text-xl font-bold">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(subtotal)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 text-center">Shipping & taxes calculated at checkout.</p>
                  <div className="flex flex-col gap-3">
                    <Link href="/checkout" onClick={() => setIsOpen(false)} className="w-full">
                      <Button className="w-full h-12 text-sm font-bold uppercase tracking-widest group">
                        Checkout <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Link href="/cart" onClick={() => setIsOpen(false)} className="w-full">
                      <Button variant="outline" className="w-full h-12 text-sm font-bold uppercase tracking-widest">
                        View Cart
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
