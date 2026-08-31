const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === "production") {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || "http://localhost:3001";

export async function onboardSeller(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/onboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    // Surface safe, user-facing validation messages from the API.
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Failed to onboard seller");
  }
  return res.json();
}

export async function getSellerProfile(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller profile");
  return res.json();
}

export async function updateSellerProfile(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update seller profile");
  return res.json();
}

export async function getSellerProducts(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/products`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller products");
  return res.json();
}

export async function getSellerOrders(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller orders");
  return res.json();
}

export async function createProduct(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function updateProduct(token: string, id: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/products/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    // Surface safe, user-facing validation/error messages from the API
    // instead of an opaque generic failure.
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Failed to update product");
  }
  return res.json();
}

export async function deleteProduct(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

export async function getSellerDashboard(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller dashboard");
  return res.json();
}

export async function updateOrderStatus(
  token: string,
  orderId: string,
  status: string,
) {
  const res = await fetch(
    `${BASE_URL}/api/v1/sellers/orders/${orderId}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
}

export async function getSellerOrderDetail(token: string, orderId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller order detail");
  return res.json();
}

export async function approveReturn(token: string, orderId: string, returnId: string) {
  const res = await fetch(
    `${BASE_URL}/api/v1/sellers/orders/${orderId}/returns/${returnId}/approve`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error("Failed to approve return");
  return res.json();
}

export async function rejectReturn(token: string, orderId: string, returnId: string) {
  const res = await fetch(
    `${BASE_URL}/api/v1/sellers/orders/${orderId}/returns/${returnId}/reject`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error("Failed to reject return");
  return res.json();
}

export async function getSellerReviews(token: string, page: number = 1, limit: number = 10) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/reviews?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller reviews");
  return res.json();
}

export async function getSellerAnalytics(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/sellers/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch seller analytics");
  return res.json();
}

export async function getCoupons(token: string) {
  const res = await fetch(`${BASE_URL}/api/v1/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch coupons");
  return res.json();
}

export async function createCoupon(token: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/coupons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Failed to create coupon");
  }
  return res.json();
}

export async function updateCoupon(token: string, id: string, data: any) {
  const res = await fetch(`${BASE_URL}/api/v1/coupons/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Failed to update coupon");
  }
  return res.json();
}

export async function deleteCoupon(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/v1/coupons/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete coupon");
  return res.json();
}
