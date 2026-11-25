import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { getCommerceSettings } from '@/lib/settings';
import { activeTiers } from '@/lib/commerce-config';
import { tierProgress } from '@/lib/tier-progress';
import { getRepo } from '@/lib/payments';
import { fa, toman } from '@/lib/format';
import LogoutButton from '@/components/account/LogoutButton';
import DocumentsPanel, { type DocRow } from '@/components/account/DocumentsPanel';
import { canUploadDoc, type DocKind, type DocStatus } from '@/lib/partners/documents';

export const metadata: Metadata = { title: 'حساب کاربری', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = {
  PENDING_PAYMENT: 'در انتظار پرداخت', PAID: 'پرداخت‌شده', PROCESSING: 'در حال آماده‌سازی', SHIPPED: 'ارسال‌شده',
  DELIVERED: 'تحویل‌شده', CANCELLED: 'لغوشده', REFUNDED: 'مرجوع‌شده',
};
const VERIFY: Record<string, string> = { NONE: 'در انتظار تأیید', BASIC: 'تأیید هویت و محل کار', DOCUMENTS: 'تأیید با مدرک رسمی' };
const date = (ms?: number) => (ms ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(ms)) : '—');

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');
  const [settings, repo] = await Promise.all([getCommerceSettings(), getRepo()]);
  const tiers = activeTiers(settings);
  const orders = await repo.listOrdersByAccount(user.phone, 20);
  const p = user.partner;
  const approved = p?.status === 'APPROVED';
  const current = approved ? tiers.find((t) => t.id === p.tierSlug) ?? null : null;
  const spend = approved ? await repo.paidSpendByAccount(user.phone, Date.now() - settings.evaluationWindowDays * 86_400_000) : 0;
  const prog = approved ? tierProgress(current, spend, p.verification, tiers) : null;
  const months = Math.round(settings.evaluationWindowDays / 30);

  // مدارک (فقط با پایگاه داده)
  let docs: DocRow[] | null = null; let docBlock: string | null = null;
  if (p && process.env.DATABASE_URL) {
    const { partnerOfUser, listDocs } = await import('@/lib/partners/data');
    const prof = await partnerOfUser(user.id);
    if (prof) {
      const rows = await listDocs(prof.id);
      docs = rows.map((d) => ({ id: d.id, kind: d.kind as DocKind, status: d.status as DocStatus, originalName: d.originalName, reviewNote: d.reviewNote, createdAt: d.createdAt.toISOString(), size: d.size, isPdf: d.contentType === 'application/pdf' }));
      docBlock = canUploadDoc(prof.status, rows.length);
    }
  }
  const docTier = tiers.find((t) => t.requiresDocuments);

  return (
    <main className="page"><div className="wrap">
      <div className="page-head">
        <div><span className="eyebrow">حساب کاربری</span><h1>سلام {user.fullName ?? ''} 👋</h1><p style={{ color: 'var(--muted)' }} dir="ltr">{user.phone}</p></div>
        <LogoutButton />
      </div>

      <div className="account">
        <section className="acc-card">
          {!p && (<>
            <h3>همکار ما شوید</h3>
            <p>لابراتوار یا کلینیک دارید؟ با حساب همکاری قیمت ویژه بگیرید؛ داشتن پروانه شرط نیست.</p>
            <Link href="/#b2b" className="btn btn-main" style={{ justifySelf: 'start' }}>درخواست همکاری <span className="arr">←</span></Link>
          </>)}
          {p && !approved && (<>
            <h3>درخواست همکاری: {p.orgName}</h3>
            <span className={`state ${p.status === 'PENDING' ? 'wait' : 'bad'}`}>{p.status === 'PENDING' ? 'در حال بررسی — کارشناس ما به‌زودی تماس می‌گیرد' : p.status === 'REJECTED' ? 'درخواست تأیید نشد' : 'حساب همکاری موقتاً غیرفعال است'}</span>
            <p>تا زمان تأیید، خریدها با قیمت مصرف‌کننده انجام می‌شود. ارسال کارت ملی و عکس محل کار (یا پروانه، اگر دارید) بررسی را سریع‌تر می‌کند.</p>
          </>)}
          {approved && prog && (<>
            <div className="acc-tier">
              <span className="big">{current?.icon ?? '⭐'}</span>
              <div>
                <small style={{ color: 'var(--muted)' }}>{p.orgName} · {VERIFY[p.verification]}</small>
                <h3>همکار {current?.name ?? '—'}{current && <span className="gt"> · {fa(current.discountPercent)}٪ تخفیف</span>}</h3>
                {current?.freeShipping && <span className="state ok">ارسال رایگان</span>}
              </div>
            </div>
            <div>
              <div className="row-between"><span>خرید {fa(months)} ماه اخیر</span><b>{toman(spend)}</b></div>
              {prog.next ? (<>
                <div className="progress" role="progressbar" aria-valuenow={prog.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${prog.percent}%` }} /></div>
                <p style={{ fontSize: 14 }}>
                  {prog.remaining > 0
                    ? <>فقط <b>{toman(prog.remaining)}</b> خرید دیگر تا سطح <b>{prog.next.icon} {prog.next.name}</b> ({fa(prog.next.discountPercent)}٪ تخفیف)</>
                    : <>به حد نصاب سطح <b>{prog.next.name}</b> رسیده‌اید{prog.nextNeedsDocs ? '' : '؛ ارتقا به‌زودی اعمال می‌شود'}.</>}
                </p>
                {prog.nextNeedsDocs && <div className="hint">سطح {prog.next.name} نیاز به پروانه یا کد اقتصادی دارد. <a href="#documents" className="link">بارگذاری مدرک ←</a></div>}
              </>) : <p style={{ fontSize: 14 }}>🎉 شما در بالاترین سطح همکاری هستید.</p>}
              {p.tierLocked && <small style={{ color: 'var(--muted)' }}>سطح شما توسط مدیر تعیین شده است.</small>}
            </div>
          </>)}
        </section>

        {docs && <DocumentsPanel docs={docs} canUpload={!docBlock} blockReason={docBlock} needsDocsFor={docTier?.name} />}

        <section className="acc-card">
          <div className="row-between"><h3>سفارش‌های من</h3><Link href="/products" style={{ color: 'var(--c1)', fontSize: 14 }}>فروشگاه ←</Link></div>
          {orders.length === 0
            ? <p style={{ color: 'var(--muted)' }}>هنوز سفارشی ثبت نکرده‌اید.</p>
            : <div style={{ overflowX: 'auto' }}><table className="orders">
                <thead><tr><th>شمارهٔ سفارش</th><th>تاریخ</th><th>وضعیت</th><th>مبلغ</th><th></th></tr></thead>
                <tbody>{orders.map((o) => (
                  <tr key={o.id}><td dir="ltr" style={{ textAlign: 'right' }}>{o.number}</td><td>{date(o.createdAt)}</td>
                    <td><span className={`state ${o.status === 'PENDING_PAYMENT' ? 'wait' : o.status === 'CANCELLED' || o.status === 'REFUNDED' ? 'bad' : 'ok'}`}>{STATUS[o.status]}</span></td>
                    <td>{toman(o.total)}</td>
                    <td>{['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status) && <a href={`/invoices/${o.number}`} target="_blank" rel="noopener" className="link">🧾 فاکتور</a>}</td></tr>))}
                </tbody>
              </table></div>}
        </section>
      </div>
    </div></main>
  );
}
