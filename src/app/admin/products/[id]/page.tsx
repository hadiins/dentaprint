import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import DbRequired from '@/components/admin/DbRequired';
import Flash, { one } from '@/components/admin/Flash';
import { getProductAdmin, listProductImages } from '@/lib/admin/data';
import ImageManager from '@/components/admin/ImageManager';
import { getMediaStorage } from '@/lib/media/storage';
import { getCommerceSettings } from '@/lib/settings';
import { activeTiers } from '@/lib/commerce-config';

type P = Promise<{ id: string }>; type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function EditProduct({ params, searchParams }: { params: P; searchParams: SP }) {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const [{ id }, sp, settings] = await Promise.all([params, searchParams, getCommerceSettings()]);
  const p = await getProductAdmin(id);
  if (!p) notFound();
  const storage = getMediaStorage();
  const images = (await listProductImages(id)).map((i) => ({ id: i.id, url: storage.url(i.key), alt: i.alt, optionValue: i.optionValue, width: i.width, height: i.height }));
  return (
    <div className="admin">
      <div className="admin-head"><Link href="/admin/products" className="link">→ بازگشت به محصولات</Link>{p.isActive && <Link href={`/products/${p.slug}`} className="link" target="_blank">مشاهده در فروشگاه ↗</Link>}</div>
      <h1 className="admin-h1">{p.name}</h1>
      <Flash ok={one(sp.ok)} />
      <ImageManager productId={p.id} initial={images} colorOption={p.options[0]} />
      <ProductForm product={p} tiers={activeTiers(settings)} />
    </div>
  );
}
