import Link from 'next/link';
import { listPartners } from '@/lib/admin/data';
import { PARTNER_STATUS_LABEL, VERIFICATION_LABEL } from '@/lib/admin/partner-review';
import DbRequired from '@/components/admin/DbRequired';
import { one, faDate } from '@/components/admin/Flash';
import { fa } from '@/lib/format';

export const metadata = { title: 'همکاران' };
type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const BT: Record<string, string> = { LAB: 'لابراتوار', CLINIC: 'کلینیک', RESELLER: 'نماینده', EDUCATION: 'آموزشی', OTHER: 'سایر' };

export default async function PartnersPage({ searchParams }: { searchParams: SP }) {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const sp = await searchParams; const status = one(sp.status), q = one(sp.q);
  const rows = await listPartners({ status: status || undefined, q: q || undefined });
  return (
    <div className="admin">
      <div className="admin-head"><h1 className="admin-h1">همکاران</h1></div>
      <div className="chips">
        {[['', 'همه'], ...Object.entries(PARTNER_STATUS_LABEL)].map(([k, l]) => <Link key={k} href={`/admin/partners${k ? `?status=${k}` : ''}`} className={status === k ? 'on' : ''}>{l}</Link>)}
      </div>
      <form className="filterbar"><input type="hidden" name="status" value={status} /><input type="search" name="q" defaultValue={q} placeholder="نام مجموعه، شهر، موبایل…" /><button className="btn btn-main" style={{ padding: '10px 20px' }}>جستجو</button></form>
      <section className="admin-card" style={{ overflowX: 'auto' }}>
        {rows.length === 0 ? <p style={{ color: 'var(--muted)' }}>موردی یافت نشد.</p> :
          <table className="admin-table"><thead><tr><th>مجموعه</th><th>مسئول / موبایل</th><th>نوع و شهر</th><th>پروانه</th><th>مدرک جدید</th><th>وضعیت</th><th>تأیید</th><th>سطح</th><th>تاریخ</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/partners/${p.id}`} style={{ color: 'var(--c1)', fontWeight: 700 }}>{p.orgName}</Link></td>
                <td>{p.user.fullName ?? '—'}<br /><small dir="ltr">{p.user.phone}</small></td>
                <td>{BT[p.businessType]} · {p.city}</td>
                <td>{p.hasLicense ? '✅' : '—'}</td>
                <td>{p._count.documents > 0 ? <Link href={`/admin/partners/${p.id}#docs`} className="state wait">{fa(p._count.documents)} در انتظار</Link> : '—'}</td>
                <td><span className={`state ${p.status === 'APPROVED' ? 'ok' : p.status === 'PENDING' ? 'wait' : 'bad'}`}>{PARTNER_STATUS_LABEL[p.status]}</span></td>
                <td><small>{VERIFICATION_LABEL[p.verification]}</small></td>
                <td>{p.tier ? `${p.tier.icon ?? ''} ${p.tier.name}` : '—'}</td>
                <td><small>{faDate(p.createdAt)}</small></td>
              </tr>))}</tbody></table>}
      </section>
    </div>
  );
}
