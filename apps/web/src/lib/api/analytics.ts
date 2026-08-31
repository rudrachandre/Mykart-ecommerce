import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.accessToken) {
        Cookies.set('accessToken', data.accessToken, {
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        });
        return data.accessToken;
      }
    }
  } catch {
    // Refresh failed
  }
  return null;
}

async function fetchWithAuth(url: string, tokenParam?: string) {
  let token = tokenParam || Cookies.get('accessToken');

  if (!token) {
    token = (await refreshAccessToken()) || undefined;
  }

  let res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    cache: 'no-store',
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
        credentials: 'include',
        cache: 'no-store',
      });
    }
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errorBody || 'API request failed'}`);
  }

  return res.json();
}

export async function getDashboardStats(token?: string) {
  return fetchWithAuth(`${BASE_URL}/api/v1/analytics/overview`, token);
}

export async function getAuditLogs(token?: string, skip: number = 0, take: number = 20, action?: string, userId?: string) {
  let url = `${BASE_URL}/api/v1/analytics/audit-logs?skip=${skip}&take=${take}`;
  if (action) url += `&action=${encodeURIComponent(action)}`;
  if (userId) url += `&userId=${encodeURIComponent(userId)}`;
  return fetchWithAuth(url, token);
}

export async function getAnalyticsTrends(token?: string, range?: string) {
  let url = `${BASE_URL}/api/v1/analytics/trends`;
  if (range) url += `?range=${encodeURIComponent(range)}`;
  return fetchWithAuth(url, token);
}
