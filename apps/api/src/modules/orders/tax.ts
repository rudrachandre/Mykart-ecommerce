/**
 * Server-authoritative tax calculation.
 *
 * Tax is computed on the discounted subtotal (subtotal - discount) and is the
 * single source of truth for all tax-related amounts. The storefront mirrors
 * this formula for display only; backend values are never trusted from the
 * client.
 */

export const DEFAULT_TAX_RATE = 0.18;

export function getTaxRate(): number {
  const envRate = parseFloat(process.env.TAX_RATE || '');
  if (!isNaN(envRate) && envRate >= 0) {
    return envRate;
  }
  return DEFAULT_TAX_RATE;
}

export function calculateTax(subtotal: number, discount: number): number {
  const taxableAmount = Math.max(0, subtotal - discount);
  return Math.round(taxableAmount * getTaxRate() * 100) / 100;
}
