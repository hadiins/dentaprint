import type { InvoiceView } from '@/lib/invoice/issue';
import { faDigits, formatJalali } from '@/lib/invoice/jalali';

const n = (v: number) => faDigits(v.toLocaleString('en-US')).replace(/,/g, '٬');

/** برگهٔ A4 فاکتور — طراحی‌شده برای چاپ و ذخیرهٔ PDF از مرورگر (شکل‌دهی کامل حروف فارسی) */
export default function InvoiceSheet({ inv }: { inv: InvoiceView }) {
  const { seller: s, buyer: b, data: d } = inv;
  const title = inv.type === 'OFFICIAL' ? 'صورتحساب فروش کالا و خدمات' : 'فاکتور فروش';
  return (
    <article className="invoice" dir="rtl">
      {inv.preview && <div className="inv-watermark">پیش‌نمایش — فاقد اعتبار</div>}
      <header className="inv-head">
        <div><b className="inv-brand">✦ {s.brandName}</b><small>{s.website}</small></div>
        <h1>{title}</h1>
        <table className="inv-meta"><tbody>
          <tr><td>شمارهٔ فاکتور</td><td dir="ltr">{faDigits(inv.number)}</td></tr>
          <tr><td>تاریخ صدور</td><td>{formatJalali(inv.issuedAt)}</td></tr>
          <tr><td>شمارهٔ سفارش</td><td dir="ltr">{inv.orderNumber}</td></tr>
        </tbody></table>
      </header>

      <section className="inv-party">
        <h2>مشخصات فروشنده</h2>
        <div className="inv-grid">
          <span>نام: <b>{s.legalName}</b></span>
          <span>کد اقتصادی: <b>{s.economicCode ? faDigits(s.economicCode) : '—'}</b></span>
          <span>شناسهٔ ملی: <b>{s.nationalId ? faDigits(s.nationalId) : '—'}</b></span>
          <span>شمارهٔ ثبت: <b>{s.registrationNo ? faDigits(s.registrationNo) : '—'}</b></span>
          <span className="wide">نشانی: {s.address}</span>
          <span>کد پستی: {s.postalCode ? faDigits(s.postalCode) : '—'}</span>
          <span>تلفن: {s.phone}</span>
        </div>
      </section>

      <section className="inv-party">
        <h2>مشخصات خریدار</h2>
        <div className="inv-grid">
          <span>نام{b.official ? ' (حقوقی)' : ''}: <b>{b.name}</b></span>
          {b.official && <span>کد اقتصادی: <b>{faDigits(b.economicCode ?? '—')}</b></span>}
          {b.official && <span>شناسه / کد ملی: <b>{b.nationalId ? faDigits(b.nationalId) : '—'}</b></span>}
          <span>تلفن: <b dir="ltr">{faDigits(b.phone)}</b></span>
          <span className="wide">نشانی: {b.address}</span>
          <span>کد پستی: {faDigits(b.postalCode)}</span>
        </div>
      </section>

      <table className="inv-items">
        <thead><tr>
          <th>ردیف</th><th>شرح کالا</th><th>کد کالا</th><th>تعداد</th><th>مبلغ واحد</th><th>مبلغ کل</th><th>تخفیف</th><th>پس از تخفیف</th>
          {d.vatRate && <th>ارزش افزوده</th>}<th>جمع</th>
        </tr></thead>
        <tbody>{d.lines.map((l) => (
          <tr key={l.row}>
            <td>{faDigits(l.row)}</td><td className="desc">{l.description}</td><td dir="ltr" className="sku">{l.sku}</td><td>{faDigits(l.quantity)}</td>
            <td>{n(l.unitPrice)}</td><td>{n(l.gross)}</td><td>{l.discount ? n(l.discount) : '—'}</td><td>{n(l.net)}</td>
            {d.vatRate && <td>{n(l.vat)}</td>}<td><b>{n(l.total)}</b></td>
          </tr>))}
        </tbody>
        <tfoot><tr>
          <td colSpan={5}>جمع کل ({d.currencyLabel})</td><td>{n(d.totals.gross)}</td><td>{n(d.totals.discount)}</td><td>{n(d.totals.net)}</td>
          {d.vatRate && <td>{n(d.totals.vat)}</td>}<td><b>{n(d.totals.total)}</b></td>
        </tr></tfoot>
      </table>

      <div className="inv-sum">
        <div>مبلغ قابل پرداخت: <b>{n(d.totals.total)} {d.currencyLabel}</b></div>
        <div>به حروف: <b>{d.amountInWords}</b></div>
        <div>وضعیت: <b>پرداخت‌شده (آنلاین)</b>{d.vatRate ? ` · نرخ ارزش افزوده ${faDigits(d.vatRate)}٪` : ''}</div>
        {d.note && <div className="muted">{d.note}</div>}
      </div>

      <footer className="inv-foot">
        <div className="sign">مهر و امضای فروشنده</div>
        <div className="sign">امضای خریدار</div>
        <p>{s.footerNote}</p>
      </footer>
    </article>
  );
}
