import { MetadataRoute } from 'next';
import { getProducts, getCategories, getBrands } from '@/lib/api/catalog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mykart-ecommerce-web.vercel.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/brands`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/deals`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const [productsRes, categoriesRes, brandsRes] = await Promise.all([
      getProducts({ limit: 100 }).catch(() => ({ items: [] })),
      getCategories().catch(() => []),
      getBrands().catch(() => []),
    ]);

    const productUrls: MetadataRoute.Sitemap = (productsRes.items || []).map((p: any) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const categoryUrls: MetadataRoute.Sitemap = (categoriesRes || []).map((c: any) => ({
      url: `${baseUrl}/categories/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    const brandUrls: MetadataRoute.Sitemap = (brandsRes || []).map((b: any) => ({
      url: `${baseUrl}/brands/${b.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...productUrls, ...categoryUrls, ...brandUrls];
  } catch {
    return staticRoutes;
  }
}
