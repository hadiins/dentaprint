'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSelection } from './SelectionContext';
import type { Product } from '@/lib/catalog-meta';
import { resolvePrice } from '@/lib/pricing';
import { activeVariants, findVariant, hasVariants, lineKey, pricedFor, valueAvailable, variantKey, variantLabel } from '@/lib/variants';
import { fa, toman } from '@/lib/format';
import { useCart, useCommerce, usePriceView, useToast } from '../Providers';
import { buyerFromView } from '../ProductCard';
import PriceSwitch from '../PriceSwitch';

export default function BuyBox({ p }: { p: Product }) {
  const { view, previewAllowed } = usePriceView();
  const { add, items } = useCart();
  const toast = useToast();
  const { active, quantityBreaks } = useCommerce();
  const buyer = buyerFromView(view, active);
  const [qty, setQty] = useState(1);
  const multi = hasVariants(p);
  const [sel, setSel] = useState<(string | null)[]>(() => (p.options ?? []).map((o) => (o.values.length === 1 ? o.values[0] : null)));
  const { setSelected } = useSelection();
  useEffect(() => { setSelected(sel); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const complete = multi && sel.every((s) => s != null);
  const variant = complete ? findVariant(p, variantKey(sel as string[])) : undefined;

  // تعدادی از همین محصول (رنگ‌های دیگر) که در سبد است — در حداقل تعداد همکار و پله‌ها حساب می‌شود
  const inCartOther = useMemo(() => Object.entries(items).reduce((s, [k, q]) => {
    const [slug, v] = k.split('::');
    return slug === p.slug && (v ?? null) !== (variant?.key ?? null) ? s + q : s;
  }, 0), [items, p.slug, variant?.key]);

  const priced = pricedFor(p, variant);
  const r = resolvePrice(priced, buyer, qty + (multi ? inCartOther : 0), quantityBreaks);
  const lineTotal = r.unitPrice * qty;
  const stockLeft = multi ? variant?.stock ?? 0 : Infinity;
  const canBuy = multi ? !!variant && variant.stock > 0 : p.inStock;
  const set = (n: number) => setQty(Math.max(1, Math.min(multi && variant ? Math.max(1, variant.stock) : 999, Math.floor(n) || 1)));

  const pick = (i: number, v: string) => setSel((s) => s.map((x, j) => (j === i ? (x === v ? null : v) : x)));

  function addToCart() {
    if (multi && !variant) return toast(`لطفاً ${p.options!.filter((_, i) => !sel[i]).map((o) => o.name).join(' و ')} را انتخاب کنید`);
    add(lineKey(p.slug, variant?.key), qty);
    toast(`✓ ${fa(qty)} عدد${variant ? ` (${variantLabel(p, variant)})` : ''} به سبد اضافه شد`);
  }

  return (
    <div className="buybox">
      <PriceSwitch />
      {multi && p.options!.map((o, i) => (
        <div key={o.name} className="opt-group">
          <div className="opt-title">{o.name}: <b>{sel[i] ?? 'انتخاب کنید'}</b></div>
          <div className="swatches" role="radiogroup" aria-label={o.name}>
            {o.values.map((v) => {
              const ok = valueAvailable(p, sel, i, v);
              return (
                <button key={v} type="button" role="radio" aria-checked={sel[i] === v}
                  className={`swatch${sel[i] === v ? ' on' : ''}${ok ? '' : ' out'}`} onClick={() => pick(i, v)}
                  title={ok ? v : `${v} — ناموجود`}>{v}</button>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        {r.mode === 'partner' && <span className="ptag">قیمت همکار</span>}
        <div>
          <span className="now">{toman(r.unitPrice)}</span>
          {r.mode === 'partner' ? <del>{fa(priced.retailPrice)}</del> : priced.compareAtPrice && <del>{fa(priced.compareAtPrice)}</del>}
        </div>
        {qty > 1 && <small style={{ color: 'var(--muted)' }}>جمع: {toman(lineTotal)}{r.mode === 'partner' && ` · صرفه‌جویی ${toman((priced.retailPrice - r.unitPrice) * qty)}`}</small>}
      </div>
      {r.hint && <div className="hint">{r.hint}{multi && ' (رنگ‌ها و فرم‌های مختلف با هم جمع می‌شوند)'}</div>}
      {multi && inCartOther > 0 && buyer.kind === 'partner' && <small style={{ color: 'var(--muted)' }}>{fa(inCartOther)} عدد دیگر از این محصول در سبد شماست و در قیمت همکار حساب شده است.</small>}
      <div className="buy-row">
        <div className="stepper">
          <button aria-label="افزایش" onClick={() => set(qty + 1)}>+</button>
          <input value={fa(qty)} onChange={(e) => set(Number(e.target.value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))))} inputMode="numeric" aria-label="تعداد" />
          <button aria-label="کاهش" onClick={() => set(qty - 1)}>−</button>
        </div>
        <button className="btn btn-main" disabled={!canBuy && !(multi && !variant)} onClick={addToCart}>
          {multi && !variant ? `انتخاب ${p.options!.filter((_, i) => !sel[i]).map((o) => o.name).join(' و ')}` : canBuy ? 'افزودن به سبد خرید' : 'ناموجود'}
        </button>
      </div>
      <span className={`stock${canBuy || (multi && !variant) ? '' : ' out'}`}>
        {multi
          ? variant ? (variant.stock > 0 ? `موجود${variant.stock <= 5 ? ` — فقط ${fa(variant.stock)} عدد` : ''} · کد کالا ${variant.sku}` : 'این ترکیب ناموجود است') : `${fa(activeVariants(p).filter((v) => v.stock > 0).length)} ترکیب موجود`
          : p.inStock ? 'موجود در انبار · ارسال ۲۴ ساعته' : 'ناموجود — موجود شد خبرم کن'}
      </span>
      {stockLeft !== Infinity && variant && qty >= variant.stock && variant.stock > 0 && <small style={{ color: 'var(--muted)' }}>حداکثر موجودی این ترکیب انتخاب شده است.</small>}
      {previewAllowed && <table className="tier-table">
        <thead><tr><th>سطح</th><th>قیمت واحد برای {fa(qty)} عدد</th></tr></thead>
        <tbody>
          <tr className={view === 'retail' ? 'cur' : ''}><td>مصرف‌کننده</td><td>{toman(priced.retailPrice)}</td></tr>
          {active.map((t) => {
            const tr = resolvePrice(priced, { kind: 'partner', tier: t, status: 'APPROVED' }, qty, quantityBreaks);
            return <tr key={t.id} className={view === t.id ? 'cur' : ''}><td>{t.icon} همکار {t.name}</td><td>{tr.mode === 'partner' ? toman(tr.unitPrice) : `از ${fa(p.partnerMinQty)} عدد`}</td></tr>;
          })}
        </tbody>
      </table>}
    </div>
  );
}
