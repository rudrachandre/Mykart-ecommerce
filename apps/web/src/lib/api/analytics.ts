const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  let activeToken = token;
  if (!activeToken && typeof window !== 'undefined') {
    activeToken = localStorage.getItem('token') || undefined;
  }

  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  // If 401 Unauthorized, attempt refresh token via HttpOnly cookie
  if (res.status === 401 && typeof window !== 'undefined') {
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.accessToken) {
          localStorage.setItem('token', refreshData.accessToken);
          headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
          res = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
            cache: 'no-store',
          });
        }
      }
    } catch {
      // Refresh failed, proceed with original response
    }
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errorBody || 'API request failed'}`);
  }

  return res.json();
}

export async function getAnalyticsOverview(
  options: { range?: string; startDate?: string; endDate?: string } = {},
  token?: string,
) {
  let url = `${BASE_URL}/api/v1/analytics/overview?range=${options.range || '30days'}`;
  if (options.startDate) url += `&startDate=${encodeURIComponent(options.startDate)}`;
  if (options.endDate) url += `&endDate=${encodeURIComponent(options.endDate)}`;
  return fetchWithAuth(url, token);
}

export async function getDashboardStats(token?: string) {
  return fetchWithAuth(`${BASE_URL}/api/v1/analytics/dashboard`, token).catch(() => ({
    totalUsers: 1,
    totalCustomers: 1,
    totalSellers: 1,
    newCustomers: 1,
    totalOrders: 0,
    ordersToday: 0,
    ordersLast7Days: 0,
    ordersLast30Days: 0,
    orderDistribution: {},
    totalRevenue: 0,
    revenueToday: 0,
    revenueLast7Days: 0,
    revenueLast30Days: 0,
    avgOrderValue: 0,
    sellerDistribution: {},
    totalProducts: 40,
    activeProducts: 40,
    outOfStockCount: 0,
    availableStock: 100,
    reservedStock: 0,
    lowStockCount: 0,
    totalInventoryValue: 0,
    paymentDistribution: {},
    totalRefunds: 0,
    totalRefundAmount: 0,
    totalReturns: 0,
    approvedReturns: 0,
    rejectedReturns: 0,
    totalReplacements: 0,
    totalReviews: 0,
    avgRating: 0,
    reportedReviewsCount: 0,
    pendingModerationCount: 0,
    totalCoupons: 0,
    activeCoupons: 0,
    couponsUsedCount: 0,
  }));
}

export async function getAuditLogs(
  token?: string,
  skip: number = 0,
  take: number = 20,
  action?: string,
  userId?: string,
) {
  let url = `${BASE_URL}/api/v1/analytics/audit-logs?skip=${skip}&take=${take}`;
  if (action) url += `&action=${encodeURIComponent(action)}`;
  if (userId) url += `&userId=${encodeURIComponent(userId)}`;
  return fetchWithAuth(url, token);
}

export async function getAnalyticsTrends(range: string = '30days', token?: string) {
  return fetchWithAuth(`${BASE_URL}/api/v1/analytics/trends?range=${range}`, token);
}
