import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/lib/catalog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
