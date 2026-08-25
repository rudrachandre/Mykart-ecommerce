/**
 * Server-authoritative shipping rule.
 *
 * This is the intended business rule already documented in the storefront UI
 * ("Free shipping on orders over ₹10,000" — apps/web/src/app/cart/page.tsx)
 * and asserted by the web E2E suite (apps/web/e2e/checkout-payment.spec.ts).
 * The backend is the only authority for shipping charges; client totals are
 * never trusted. The storefront mirrors this exact formula for display only.
 */
export const FREE_SHIPPING_THRESHOLD = 10000; // INR subtotal above which shipping is free
export const FLAT_SHIPPING_FEE = 50; // INR flat fee at/below the threshold

export function calculateShippingFee(subtotal: number): number {
  return subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}
