'use client';
import Link from 'next/link';
import Image from 'next/image';
import { primaryImage } from '@/lib/media/gallery';
import type { MouseEvent } from 'react';
import type { Product } from '@/lib/catalog-meta';
import { CATEGORIES } from '@/lib/catalog-meta';
import { resolvePrice, type Buyer } from '@/lib/pricing';
import type { TierConfig } from '@/lib/commerce-config';
import { fa } from '@/lib/format';
import { activeVariants, hasVariants } from '@/lib/variants';
import { useCart, useCommerce, usePriceView, useToast } from './Providers';

export function buyerFromView(view: string, tiers: TierConfig[]): Buyer {
  const tier = tiers.find((t) => t.id === view);
  return tier ? { kind: 'partner', tier, status: 'APPROVED' } : { kind: 'retail' };
}

export default function ProductCard({ p }: { p: Product }) {
  const { view } = usePriceView();
  const { add } = useCart();
  const toast = useToast();
  const { active, quantityBreaks } = useCommerce();
  const buyer = buyerFromView(view, active);
  const qty = buyer.kind === 'partner' ? p.partnerMinQty : 1;
  const r = resolvePrice(p, buyer, qty, quantityBreaks);
  const firstBreak = quantityBreaks[0];
  const multi = hasVariants(p);
  const optSummary = multi ? p.options!.map((o) => `${fa(o.values.length)} ${o.name}`).join(' · ') : '';
  const img = primaryImage(p.images);
  const minVariantPrice = multi ? Math.min(...activeVariants(p).map((v) => v.retailPrice ?? p.retailPrice)) : p.retailPrice;
  const cat = CATEGORIES.find((c) => c.slug === p.category);
  const off = p.compareAtPrice ? Math.round(((p.compareAtPrice - p.retailPrice) / p.compareAtPrice) * 100) : 0;

  const tilt = (e: MouseEvent<HTMLElement>) => {
    if (!window.matchMedia('(pointer:fine)').matches) return;
    const c = e.currentTarget, b = c.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    c.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };

  return (
    <article className="pcard" onMouseMove={tilt} onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}>
      <Link href={`/products/${p.slug}`} className="pimg" aria-label={p.name}>
        {img ? <Image src={img.url} alt={img.alt || p.name} fill sizes="(max-width: 600px) 80vw, 300px" style={{ objectFit: 'contain', padding: 12 }} /> : <span aria-hidden>{p.icon}</span>}
        {r.mode === 'partner'
          ? <span className="badge">−{fa(r.savingsPercent)}٪ همکار</span>
          : off > 0 && <span className="badge">{fa(off)}٪</span>}
        {p.wavelength && <span className="wl">{p.wavelength}</span>}
      </Link>
      <div className="pbody">
        <small>{cat?.name}{!p.inStock && ' · ناموجود'}{multi && <span className="opt-chip">🎨 {optSummary}</span>}</small>
        <h4><Link href={`/products/${p.slug}`}>{p.name}</Link></h4>
        <div className="prow">
          <div>
            {r.mode === 'partner' ? <><span className="ptag">قیمت همکار</span><del>{fa(p.retailPrice)}</del></> : p.compareAtPrice && <del>{fa(p.compareAtPrice)}</del>}
            <b>{multi && minVariantPrice < p.retailPrice && r.mode === 'retail' ? 'از ' : ''}{fa(r.mode === 'retail' ? Math.min(r.unitPrice, minVariantPrice) : r.unitPrice)} <small>تومان</small></b>
          </div>
          {multi ? <Link href={`/products/${p.slug}`} className="add" aria-label={`انتخاب ${p.options!.map((o) => o.name).join(' و ')}`} title="انتخاب رنگ / فرم">🎨</Link> :
          <button className="add" aria-label="افزودن به سبد" disabled={!p.inStock} style={!p.inStock ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            onClick={() => { add(p.slug, qty); toast(qty > 1 ? `✓ ${fa(qty)} عدد (حداقل سفارش همکار) به سبد اضافه شد` : '✓ به سبد خرید اضافه شد'); }}>+</button>}
        </div>
        <div className="b2b-note">
          {buyer.kind === 'partner'
            ? <>حداقل سفارش: <b>{fa(p.partnerMinQty)} عدد</b>{firstBreak && <> · {fa(firstBreak.minQty)}+ عدد: <b>{fa(firstBreak.extraDiscountPercent)}٪ تخفیف اضافه</b></>}</>
            : <>همکار هستید؟ <b>قیمت ویژه با حساب همکاری</b></>}
        </div>
      </div>
    </article>
  );
}
