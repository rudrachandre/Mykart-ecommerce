const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL_ENV && process.env.NODE_ENV === 'production')
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
const BASE_URL = API_URL_ENV || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/v1`;

export async function getProfile(token: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
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
