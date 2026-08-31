const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';


export async function getWishlist(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch wishlist');
  return res.json();
}

export async function addToWishlist(token: string, productId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/wishlist/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) throw new Error('Failed to add to wishlist');
  return res.json();
}

export async function removeFromWishlist(token: string, itemId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/wishlist/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to remove from wishlist');
  return res.json();
}
