const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';


export async function getDashboardStats(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function getAuditLogs(token: string, skip: number = 0, take: number = 20, action?: string, userId?: string) {
  let url = `${BASE_URL}/api/v1/analytics/audit-logs?skip=${skip}&take=${take}`;
  if (action) url += `&action=${encodeURIComponent(action)}`;
  if (userId) url += `&userId=${encodeURIComponent(userId)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function getAnalyticsTrends(token: string, range?: string) {
  let url = `${BASE_URL}/api/v1/analytics/trends`;
  if (range) url += `?range=${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch analytics trends');
  return res.json();
}
