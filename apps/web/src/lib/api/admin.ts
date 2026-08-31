const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
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

export async function changeUserRole(token: string, userId: string, role: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update user role');
  }
  return res.json();
}

export async function setSellerStatus(token: string, sellerId: string, status: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/sellers/${sellerId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update seller status');
  }
  return res.json();
}

export async function setProductStatus(token: string, productId: string, status: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/products/${productId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update product status');
  }
  return res.json();
}

export async function getPayments(token: string, skip: number = 0, take: number = 20) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/payments?skip=${skip}&take=${take}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

export async function getRefunds(token: string, skip: number = 0, take: number = 20) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/refunds?skip=${skip}&take=${take}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch refunds');
  return res.json();
}

export async function getAdminReviews(token: string, skip: number = 0, take: number = 20, reported?: boolean) {
  let url = `${BASE_URL}/api/v1/admin/reviews?skip=${skip}&take=${take}`;
  if (reported !== undefined) url += `&reported=${reported}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function updateReviewStatus(token: string, id: string, status: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/reviews/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update review status');
  }
  return res.json();
}

export async function deleteReview(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/reviews/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete review');
  return res.json();
}

export async function getSettings(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update settings');
  }
  return res.json();
}

export async function createCategory(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to create category');
  }
  return res.json();
}

export async function updateCategory(token: string, id: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update category');
  }
  return res.json();
}

export async function deleteCategory(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete category');
  return res.json();
}

export async function createBrand(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to create brand');
  }
  return res.json();
}

export async function updateBrand(token: string, id: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/brands/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to update brand');
  }
  return res.json();
}

export async function deleteBrand(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/brands/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete brand');
  return res.json();
}
