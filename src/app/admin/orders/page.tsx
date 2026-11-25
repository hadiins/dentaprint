import Link from 'next/link';
import { listOrders } from '@/lib/admin/data';
import { ORDER_STATUS_LABEL } from '@/lib/admin/order-workflow';
import DbRequired from '@/components/admin/DbRequired';
import { one, faDate } from '@/components/admin/Flash';
import { fa, toman } from '@/lib/format';

export const metadata = { title: 'سفارش‌ها' };
type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const cls = (s: string) => (s === 'PENDING_PAYMENT' || s === 'PAID' || s === 'PROCESSING' ? 'wait' : s === 'CANCELLED' || s === 'REFUNDED' ? 'bad' : 'ok');

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const sp = await searchParams; const status = one(sp.status), q = one(sp.q);
  const rows = await listOrders({ status: status || undefined, q: q || undefined });
  return (
    <div className="admin">
      <h1 className="admin-h1">سفارش‌ها</h1>
      <div className="chips">
        {[['', 'همه'], ...Object.entries(ORDER_STATUS_LABEL)].map(([k, l]) => <Link key={k} href={`/admin/orders${k ? `?status=${k}` : ''}`} className={status === k ? 'on' : ''}>{l}</Link>)}
      </div>
      <form className="filterbar"><input type="hidden" name="status" value={status} /><input type="search" name="q" defaultValue={q} placeholder="شمارهٔ سفارش، موبایل، کد رهگیری…" /><button className="btn btn-main" style={{ padding: '10px 20px' }}>جستجو</button></form>
      <section className="admin-card" style={{ overflowX: 'auto' }}>
        {rows.length === 0 ? <p style={{ color: 'var(--muted)' }}>سفارشی یافت نشد.</p> :
          <table className="admin-table"><thead><tr><th>شماره</th><th>مشتری</th><th>اقلام</th><th>نوع قیمت</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} style={{ color: 'var(--c1)', fontWeight: 700 }} dir="ltr">{o.number}</Link></td>
                <td>{o.user.fullName || o.receiver || '—'}<br /><small dir="ltr">{o.user.phone}</small></td>
                <td>{fa(o._count.items)}</td>
                <td>{o.priceMode === 'PARTNER' ? `همکار ${o.tierSlug ?? ''}` : 'مصرف‌کننده'}</td>
                <td>{toman(o.total)}</td>
                <td><span className={`state ${cls(o.status)}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td><small>{faDate(o.createdAt)}</small></td>
              </tr>))}</tbody></table>}
      </section>
    </div>
  );
}
