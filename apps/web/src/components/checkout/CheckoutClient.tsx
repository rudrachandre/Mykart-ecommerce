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
import { Check, CreditCard, MapPin, ShieldCheck, Tag, Truck } from "lucide-react";

const PAYMENT_METHODS = {
  COD: "Cash on Delivery",
  UPI: "UPI (Google Pay / PhonePe / PayTM)",
  CARD: "Credit / Debit Card",
  NETBANKING: "Net Banking",
  WALLET: "Wallets",
} as const;

export function CheckoutClient({
  token,
  items,
  subtotal,
  savedAddresses = [],
}: {
  token: string;
  items: any[];
  subtotal: number;
  savedAddresses?: any[];
}) {
  const router = useRouter();
  const { refreshCart } = useCart();

  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState("");

  const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddr ? defaultAddr.id : "new"
  );

  const [address, setAddress] = useState({
    fullName: defaultAddr ? defaultAddr.fullName : "",
    phone: defaultAddr ? defaultAddr.phone : "",
    addressLine1: defaultAddr ? defaultAddr.addressLine1 : "",
    addressLine2: defaultAddr ? defaultAddr.addressLine2 || "" : "",
    city: defaultAddr ? defaultAddr.city : "",
    state: defaultAddr ? defaultAddr.state : "",
    postalCode: defaultAddr ? defaultAddr.postalCode : "",
    country: defaultAddr ? defaultAddr.country || "India" : "India",
  });

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setAddress({
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      });
    } else {
      const found = savedAddresses.find((a) => a.id === id);
      if (found) {
        setAddress({
          fullName: found.fullName,
          phone: found.phone,
          addressLine1: found.addressLine1,
          addressLine2: found.addressLine2 || "",
          city: found.city,
          state: found.state,
          postalCode: found.postalCode,
          country: found.country || "India",
        });
      }
    }
  };

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
    if (checkoutLoading) return;
    setCheckoutLoading(true);

    try {
      const payload: any = { shippingAddress: address, paymentMethod };
      if (appliedCoupon) {
        payload.couponCode = appliedCoupon;
      }

      const result = await checkout(token, payload);

      if (!result.razorpayOrderId) {
        await refreshCart();
        toast.success("Order placed! Pay on delivery.");
        router.push(`/orders/${result.order.id}?success=true&cod=true`);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mykart_mock_123",
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
  const deliveryFee = calculateShippingFee(subtotal);
  const tax = Math.round((total) * 0.18 * 100) / 100;
  const finalTotal = total + deliveryFee + tax;

  const formattedFinalTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(finalTotal);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      {/* Progress Stepper Header */}
      <div className="mb-8 border-b border-border/40 pb-6">
        <div className="flex items-center justify-center max-w-xl mx-auto text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
              <Check className="w-3.5 h-3.5" />
            </span>
            <span>Cart</span>
          </div>
          <div className="w-12 sm:w-16 h-0.5 bg-primary mx-3" />
          <div className="flex items-center gap-2 text-foreground font-bold">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
              2
            </span>
            <span>Address & Payment</span>
          </div>
          <div className="w-12 sm:w-16 h-0.5 bg-border mx-3" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>Confirmation</span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleCheckout}
        className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-24 lg:pb-8 items-start"
      >
        {/* LEFT COLUMN: Address, Shipping Method, Payment Method, Coupon */}
        <div className="w-full lg:flex-1 space-y-8">
          {/* 1. Delivery Address */}
          <section className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                1. Delivery Address
              </h2>
            </div>

            {savedAddresses.length > 0 && (
              <div className="mb-6 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Select Saved Address
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((sa) => (
                    <label
                      key={sa.id}
                      onClick={() => handleSelectAddress(sa.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                        selectedAddressId === sa.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="selectedAddress"
                            checked={selectedAddressId === sa.id}
                            onChange={() => handleSelectAddress(sa.id)}
                            className="accent-primary"
                          />
                          <span className="font-bold text-sm">{sa.fullName}</span>
                        </div>
                        {sa.isDefault && (
                          <span className="text-[10px] uppercase font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        <p>{sa.addressLine1}</p>
                        {sa.addressLine2 && <p>{sa.addressLine2}</p>}
                        <p>{sa.city}, {sa.state} {sa.postalCode}</p>
                        <p className="pt-1 font-semibold text-foreground/80">{sa.phone}</p>
                      </div>
                    </label>
                  ))}
                  <label
                    onClick={() => handleSelectAddress("new")}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-center min-h-[100px] border-dashed ${
                      selectedAddressId === "new"
                        ? "border-primary bg-primary/5 font-bold"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={selectedAddressId === "new"}
                        onChange={() => handleSelectAddress("new")}
                        className="accent-primary"
                      />
                      <span className="text-xs uppercase tracking-wider font-bold text-foreground">
                        + Add New Address
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({ ...address, phone: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Address Line 1 *
                </label>
                <input
                  required
                  type="text"
                  value={address.addressLine1}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine1: e.target.value })
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={address.addressLine2}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine2: e.target.value })
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    City *
                  </label>
                  <input
                    required
                    type="text"
                    value={address.city}
                    onChange={(e) =>
                      setAddress({ ...address, city: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    State *
                  </label>
                  <input
                    required
                    type="text"
                    value={address.state}
                    onChange={(e) =>
                      setAddress({ ...address, state: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Postal Code *
                  </label>
                  <input
                    required
                    type="text"
                    value={address.postalCode}
                    onChange={(e) =>
                      setAddress({ ...address, postalCode: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Delivery Method */}
          <section className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                2. Delivery Method
              </h2>
            </div>
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">Standard Express Delivery</p>
                <p className="text-xs text-muted-foreground mt-0.5">Delivered in 2–4 business days with live tracking.</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
              </span>
            </div>
          </section>

          {/* 3. Payment Method */}
          <section className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                3. Payment Method
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                Object.keys(PAYMENT_METHODS) as Array<
                  keyof typeof PAYMENT_METHODS
                >
              ).map((method) => (
                <label
                  key={method}
                  className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                    paymentMethod === method
                      ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="accent-primary h-4 w-4"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {PAYMENT_METHODS[method]}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* 4. Coupon Code */}
          <section className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                4. Coupon / Promo Code
              </h2>
            </div>
            {appliedCoupon ? (
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <span className="text-sm text-emerald-800 font-bold uppercase tracking-wider">
                  Coupon Applied: {appliedCoupon}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs uppercase font-bold text-destructive hover:underline"
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
                  placeholder="Enter coupon code (e.g. MYKART10)"
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode}
                  className="rounded-lg h-10 px-6 font-bold text-xs"
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
          </section>
        </div>

        {/* RIGHT COLUMN: Sticky Order Summary */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="p-6 sm:p-8 bg-card border rounded-2xl sticky top-28 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
              Order Summary
            </h2>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 hide-scrollbar">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between text-xs sm:text-sm items-center"
                >
                  <span className="text-muted-foreground truncate mr-3 font-normal">
                    {item.quantity} × {item.product.name}
                  </span>
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(parseFloat(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm font-medium text-muted-foreground pt-3 border-t border-border/40">
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
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
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
                    deliveryFee === 0 ? "text-emerald-600 font-bold" : "text-foreground font-semibold"
                  }
                >
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (18%)</span>
                <span className="text-foreground font-semibold">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(tax)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-end">
              <span className="text-sm uppercase tracking-wider font-bold text-foreground">
                Total
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {formattedFinalTotal}
              </span>
            </div>

            <Button
              type="submit"
              disabled={checkoutLoading}
              className="w-full h-12 sm:h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider text-sm transition-all shadow-md hidden lg:flex items-center justify-center"
            >
              {checkoutLoading
                ? "Processing..."
                : paymentMethod === "COD"
                  ? "Place Order"
                  : "Place Order & Pay"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Encrypted & Safe Checkout</span>
            </div>
          </div>
        </div>

        {/* MOBILE STICKY BOTTOM CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg lg:hidden z-50 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Payable</p>
            <p className="text-lg font-extrabold text-foreground">{formattedFinalTotal}</p>
          </div>
          <Button
            type="submit"
            disabled={checkoutLoading}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md"
          >
            {checkoutLoading
              ? "Processing..."
              : paymentMethod === "COD"
                ? `Place Order • ${formattedFinalTotal}`
                : `Pay ${formattedFinalTotal}`}
          </Button>
        </div>
      </form>
    </>
  );
}
