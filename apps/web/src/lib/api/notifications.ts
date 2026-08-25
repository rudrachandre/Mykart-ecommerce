const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL_ENV && process.env.NODE_ENV === 'production')
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
const BASE_URL = API_URL_ENV || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/v1`;

export async function getNotifications(token: string) {
  const res = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markAsRead(token: string, id: string) {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

export async function markAllAsRead(token: string) {
  const res = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
  return res.json();
}
