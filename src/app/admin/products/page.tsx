import Link from 'next/link';
import { listProductsAdmin } from '@/lib/admin/data';
import { CATEGORIES, TYPE_LABELS, type ProductType } from '@/lib/catalog';
import { toggleProductAction } from '../actions';
import DbRequired from '@/components/admin/DbRequired';
import Flash, { one } from '@/components/admin/Flash';
import { fa, toman } from '@/lib/format';

export const metadata = { title: 'محصولات' };
type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function ProductsAdmin({ searchParams }: { searchParams: SP }) {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const sp = await searchParams; const q = one(sp.q), category = one(sp.category);
  const rows = await listProductsAdmin({ q: q || undefined, category: category || undefined });
  return (
    <div className="admin">
      <div className="admin-head"><h1 className="admin-h1">محصولات ({fa(rows.length)})</h1><Link href="/admin/products/new" className="btn btn-main">+ محصول جدید</Link></div>
      <Flash ok={one(sp.ok)} error={one(sp.error)} />
      <form className="filterbar">
        <input type="search" name="q" defaultValue={q} placeholder="نام، کد کالا…" />
        <select name="category" defaultValue={category}><option value="">همهٔ دسته‌ها</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <button className="btn btn-main" style={{ padding: '10px 20px' }}>فیلتر</button>
      </form>
      <section className="admin-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table"><thead><tr><th></th><th>محصول</th><th>دسته / نوع</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th></th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
              <td style={{ fontSize: 26 }}>{p.icon ?? '📦'}</td>
              <td><Link href={`/admin/products/${p.id}`} style={{ color: 'var(--c1)', fontWeight: 700 }}>{p.name}</Link><br /><small dir="ltr">{p.sku}</small></td>
              <td>{p.category.name}<br /><small>{TYPE_LABELS[p.type as ProductType]}</small></td>
              <td>{toman(p.retailPrice)}</td>
              <td><span className={`state ${p.stock === 0 ? 'bad' : p.stock <= 3 ? 'wait' : 'ok'}`}>{fa(p.stock)}</span></td>
              <td>{p.isActive ? 'فعال' : 'غیرفعال'}</td>
              <td><form action={toggleProductAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.isActive)} />
                <button className="link">{p.isActive ? 'غیرفعال کن' : 'فعال کن'}</button></form></td>
            </tr>))}</tbody></table>
      </section>
    </div>
  );
}
