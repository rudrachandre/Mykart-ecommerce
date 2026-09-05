"use client";

import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { calculateShippingFee } from "@/lib/shipping";

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    cart,
    loading: cartLoading,
    updateItem,
    removeItem,
    clearCart,
  } = useCart();
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const handleUpdate = async (id: string, qty: number) => {
    setMutatingId(id);
    try {
      await updateItem(id, qty);
    } catch {
      // Toast handles error feedback
    } finally {
      setMutatingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setMutatingId(id);
    try {
      await removeItem(id);
    } catch {
      // Toast handles error feedback
    } finally {
      setMutatingId(null);
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="container mx-auto px-4 py-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <div className="bg-card border rounded-2xl p-12 shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold mb-4 tracking-tight">
            Your Cart is Waiting
          </h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Please sign in to view your cart and checkout.
          </p>
          <Link href="/login?callbackUrl=/cart">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full font-semibold px-8 hover:scale-105 active:scale-95 transition-all"
            >
              Sign In to Continue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = items.reduce(
    (acc, item) => acc + parseFloat(item.price) * item.quantity,
    0,
  );
  // Display-only mirror of the server-authoritative shipping rule (see @/lib/shipping).
  const deliveryFee = items.length > 0 ? calculateShippingFee(subtotal) : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">Your Cart</h1>
          <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs sm:text-sm">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs sm:text-sm"
            onClick={clearCart}
            disabled={!!mutatingId}
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Clear Cart
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 border rounded-2xl bg-card shadow-sm"
        >
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">
            Your cart is empty
          </p>
          <p className="text-muted-foreground mb-8 text-sm">
            Looks like you haven&apos;t added anything yet.
          </p>
          <Link href="/products">
            <Button
              size="lg"
              className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all"
            >
              Start Shopping <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full lg:flex-1 space-y-4 sm:space-y-6"
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 sm:gap-6 border-b border-border/40 pb-6 group"
              >
                <div className="relative w-24 h-28 sm:w-28 sm:h-32 bg-secondary/50 rounded-lg overflow-hidden flex-shrink-0 border border-border/40 p-1">
                  {item.product.images?.[0]?.url ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-medium text-base sm:text-lg line-clamp-2 hover:text-primary transition-colors">
                        <Link href={`/products/${item.product.slug}`}>
                          {item.product.name}
                        </Link>
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-light">
                        {item.variant.color && (
                          <span>{item.variant.color}</span>
                        )}
                        {item.variant.color && item.variant.size && (
                          <span className="mx-2">•</span>
                        )}
                        {item.variant.size && <span>{item.variant.size}</span>}
                      </p>
                    </div>
                    <p className="font-semibold text-base sm:text-lg text-foreground whitespace-nowrap">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(parseFloat(item.price))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border bg-background rounded-md h-9">
                      <button
                        className="w-9 h-full flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                        onClick={() => handleUpdate(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || mutatingId === item.id}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-xs sm:text-sm font-semibold">
                        {mutatingId === item.id ? '...' : item.quantity}
                      </span>
                      <button
                        className="w-9 h-full flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                        onClick={() => handleUpdate(item.id, item.quantity + 1)}
                        disabled={
                          item.quantity >=
                            (item.variant.inventory?.quantity || 99) ||
                          mutatingId === item.id
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={mutatingId === item.id}
                      className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full lg:w-[380px] shrink-0"
          >
            <div className="p-6 sm:p-8 bg-card border rounded-2xl sticky top-28 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold mb-6 uppercase tracking-widest text-foreground">
                Order Summary
              </h2>
              <div className="space-y-4 text-sm font-medium text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-foreground font-semibold">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span
                    className={
                      deliveryFee === 0
                        ? "text-emerald-600 font-bold"
                        : "text-foreground font-semibold"
                    }
                  >
                    {deliveryFee === 0
                      ? "FREE"
                      : new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(deliveryFee)}
                  </span>
                </div>
              </div>
              <div className="border-t border-border mt-6 pt-6 flex justify-between items-end">
                <span className="text-sm uppercase tracking-widest font-bold text-foreground">
                  Total
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(total)}
                </span>
              </div>
              <Link href="/checkout" className="block mt-8">
                <Button className="w-full h-12 sm:h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider text-sm transition-all group shadow-md">
                  Proceed to Checkout{" "}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground mt-4 font-medium">
                100% Secure Checkout • Verified Payment Gateway
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
