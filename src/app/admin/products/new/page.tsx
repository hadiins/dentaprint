import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';
import DbRequired from '@/components/admin/DbRequired';
import { getCommerceSettings } from '@/lib/settings';
import { activeTiers } from '@/lib/commerce-config';

export const metadata = { title: 'محصول جدید' };

export default async function NewProduct() {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const tiers = activeTiers(await getCommerceSettings());
  return (
    <div className="admin">
      <Link href="/admin/products" className="link">→ بازگشت به محصولات</Link>
      <h1 className="admin-h1">محصول جدید</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>بعد از ذخیرهٔ محصول، بخش بارگذاری عکس در همین صفحه نمایش داده می‌شود.</p>
      <ProductForm tiers={tiers} />
    </div>
  );
}
