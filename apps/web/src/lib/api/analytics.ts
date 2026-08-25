const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production');
const BASE_URL = API_URL || 'http://localhost:3001';

export async function getDashboardStats(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function getAuditLogs(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/analytics/audit-logs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}
