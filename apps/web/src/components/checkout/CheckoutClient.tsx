"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { validateCoupon } from "@/lib/api/coupons";
import { checkout, verifyPayment } from "@/lib/api/orders";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { calculateShippingFee } from "@/lib/shipping";

/**
 * Methods surfaced in checkout. All online methods fulfil through the existing
 * Razorpay architecture; availability of specific instruments (UPI, netbanking,
 * wallets) ultimately depends on the configured Razorpay merchant account.
 */
const PAYMENT_METHODS = {
  COD: "Cash on Delivery",
  UPI: "UPI",
  CARD: "Credit / Debit Card",
  NETBANKING: "Net Banking",
  WALLET: "Wallets",
} as const;

export function CheckoutClient({
  token,
  items,
  subtotal,
}: {
  token: string;
  items: any[];
  subtotal: number;
}) {
  const router = useRouter();
  const { refreshCart } = useCart();

  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState("");

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "COD" | "UPI" | "CARD" | "NETBANKING" | "WALLET"
  >("COD");

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await validateCoupon(token, couponCode, subtotal);
      setDiscountAmount(res.discountAmount);
      setAppliedCoupon(res.code);
      toast.success("Coupon applied successfully");
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon");
      setDiscountAmount(0);
      setAppliedCoupon("");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon("");
    setDiscountAmount(0);
    setCouponError("");
    toast.success("Coupon removed");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);

    try {
      const payload: any = { shippingAddress: address, paymentMethod };
      if (appliedCoupon) {
        payload.couponCode = appliedCoupon;
      }

      const result = await checkout(token, payload);

      // COD orders carry no gateway identifiers: the order is placed now and
      // settled physically at delivery, so Razorpay Checkout is never opened.
      if (!result.razorpayOrderId) {
        await refreshCart();
        toast.success("Order placed! Pay on delivery.");
        router.push(`/orders/${result.order.id}?success=true&cod=true`);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "dummy_key",
        amount: result.amount,
        currency: result.currency,
        name: "MyKart",
        description: "Order Payment",
        order_id: result.razorpayOrderId,
        handler: async function (response: any) {
          try {
            const verifyPayload = {
              orderId: result.order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };
            await verifyPayment(token, verifyPayload);
            await refreshCart();
            toast.success("Payment successful!");
            router.push(`/orders/${result.order.id}?success=true`);
          } catch (error: any) {
            toast.error(error.message || "Payment verification failed");
            router.push(`/orders/${result.order.id}?payment=failed`);
          }
        },
        prefill: {
          name: address.fullName,
          contact: address.phone,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: function () {
            setCheckoutLoading(false);
            toast.error("Payment cancelled");
            router.push(`/orders/${result.order.id}?payment=cancelled`);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description || "Payment failed");
        router.push(`/orders/${result.order.id}?payment=failed`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
      setCheckoutLoading(false);
    }
  };

  const total = Math.max(0, subtotal - discountAmount);
  // Display-only mirror of the server-authoritative shipping rule. The amount
  // actually charged is computed by the backend in OrdersService.checkout().
  const deliveryFee = calculateShippingFee(subtotal);
  const tax = Math.round((total) * 0.18 * 100) / 100;
  const finalTotal = total + deliveryFee + tax;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <form
        onSubmit={handleCheckout}
        className="flex flex-col lg:flex-row gap-12 lg:gap-20"
      >
        <div className="flex-1 space-y-12">
          <section className="bg-background">
            <h2 className="text-xl font-medium mb-8 uppercase tracking-widest text-foreground">
              Shipping Address
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    Phone
                  </label>
                  <input
                    required
                    type="tel"
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({ ...address, phone: e.target.value })
                    }
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  Address Line 1
                </label>
                <input
                  required
                  type="text"
                  value={address.addressLine1}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine1: e.target.value })
                  }
                  className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={address.addressLine2}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine2: e.target.value })
                  }
                  className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    City
                  </label>
                  <input
                    required
                    type="text"
                    value={address.city}
                    onChange={(e) =>
                      setAddress({ ...address, city: e.target.value })
                    }
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    State
                  </label>
                  <input
                    required
                    type="text"
                    value={address.state}
                    onChange={(e) =>
                      setAddress({ ...address, state: e.target.value })
                    }
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    Postal Code
                  </label>
                  <input
                    required
                    type="text"
                    value={address.postalCode}
                    onChange={(e) =>
                      setAddress({ ...address, postalCode: e.target.value })
                    }
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    Country
                  </label>
                  <input
                    required
                    type="text"
                    value={address.country}
                    onChange={(e) =>
                      setAddress({ ...address, country: e.target.value })
                    }
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="w-full lg:w-[400px]">
          <div className="p-8 bg-secondary sticky top-32 rounded-xl">
            <h2 className="text-lg font-bold mb-8 uppercase tracking-widest">
              Order Summary
            </h2>
            <div className="space-y-4 mb-8">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm items-center"
                >
                  <span className="text-foreground/70 truncate mr-4 font-light">
                    {item.quantity} x {item.product.name}
                  </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(parseFloat(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="py-6 border-y border-border/40 mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/70 mb-4">
                Discount Code
              </h3>
              {appliedCoupon ? (
                <div className="flex justify-between items-center bg-background/50 p-3 rounded-none border border-border">
                  <span className="text-sm text-foreground font-medium uppercase tracking-widest">
                    {appliedCoupon}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[10px] uppercase font-bold text-destructive hover:underline tracking-widest"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex h-10 w-full rounded-none border-b-2 border-t-0 border-l-0 border-r-0 border-border bg-transparent px-0 text-sm focus-visible:outline-none focus-visible:border-foreground transition-all"
                  />
                  <Button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode}
                    className="rounded-none h-10 px-6 uppercase tracking-widest text-[10px] font-bold bg-foreground text-background"
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-destructive font-medium text-xs mt-2">
                  {couponError}
                </p>
              )}
            </div>

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
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>
                    -
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span
                  className={
                    deliveryFee === 0 ? "text-green-600" : "text-foreground"
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
              <div className="flex justify-between">
                <span>Tax (18%)</span>
                <span className="text-foreground">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(tax)}
                </span>
              </div>
              <div className="flex justify-between items-end pt-6 border-t border-border/40 mt-6">
                <span className="text-sm uppercase tracking-widest font-bold text-foreground">
                  Total
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(finalTotal)}
                </span>
              </div>
            </div>
            <div className="mt-10">
              <h3 className="text-xl font-medium mb-6 uppercase tracking-widest text-foreground">
                Payment Method
              </h3>
              <div className="space-y-3">
                {(
                  Object.keys(PAYMENT_METHODS) as Array<
                    keyof typeof PAYMENT_METHODS
                  >
                ).map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="h-4 w-4 accent-black"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {PAYMENT_METHODS[method]}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Online methods are processed securely through Razorpay Checkout.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase tracking-widest text-xs font-bold transition-all mt-8"
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? "Processing..."
                : paymentMethod === "COD"
                  ? "Place Order"
                  : "Place Order & Pay"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
