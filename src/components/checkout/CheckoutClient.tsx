'use client';
import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import type { Product } from '@/lib/catalog-meta';
import { buildOrderDraft } from '@/lib/orders';
import { fa, toman } from '@/lib/format';
import type { PaymentRedirect } from '@/lib/payments/types';
import { useCart, useCommerce, usePriceView } from '../Providers';
import { buyerFromView } from '../ProductCard';
import { parseLineKey } from '@/lib/variants';

interface Props { products: Product[]; gateways: { id: string; label: string }[]; defaultGateway?: string; defaults: { fullName: string; phone: string } }

/** هدایت به درگاه — هم GET و هم ارسال فرم POST (درگاه‌های بانکی) */
function goToGateway(r: PaymentRedirect) {
  if (r.method === 'GET') { window.location.href = r.url; return; }
  const form = document.createElement('form');
  form.method = 'POST'; form.action = r.url;
  Object.entries(r.fields).forEach(([k, v]) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i); });
  document.body.appendChild(form); form.submit();
}

export default function CheckoutClient({ products, gateways, defaultGateway, defaults }: Props) {
  const { items, setQty } = useCart();
  const commerce = useCommerce();
  const { view } = usePriceView();
  const buyer = buyerFromView(view, commerce.active);
  const [gateway, setGateway] = useState(defaultGateway ?? gateways[0]?.id ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [official, setOfficial] = useState(false);

  const lines = Object.entries(items).map(([key, qty]) => { const { slug, variant } = parseLineKey(key); return { key, slug, variant, qty }; });
  const draftResult = useMemo(() => buildOrderDraft(lines, (s) => products.find((p) => p.slug === s), buyer, commerce),
    [items, view, commerce]); // eslint-disable-line react-hooks/exhaustive-deps
  const draft = draftResult.ok ? draftResult.draft : null;
  const draftError = draftResult.ok ? '' : draftResult.error;
  const productOf = (slug: string) => products.find((p) => p.slug === slug);

  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const customer: Record<string, unknown> = Object.fromEntries(['fullName', 'phone', 'province', 'city', 'address', 'postalCode'].map((k) => [k, String(f.get(k) ?? '').trim()]));
    if (official) customer.officialInvoice = { orgName: String(f.get('inv_org') ?? '').trim(), economicCode: String(f.get('inv_eco') ?? '').trim(), nationalId: String(f.get('inv_nid') ?? '').trim() };
    if (!gateway) return setErr('درگاه پرداختی فعال نیست.');
    setErr(''); setBusy(true);
    try {
      const o = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines.map(({ slug, variant, qty }) => ({ slug, variant, qty })), customer, priceView: view }) });
      const od = await o.json(); if (!o.ok) throw new Error(od.error);
      const s = await fetch('/api/payments/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: od.orderId, gateway }) });
      const sd = await s.json(); if (!s.ok) throw new Error(sd.error);
      goToGateway(sd.redirect);
    } catch (x) { setErr(x instanceof Error ? x.message : 'خطا در شروع پرداخت'); setBusy(false); }
  }

  if (lines.length === 0) return <div className="empty">سبد خرید شما خالی است. <Link href="/products" style={{ color: 'var(--c1)' }}>رفتن به فروشگاه</Link></div>;

  return (
    <div className="checkout">
      <div className="co-items">
        {lines.map(({ key, slug, variant, qty }) => {
          const p = productOf(slug); const l = draft?.lines.find((x) => x.slug === slug && (x.variantKey ?? null) === (variant ?? null));
          if (!p) return null;
          return (
            <div className="co-item" key={key}>
              <div className="mini">{p.icon}</div>
              <div style={{ flex: 1 }}>
                <Link href={`/products/${slug}`}><b>{p.name}</b></Link>
                {l?.variantLabel && <div className="opt-chip" style={{ marginRight: 0 }}>🎨 {l.variantLabel}</div>}
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {l ? <>{toman(l.unitPrice)} × {fa(qty)}{l.unitPrice < l.retailUnitPrice && <span className="ptag" style={{ marginRight: 6 }}>قیمت همکار</span>}</> : !p.inStock && 'ناموجود — لطفاً حذف کنید'}
                </div>
              </div>
              <div className="stepper">
                <button type="button" aria-label="افزایش" onClick={() => setQty(key, qty + 1)}>+</button>
                <input readOnly value={fa(qty)} aria-label="تعداد" />
                <button type="button" aria-label="کاهش" onClick={() => setQty(key, qty - 1)}>−</button>
              </div>
              <b style={{ minWidth: 130, textAlign: 'left' }}>{l ? toman(l.lineTotal) : '—'}</b>
            </div>
          );
        })}
      </div>

      <form className="bform co-form" onSubmit={pay} noValidate>
        <h3>اطلاعات ارسال</h3>
        <input name="fullName" defaultValue={defaults.fullName} placeholder="نام گیرنده / نام لابراتوار" autoComplete="name" />
        <input name="phone" defaultValue={defaults.phone} placeholder="موبایل گیرنده (۰۹۱۲...)" inputMode="numeric" autoComplete="tel" />
        <div className="two"><input name="province" placeholder="استان" /><input name="city" placeholder="شهر" /></div>
        <input name="address" placeholder="آدرس کامل" autoComplete="street-address" />
        <input name="postalCode" placeholder="کد پستی ۱۰ رقمی" inputMode="numeric" />

        <label className="admin-row" style={{ fontSize: 14 }}><input type="checkbox" checked={official} onChange={(e) => setOfficial(e.target.checked)} /> فاکتور رسمی با کد اقتصادی می‌خواهم</label>
        {official && (<>
          <input name="inv_org" placeholder="نام حقوقی خریدار (شرکت / لابراتوار)" />
          <div className="two"><input name="inv_eco" placeholder="کد اقتصادی (۱۲ یا ۱۴ رقم)" inputMode="numeric" dir="ltr" /><input name="inv_nid" placeholder="شناسهٔ ملی / کد ملی" inputMode="numeric" dir="ltr" /></div>
        </>)}

        <h3 style={{ fontSize: 17, marginTop: 6 }}>روش پرداخت</h3>
        {gateways.length === 0
          ? <div className="hint">هنوز درگاه پرداختی فعال نشده است.</div>
          : <div className="gws">{gateways.map((g) => (
              <label key={g.id} className={gateway === g.id ? 'on' : ''}>
                <input type="radio" name="gw" checked={gateway === g.id} onChange={() => setGateway(g.id)} /> {g.label}
              </label>))}
            </div>}

        {draft && (
          <div className="summary">
            <div><span>جمع کالاها</span><span>{toman(draft.retailSubtotal)}</span></div>
            {draft.discountTotal > 0 && <div className="save"><span>تخفیف همکاری</span><span>− {toman(draft.discountTotal)}</span></div>}
            <div><span>هزینهٔ ارسال</span><span>{draft.shipping ? toman(draft.shipping) : 'رایگان'}</span></div>
            <div className="tot"><span>مبلغ قابل پرداخت</span><span>{toman(draft.total)}</span></div>
          </div>
        )}
        {!draft && <div className="hint">{draftError} — آن ردیف را اصلاح یا حذف کنید (برای انتخاب رنگ/فرم روی نام محصول بزنید).</div>}
        <div className="err" role="alert">{err}</div>
        <button className="btn btn-main" disabled={busy || !draft || gateways.length === 0}>{busy ? 'در حال انتقال به درگاه…' : 'پرداخت آنلاین'} <span className="arr">←</span></button>
        <small style={{ color: 'var(--muted)', fontSize: 12 }}>مبلغ نهایی در سرور دوباره محاسبه می‌شود.</small>
      </form>
    </div>
  );
}
