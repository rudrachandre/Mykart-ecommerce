/**
 * MyKart Pricing and Discount Calculation Utility
 * Handles Indian Rupee currency formatting, percentage discounts, flat savings,
 * and deal status calculations using real product pricing data.
 */

export interface DiscountInfo {
  discountPercent: number;
  savings: number;
  hasDiscount: boolean;
  mrp: number;
  sellingPrice: number;
}

/**
 * Formats a numeric price into standard Indian Rupee representation (e.g. ₹1,499)
 */
export function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  return `₹${numeric.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

/**
 * Calculates discount percentage and monetary savings from basePrice (MRP) and salePrice.
 */
export function calculateDiscount(
  basePrice: number | string | null | undefined,
  salePrice?: number | string | null | undefined,
): DiscountInfo {
  const mrp = Number(basePrice) || 0;
  const selling = salePrice !== null && salePrice !== undefined && Number(salePrice) > 0 
    ? Number(salePrice) 
    : mrp;

  if (mrp <= 0 || selling >= mrp) {
    return {
      discountPercent: 0,
      savings: 0,
      hasDiscount: false,
      mrp,
      sellingPrice: mrp,
    };
  }

  const savings = Math.max(0, mrp - selling);
  const discountPercent = Math.min(99, Math.max(1, Math.round((savings / mrp) * 100)));

  return {
    discountPercent,
    savings,
    hasDiscount: true,
    mrp,
    sellingPrice: selling,
  };
}

/**
 * Returns formatted discount badge text (e.g. "52% off" or "52% OFF")
 */
export function formatDiscountBadge(discountPercent: number, uppercase = false): string {
  if (!discountPercent || discountPercent <= 0) return '';
  return uppercase ? `${discountPercent}% OFF` : `${discountPercent}% off`;
}

/**
 * Returns appropriate deal label based on discount percentage and inventory.
 */
export function getDealStatus(
  discountPercent: number,
  stockQuantity?: number,
): { label: string; variant: 'deal' | 'limited' | 'fast' | 'saving' } | null {
  if (discountPercent <= 0) return null;

  if (stockQuantity !== undefined && stockQuantity > 0 && stockQuantity <= 5) {
    return { label: 'Deal selling fast', variant: 'fast' };
  }

  if (discountPercent >= 40) {
    return { label: 'Limited time deal', variant: 'limited' };
  }

  if (discountPercent >= 20) {
    return { label: "Today's Deal", variant: 'deal' };
  }

  return { label: 'Special Offer', variant: 'saving' };
}

/**
 * Computes remaining time until an ISO timestamp expiry.
 */
export function getTimeRemaining(expiryTimestamp?: string | null): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  if (!expiryTimestamp) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const total = Date.parse(expiryTimestamp) - Date.now();
  if (total <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor(total / (1000 * 60 * 60));

  return { hours, minutes, seconds, isExpired: false };
}
