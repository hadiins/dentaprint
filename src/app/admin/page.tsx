import Link from 'next/link';
import { dashboardStats } from '@/lib/admin/data';
import DbRequired from '@/components/admin/DbRequired';
import { fa, toman } from '@/lib/format';

export default async function AdminHome() {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const s = await dashboardStats();
  const cards: [string, string, string, string][] = [
    ['🤝', 'درخواست همکاری در انتظار', fa(s.pendingPartners), '/admin/partners?status=PENDING'],
    ['📄', 'مدرک در انتظار بررسی', fa(s.pendingDocs), '/admin/partners'],
    ['📦', 'سفارش آمادهٔ ارسال', fa(s.toShip), '/admin/orders?status=PAID'],
    ['💰', `فروش امروز (${fa(s.todayOrders)} سفارش)`, toman(s.todaySales), '/admin/orders'],
    ['🧪', 'محصول فعال', fa(s.products), '/admin/products'],
  ];
  return (
    <div className="admin">
      <div className="kpis">{cards.map(([i, l, v, h]) => <Link key={l} href={h} className="kpi"><span>{i}</span><b>{v}</b><small>{l}</small></Link>)}</div>
      <section className="admin-card">
        <h3>موجودی رو به اتمام</h3>
        {s.lowStock.length === 0 ? <p style={{ color: 'var(--muted)' }}>همهٔ محصولات موجودی کافی دارند.</p>
          : <ul className="plain">{s.lowStock.map((p) => <li key={p.id}><Link href={`/admin/products/${p.id}`}>{p.name}</Link> — <span className={`state ${p.stock === 0 ? 'bad' : 'wait'}`}>{p.stock === 0 ? 'ناموجود' : `${fa(p.stock)} عدد`}</span></li>)}</ul>}
      </section>
    </div>
  );
}
