const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production');
const BASE_URL = API_URL || 'http://localhost:3001';

export async function checkout(token: string, payload: any) {
  const res = await fetch(`${BASE_URL}/api/v1/orders/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Checkout failed');
  return res.json();
}

export async function verifyPayment(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/orders/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Payment verification failed');
  return res.json();
}

export async function getOrders(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function getOrderById(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch order');
  return res.json();
}
