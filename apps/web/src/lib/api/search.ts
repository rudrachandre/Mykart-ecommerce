const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production');
const BASE_URL = API_URL || 'http://localhost:3001';

export async function searchProducts(query: Record<string, string | number | boolean> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const res = await fetch(`${BASE_URL}/api/v1/search?${searchParams.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch search results');
  return res.json();
}

export async function autocompleteProducts(q: string) {
  if (!q) return [];
  const searchParams = new URLSearchParams({ q });
  const res = await fetch(`${BASE_URL}/api/v1/search/autocomplete?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch autocomplete results');
  return res.json();
}
