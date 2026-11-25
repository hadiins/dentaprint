/** ساخت پیش‌نویس سفارش — قیمت‌ها همیشه در سرور و با همان موتور قیمت دوباره محاسبه می‌شوند */
import { resolvePrice, shippingCost, type Buyer, type PricedProduct } from './pricing.ts';
import type { CommerceSettings } from './commerce-config.ts';
import { findVariant, hasVariants, pricedFor, variantInStock, variantLabel, type HasVariants, type ProductVariant } from './variants.ts';

export interface CatalogItem extends PricedProduct, HasVariants { slug: string; sku: string; name: string; inStock: boolean }
export interface CartLineInput { slug: string; qty: number; variant?: string | null }

export interface OrderLine {
  slug: string; sku: string; name: string; quantity: number;
  variantKey: string | null; variantLabel: string | null;
  retailUnitPrice: number; unitPrice: number; lineTotal: number; appliedRules: string[];
}
export interface OrderDraft {
  priceMode: 'RETAIL' | 'PARTNER'; tierSlug: string | null;
  lines: OrderLine[]; retailSubtotal: number; subtotal: number; discountTotal: number; shipping: number; total: number;
}

export function buildOrderDraft(items: CartLineInput[], lookup: (slug: string) => CatalogItem | undefined,
  buyer: Buyer, settings: CommerceSettings): { ok: true; draft: OrderDraft } | { ok: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'سبد خرید خالی است.' };
  if (items.length > 50) return { ok: false, error: 'تعداد اقلام سبد بیش از حد مجاز است.' };
  const merged = new Map<string, CartLineInput>();
  for (const it of items) {
    if (!it || typeof it.slug !== 'string' || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 999) return { ok: false, error: 'تعداد یکی از اقلام نامعتبر است.' };
    const k = `${it.slug}::${it.variant ?? ''}`;
    const prev = merged.get(k);
    merged.set(k, { slug: it.slug, variant: it.variant ?? null, qty: (prev?.qty ?? 0) + it.qty });
  }
  // مجموع تعداد هر محصول (همهٔ رنگ‌ها/فرم‌ها) برای حداقل تعداد همکار و تخفیف پلکانی
  const totalBySlug = new Map<string, number>();
  for (const l of merged.values()) totalBySlug.set(l.slug, (totalBySlug.get(l.slug) ?? 0) + l.qty);

  const lines: OrderLine[] = [];
  for (const { slug, qty, variant } of merged.values()) {
    const p = lookup(slug);
    if (!p) return { ok: false, error: 'یکی از محصولات سبد دیگر موجود نیست.' };
    let v: ProductVariant | undefined;
    if (hasVariants(p)) {
      v = findVariant(p, variant);
      if (!v) return { ok: false, error: `برای «${p.name}» ${p.options!.map((o) => o.name).join(' و ')} را انتخاب کنید.` };
      if (!variantInStock(v)) return { ok: false, error: `«${p.name}» (${variantLabel(p, v)}) ناموجود است.` };
      if (v.stock < qty) return { ok: false, error: `از «${p.name}» (${variantLabel(p, v)}) فقط ${v.stock} عدد موجود است.` };
    } else {
      if (variant) return { ok: false, error: `«${p.name}» گزینهٔ انتخابی ندارد.` };
      if (!p.inStock) return { ok: false, error: `«${p.name}» ناموجود است.` };
    }
    const r = resolvePrice(pricedFor(p, v), buyer, totalBySlug.get(slug)!, settings.quantityBreaks);
    lines.push({
      slug, sku: v?.sku ?? p.sku, name: p.name, quantity: qty, variantKey: v?.key ?? null, variantLabel: v ? variantLabel(p, v) : null,
      retailUnitPrice: r.retailUnitPrice, unitPrice: r.unitPrice, lineTotal: r.unitPrice * qty, appliedRules: r.appliedRules,
    });
  }
  const retailSubtotal = lines.reduce((s, l) => s + l.retailUnitPrice * l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = shippingCost(subtotal, settings.shipping, buyer);
  const partner = buyer.kind === 'partner' && buyer.status === 'APPROVED';
  return {
    ok: true,
    draft: {
      priceMode: partner ? 'PARTNER' : 'RETAIL', tierSlug: partner ? buyer.tier.id : null,
      lines, retailSubtotal, subtotal, discountTotal: retailSubtotal - subtotal, shipping, total: subtotal + shipping,
    },
  };
}

export function newOrderNumber(now = Date.now()): string {
  const rand = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `DP-${now.toString(36).toUpperCase()}${rand}`;
}
