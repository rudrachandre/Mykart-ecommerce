const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL_ENV && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL_ENV || 'https://mykart-ecommerce.onrender.com';
const API_URL = `${BASE_URL}/api/v1`;

export async function getProfile(token: string) {
  try {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API server unreachable or offline — fall through to token payload fallback
  }

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
      if (payload.role) {
        return {
          id: payload.sub,
          email: payload.email || '',
          name: payload.email ? payload.email.split('@')[0] : 'User',
          role: payload.role,
          addresses: [],
          _count: { orders: 0, wishlists: 0, notifications: 0 },
        };
      }
    }
  } catch {
    // Fall through to error
  }

  throw new Error('Failed to fetch profile');
}

export async function updateProfile(token: string, data: { name?: string, avatar?: string }) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function changePassword(token: string, data: any) {
  const res = await fetch(`${API_URL}/users/me/password`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to change password');
  }
  return res.json();
}

// Addresses
export async function getAddresses(token: string) {
  const res = await fetch(`${API_URL}/users/me/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch addresses');
  return res.json();
}

export async function createAddress(token: string, data: any) {
  const res = await fetch(`${API_URL}/users/me/addresses`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create address');
  return res.json();
}

export async function updateAddress(token: string, id: string, data: any) {
  const res = await fetch(`${API_URL}/users/me/addresses/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update address');
  return res.json();
}

export async function deleteAddress(token: string, id: string) {
  const res = await fetch(`${API_URL}/users/me/addresses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete address');
  return res.json();
}
