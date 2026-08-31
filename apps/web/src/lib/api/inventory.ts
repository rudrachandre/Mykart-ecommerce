const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';


export async function getInventoryByVariantId(token: string, variantId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/inventory/variant/${variantId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function updateInventoryStock(
  token: string,
  variantId: string,
  quantity: number,
  reason?: string,
) {
  const res = await fetch(`${BASE_URL}/api/v1/inventory/variant/${variantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity, reason }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update inventory');
  }
  return res.json();
}

export async function getLowStockItems(
  token: string,
  params: {
    threshold?: number;
    page?: number;
    limit?: number;
    sellerId?: string;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.threshold !== undefined) query.set('threshold', String(params.threshold));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sellerId) query.set('sellerId', params.sellerId);

  const res = await fetch(`${BASE_URL}/api/v1/inventory/low-stock?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch low stock items');
  return res.json();
}

export async function bulkUpdateInventory(
  token: string,
  updates: Array<{ variantId: string; quantity: number }>,
) {
  const res = await fetch(`${BASE_URL}/api/v1/inventory/bulk-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to bulk update inventory');
  }
  return res.json();
}

export async function adjustInventoryStock(
  token: string,
  variantId: string,
  quantity: number,
  reason?: string,
) {
  const res = await fetch(`${BASE_URL}/api/v1/inventory/variant/${variantId}/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity, reason }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to adjust inventory');
  }
  return res.json();
}

export async function getInventoryTransactions(
  token: string,
  variantId: string,
  page: number = 1,
  limit: number = 20,
) {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));

  const res = await fetch(`${BASE_URL}/api/v1/inventory/variant/${variantId}/transactions?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch inventory transactions');
  return res.json();
}
