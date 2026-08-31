
const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[catalog] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';

/** 8-second timeout for all server-side catalog fetches.
 *  Prevents Vercel SSR from hanging indefinitely on a cold Render instance. */
function serverFetchOpts(revalidate: number): RequestInit {
  return {
    next: { revalidate },
    signal: AbortSignal.timeout(8000),
  };
}

export async function getProducts(query: Record<string, unknown> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const res = await fetch(
    `${BASE_URL}/api/v1/products?${searchParams.toString()}`,
    serverFetchOpts(60),
  );
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProductBySlug(slug: string) {
  const res = await fetch(
    `${BASE_URL}/api/v1/products/${slug}`,
    serverFetchOpts(60),
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch product');
  }
  return res.json();
}

export async function getCategories() {
  const res = await fetch(
    `${BASE_URL}/api/v1/categories?includeChildren=true`,
    serverFetchOpts(3600),
  );
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getCategoryBySlug(slug: string) {
  const res = await fetch(
    `${BASE_URL}/api/v1/categories/${slug}`,
    serverFetchOpts(3600),
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch category');
  }
  return res.json();
}

export async function getBrands() {
  const res = await fetch(
    `${BASE_URL}/api/v1/brands`,
    serverFetchOpts(3600),
  );
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
}

export async function getBrandBySlug(slug: string) {
  const res = await fetch(
    `${BASE_URL}/api/v1/brands/${slug}`,
    serverFetchOpts(3600),
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch brand');
  }
  return res.json();
}

