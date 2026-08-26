"use client";

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
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight">Your Cart</h1>
          <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={clearCart}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear Cart
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 border rounded-2xl bg-card shadow-sm"
        >
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">
            Your cart is empty
          </p>
          <p className="text-muted-foreground mb-8">
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
        <div className="flex flex-col lg:flex-row gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6"
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-6 border-b border-border/40 pb-6 group"
              >
                <div className="relative w-32 h-40 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                  {item.product.images?.[0]?.url ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between py-1">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-medium text-lg line-clamp-2 hover:text-foreground/70 transition-colors">
                        <Link href={`/products/${item.product.slug}`}>
                          {item.product.name}
                        </Link>
                      </h3>
                      <p className="text-sm text-foreground/60 mt-2 font-light">
                        {item.variant.color && (
                          <span>{item.variant.color}</span>
                        )}
                        {item.variant.color && item.variant.size && (
                          <span className="mx-2">•</span>
                        )}
                        {item.variant.size && <span>{item.variant.size}</span>}
                      </p>
                    </div>
                    <p className="font-medium text-lg text-foreground">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(parseFloat(item.price))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-border bg-background rounded-md h-10">
                      <button
                        className="w-10 h-full flex items-center justify-center hover:bg-muted disabled:opacity-50 transition-colors"
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        className="w-10 h-full flex items-center justify-center hover:bg-muted disabled:opacity-50 transition-colors"
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        disabled={
                          item.quantity >=
                          (item.variant.inventory?.quantity || 99)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-foreground/40 hover:text-destructive transition-colors flex items-center gap-2 text-xs uppercase tracking-widest font-semibold"
                    >
                      Remove
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
            className="w-full lg:w-[400px]"
          >
            <div className="p-8 bg-secondary sticky top-32 rounded-xl">
              <h2 className="text-lg font-bold mb-6 uppercase tracking-widest">
                Order Summary
              </h2>
              <div className="space-y-4 text-sm font-medium text-foreground/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-foreground">
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
                        ? "text-green-600 font-bold"
                        : "text-foreground"
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
              <div className="border-t border-border/40 mt-6 pt-6 flex justify-between items-end">
                <span className="text-base uppercase tracking-widest font-bold">
                  Total
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(total)}
                </span>
              </div>
              <Link href="/checkout" className="block mt-10">
                <Button className="w-full h-14 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase tracking-widest text-xs font-bold transition-all group">
                  Proceed to Checkout{" "}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <p className="text-xs text-center text-foreground/50 mt-6 font-medium">
                Secure checkout • Free shipping on orders over ₹10,000
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
