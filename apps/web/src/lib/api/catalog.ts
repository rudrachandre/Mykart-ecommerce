
const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production');
const BASE_URL = API_URL || 'http://localhost:3001';

export async function getProducts(query: Record<string, unknown> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const res = await fetch(`${BASE_URL}/api/v1/products?${searchParams.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProductBySlug(slug: string) {
  const res = await fetch(`${BASE_URL}/api/v1/products/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch product');
  }
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${BASE_URL}/api/v1/categories?includeChildren=true`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getCategoryBySlug(slug: string) {
  const res = await fetch(`${BASE_URL}/api/v1/categories/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch category');
  }
  return res.json();
}

export async function getBrands() {
  const res = await fetch(`${BASE_URL}/api/v1/brands`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
}

export async function getBrandBySlug(slug: string) {
  const res = await fetch(`${BASE_URL}/api/v1/brands/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch brand');
  }
  return res.json();
}

