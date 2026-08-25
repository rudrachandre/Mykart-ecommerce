const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production');
const BASE_URL = API_URL || 'http://localhost:3001';

export async function getProductReviews(productId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/product/${productId}`, {
    next: { revalidate: 60 } // Revalidate every minute
  });
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function submitReview(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
}
