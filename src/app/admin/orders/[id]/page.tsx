import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderAdmin } from '@/lib/admin/data';
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS } from '@/lib/admin/order-workflow';
import { changeOrderStatusAction, issueInvoiceAction } from '../../actions';
import { PAID_STATUSES } from '@/lib/payments/repo';
import { prisma } from '@/lib/prisma';
import DbRequired from '@/components/admin/DbRequired';
import Flash, { one, faDate } from '@/components/admin/Flash';
import { fa, toman } from '@/lib/format';

type P = Promise<{ id: string }>; type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const PAY: Record<string, string> = { INITIATED: 'شروع‌شده', SUCCEEDED: 'موفق', FAILED: 'ناموفق', CANCELLED: 'انصراف' };

export default async function OrderDetail({ params, searchParams }: { params: P; searchParams: SP }) {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await getOrderAdmin(id);
  if (!o) notFound();
  const addr = o.shippingAddress as Record<string, string>;
  const next = ORDER_TRANSITIONS[o.status];
  const invoice = await prisma.invoice.findUnique({ where: { orderId: o.id }, select: { number: true, type: true } });
  return (
    <div className="admin">
      <Link href="/admin/orders" className="link">→ بازگشت به سفارش‌ها</Link>
      <h1 className="admin-h1" dir="ltr" style={{ textAlign: 'right' }}>{o.number}</h1>
      <Flash ok={one(sp.ok)} error={one(sp.error)} />
      <div className="account">
        <section className="admin-card">
          <div className="row-between"><h3>اقلام</h3><span className="state wait">{ORDER_STATUS_LABEL[o.status]}</span></div>
          <table className="admin-table" style={{ minWidth: 0 }}><thead><tr><th>محصول</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
            <tbody>{o.items.map((i) => <tr key={i.id}><td>{i.productName}{i.variantLabel && <><br /><span className="opt-chip" style={{ marginRight: 0 }}>🎨 {i.variantLabel}</span></>}<br /><small dir="ltr">{i.sku}</small></td><td>{fa(i.quantity)}</td>
              <td>{toman(Number(i.unitPrice))}{i.unitPrice < i.retailUnitPrice && <><br /><small style={{ color: 'var(--muted)' }}><del>{fa(Number(i.retailUnitPrice))}</del></small></>}</td><td>{toman(Number(i.lineTotal))}</td></tr>)}</tbody></table>
          <div className="summary">
            <div><span>جمع کالاها</span><span>{toman(Number(o.subtotal))}</span></div>
            {o.discountTotal > BigInt(0) && <div className="save"><span>تخفیف همکاری ({o.tierSlug})</span><span>− {toman(Number(o.discountTotal))}</span></div>}
            <div><span>ارسال</span><span>{o.shippingCost > BigInt(0) ? toman(Number(o.shippingCost)) : 'رایگان'}</span></div>
            <div className="tot"><span>مبلغ کل</span><span>{toman(Number(o.total))}</span></div>
          </div>
          <h3 style={{ fontSize: 16 }}>ارسال به</h3>
          <p>{addr.fullName} — <span dir="ltr">{addr.phone}</span><br />{addr.province}، {addr.city}، {addr.address}<br />کد پستی: {addr.postalCode}</p>
          {o.trackingCode && <p>کد رهگیری: <b dir="ltr">{o.trackingCode}</b></p>}
          {o.needsOfficialInvoice && <p>🧾 درخواست فاکتور رسمی — کد اقتصادی خریدار: <b dir="ltr">{o.economicCode}</b></p>}
          <div className="admin-row">
            {invoice ? <a href={`/invoices/${o.number}`} target="_blank" rel="noopener" className="btn btn-glass">🧾 فاکتور {invoice.number}{invoice.type === 'OFFICIAL' ? ' (رسمی)' : ''}</a>
              : PAID_STATUSES.includes(o.status) && <form action={issueInvoiceAction}><input type="hidden" name="id" value={o.id} /><button className="btn btn-glass">🧾 صدور فاکتور</button></form>}
          </div>
          <h3 style={{ fontSize: 16 }}>پرداخت‌ها</h3>
          <ul className="plain">{o.payments.map((p) => <li key={p.id}>{p.gateway} — {PAY[p.status]} — {toman(Number(p.amount))}{p.refId && <> — کد پیگیری <b dir="ltr">{p.refId}</b></>}{p.cardPan && <small dir="ltr"> ({p.cardPan})</small>}</li>)}</ul>
        </section>

        <div className="admin" style={{ gap: 16 }}>
          <form action={changeOrderStatusAction} className="admin-card">
            <input type="hidden" name="id" value={o.id} />
            <h3>تغییر وضعیت</h3>
            {next.length === 0 ? <p style={{ color: 'var(--muted)' }}>این سفارش در وضعیت نهایی است.</p> : (<>
              <label className="fld"><span>وضعیت جدید</span>
                <select name="to" defaultValue={next[0]}>{next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select></label>
              {next.includes('SHIPPED') && <label className="fld"><span>کد رهگیری مرسوله (برای «ارسال‌شده» الزامی)</span><input name="trackingCode" dir="ltr" placeholder="مثلاً 1234567890" /></label>}
              <label className="fld"><span>یادداشت (اختیاری)</span><input name="note" placeholder="مثلاً: ارسال با پست پیشتاز" /></label>
              <button className="btn btn-main">ثبت وضعیت <span className="arr">←</span></button>
              <small style={{ color: 'var(--muted)' }}>در صورت تعریف الگو، به مشتری پیامک ارسال می‌شود. بازپرداخت وجه از پنل درگاه انجام می‌شود.</small>
            </>)}
          </form>
          <section className="admin-card">
            <h3>تاریخچه</h3>
            <ul className="plain">
              {o.statusHistory.map((h) => <li key={h.id}><small>{faDate(h.createdAt)}</small> — {ORDER_STATUS_LABEL[h.from]} ← {ORDER_STATUS_LABEL[h.to]}{h.note && ` (${h.note})`}</li>)}
              {o.paidAt && <li><small>{faDate(o.paidAt)}</small> — پرداخت آنلاین</li>}
              <li><small>{faDate(o.createdAt)}</small> — ثبت سفارش</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
