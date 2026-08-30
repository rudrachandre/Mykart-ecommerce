const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production');
const BASE_URL = API_URL || 'http://localhost:3001';

export async function getUsers(token: string, skip: number = 0, take: number = 20, search?: string, role?: string) {
  let url = `${BASE_URL}/api/v1/admin/users?skip=${skip}&take=${take}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (role && role !== 'ALL') url += `&role=${encodeURIComponent(role)}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function getSellers(token: string, skip: number = 0, take: number = 20, search?: string) {
  let url = `${BASE_URL}/api/v1/admin/sellers?skip=${skip}&take=${take}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch sellers');
  return res.json();
}

export async function getOrders(token: string, skip: number = 0, take: number = 20, search?: string, status?: string) {
  let url = `${BASE_URL}/api/v1/admin/orders?skip=${skip}&take=${take}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status && status !== 'ALL') url += `&status=${encodeURIComponent(status)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function getAdminOrderDetail(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch admin order detail');
  return res.json();
}

export async function processRefund(token: string, id: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/orders/${id}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to process refund');
  }
  return res.json();
}

export async function getSellerById(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/sellers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch seller');
  return res.json();
}

export async function getAdminProducts(token: string, skip: number = 0, take: number = 20, search?: string) {
  let url = `${BASE_URL}/api/v1/admin/products?skip=${skip}&take=${take}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}
