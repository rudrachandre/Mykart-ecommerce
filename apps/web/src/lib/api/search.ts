const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[search] NEXT_PUBLIC_API_URL is not set — falling back to localhost');
}
const BASE_URL = API_URL || 'http://localhost:3001';


const autocompleteCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(q: string): string {
  return q.trim().toLowerCase();
}

function getCachedResult(q: string) {
  const key = getCacheKey(q);
  const cached = autocompleteCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  autocompleteCache.delete(key);
  return null;
}

function setCachedResult(q: string, data: any) {
  const key = getCacheKey(q);
  autocompleteCache.set(key, { data, timestamp: Date.now() });
}

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

export async function autocompleteProducts(q: string, signal?: AbortSignal) {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const cached = getCachedResult(trimmed);
  if (cached) return cached;

  const searchParams = new URLSearchParams({ q: trimmed });
  const res = await fetch(`${BASE_URL}/api/v1/search/autocomplete?${searchParams.toString()}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch autocomplete results');
  const data = await res.json();
  setCachedResult(trimmed, data);
  return data;
}
