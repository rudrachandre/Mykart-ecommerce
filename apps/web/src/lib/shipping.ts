/**
 * Display-side mirror of the server-authoritative shipping rule.
 *
 * The backend (apps/api/src/modules/orders/shipping.ts) is the ONLY authority
 * for shipping charges; this helper exists purely so the storefront can render
 * the same amount the server will charge. If the rule ever changes, change it
 * in BOTH places.
 */
export const FREE_SHIPPING_THRESHOLD = 10000; // INR subtotal above which shipping is free
export const FLAT_SHIPPING_FEE = 50; // INR flat fee at/below the threshold

export function calculateShippingFee(subtotal: number): number {
  return subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}
