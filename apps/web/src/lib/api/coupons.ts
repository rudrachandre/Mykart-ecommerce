const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';


export async function validateCoupon(token: string, code: string, orderValue: number) {
  const res = await fetch(`${BASE_URL}/api/v1/coupons/validate?code=${encodeURIComponent(code)}&orderValue=${orderValue}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Invalid coupon');
  }
  return res.json();
}
