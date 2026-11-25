/** اعتبارسنجی فرم محصول در پنل مدیریت (خطاها به فارسی) */
import { toEnDigits } from '../format.ts';
import { generateVariants, parseValues, validateOptions, type ProductOption, type ProductVariant } from '../variants.ts';

export interface ProductInput {
  name: string; slug: string; sku: string; categorySlug: string; type: 'RESIN' | 'MATERIAL' | 'EQUIPMENT' | 'CONSUMABLE';
  icon: string; irc: string | null; shortDescription: string; description: string; specs: Record<string, string>;
  wavelengthNm: number | null; retailPrice: number; compareAtPrice: number | null; minPrice: number | null;
  partnerMinQty: number; maxPartnerDiscountPercent: number | null; tierPrices: Record<string, number>;
  stock: number; popularity: number; isActive: boolean;
  options: ProductOption[]; variants: ProductVariant[];
}

const TYPES = ['RESIN', 'MATERIAL', 'EQUIPMENT', 'CONSUMABLE'] as const;
const intOrNull = (v: string | undefined) => { const s = toEnDigits(String(v ?? '')).replace(/[,٬،]/g, ''); return s === '' ? null : /^\d+$/.test(s) ? Number(s) : NaN; };

/** «کلید: مقدار» در هر خط ← شیء مشخصات */
export function parseSpecs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.search(/[:：]/);
    if (i <= 0) continue;
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}
export const specsToText = (s: Record<string, string>) => Object.entries(s).map(([k, v]) => `${k}: ${v}`).join('\n');

export function parseProductForm(f: Record<string, string | undefined>, opts: { categories: string[]; tiers: string[] }):
  { ok: true; value: ProductInput } | { ok: false; errors: string[] } {
  const e: string[] = [];
  const str = (k: string) => String(f[k] ?? '').trim();
  const name = str('name'), slug = str('slug').toLowerCase(), sku = str('sku').toUpperCase();
  if (name.length < 3) e.push('نام محصول را وارد کنید.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) e.push('نامک (slug) فقط حروف کوچک انگلیسی، عدد و خط تیره باشد؛ مثل nanohybrid-composite-4g');
  if (!/^[A-Z0-9][A-Z0-9-]{2,30}$/.test(sku)) e.push('کد کالا (SKU) نامعتبر است؛ مثل DP-RS-001');
  const categorySlug = str('category');
  if (!opts.categories.includes(categorySlug)) e.push('دسته‌بندی را انتخاب کنید.');
  const type = str('type') as ProductInput['type'];
  if (!TYPES.includes(type)) e.push('نوع محصول را انتخاب کنید.');
  const description = str('description');
  if (description.length < 10) e.push('توضیحات محصول را کامل‌تر بنویسید.');

  const retailPrice = intOrNull(f.retailPrice), compareAtPrice = intOrNull(f.compareAtPrice), minPrice = intOrNull(f.minPrice);
  const partnerMinQty = intOrNull(f.partnerMinQty) ?? 1, maxD = intOrNull(f.maxPartnerDiscountPercent), stock = intOrNull(f.stock) ?? 0;
  const popularity = intOrNull(f.popularity) ?? 0, wl = intOrNull(f.wavelengthNm);
  if (!retailPrice || Number.isNaN(retailPrice) || retailPrice < 1000) e.push('قیمت مصرف‌کننده را به تومان وارد کنید (حداقل ۱٬۰۰۰).');
  if (Number.isNaN(compareAtPrice) || (compareAtPrice != null && retailPrice && compareAtPrice <= retailPrice)) e.push('قیمت قبل از تخفیف باید بیشتر از قیمت فعلی باشد (یا خالی بماند).');
  if (Number.isNaN(minPrice) || (minPrice != null && retailPrice && minPrice > retailPrice)) e.push('کف قیمت نباید از قیمت مصرف‌کننده بیشتر باشد.');
  if (Number.isNaN(partnerMinQty) || partnerMinQty < 1 || partnerMinQty > 1000) e.push('حداقل تعداد همکار باید ۱ تا ۱۰۰۰ باشد.');
  if (Number.isNaN(maxD) || (maxD != null && maxD > 90)) e.push('سقف تخفیف همکار باید ۰ تا ۹۰ درصد باشد (یا خالی).');
  if (Number.isNaN(stock) || stock < 0) e.push('موجودی باید عدد صحیح نامنفی باشد.');
  if (Number.isNaN(popularity)) e.push('اولویت نمایش باید عدد باشد.');
  if (Number.isNaN(wl) || (wl != null && (wl < 300 || wl > 600))) e.push('طول موج باید بین ۳۰۰ تا ۶۰۰ نانومتر باشد (یا خالی).');

  const tierPrices: Record<string, number> = {};
  for (const t of opts.tiers) {
    const v = intOrNull(f[`tier_${t}`]);
    if (v == null) continue;
    if (Number.isNaN(v) || v < 1000) { e.push(`قیمت دستی سطح ${t} نامعتبر است.`); continue; }
    if (retailPrice && v > retailPrice) e.push(`قیمت دستی سطح ${t} نباید از قیمت مصرف‌کننده بیشتر باشد.`);
    if (minPrice != null && v < minPrice) e.push(`قیمت دستی سطح ${t} از کف قیمت کمتر است.`);
    tierPrices[t] = v;
  }

  // گزینه‌ها (رنگ/فرم) و تنوع‌ها: opt1_name, opt1_values, opt2_name, opt2_values, v_stock_{key}, v_price_{key}, v_active_{key}, v_sku_{key}
  const options: ProductOption[] = [1, 2]
    .map((i) => ({ name: str(`opt${i}_name`), values: parseValues(String(f[`opt${i}_values`] ?? '')) }))
    .filter((o) => o.name || o.values.length);
  e.push(...validateOptions(options));
  let variants: ProductVariant[] = [];
  if (options.length && !e.length) {
    variants = generateVariants(sku, options).map((v) => {
      const vs = intOrNull(f[`v_stock_${v.key}`]), vp = intOrNull(f[`v_price_${v.key}`]);
      const vsku = String(f[`v_sku_${v.key}`] ?? '').trim().toUpperCase();
      if (Number.isNaN(vs) || (vs ?? 0) < 0) e.push(`موجودی «${v.values.join(' / ')}» نامعتبر است.`);
      if (Number.isNaN(vp) || (vp != null && vp < 1000)) e.push(`قیمت «${v.values.join(' / ')}» نامعتبر است.`);
      if (vsku && !/^[A-Z0-9][A-Z0-9-]{2,40}$/.test(vsku)) e.push(`کد کالای «${v.values.join(' / ')}» نامعتبر است.`);
      return { ...v, sku: vsku || v.sku, stock: vs ?? 0, retailPrice: vp, isActive: f[`v_active_${v.key}`] !== undefined ? f[`v_active_${v.key}`] === 'on' : true };
    });
    if (new Set(variants.map((v) => v.sku)).size !== variants.length) e.push('کد کالای تنوع‌ها تکراری است.');
    if (variants.length && !variants.some((v) => v.isActive)) e.push('حداقل یک ترکیب باید فعال باشد.');
  }

  if (e.length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      name, slug, sku, categorySlug, type, icon: str('icon') || '📦', irc: str('irc') || null,
      shortDescription: str('shortDescription'), description, specs: parseSpecs(String(f.specs ?? '')),
      wavelengthNm: wl, retailPrice: retailPrice!, compareAtPrice, minPrice, partnerMinQty,
      maxPartnerDiscountPercent: maxD, tierPrices, popularity, isActive: f.isActive === 'on' || f.isActive === 'true',
      options, variants, stock: variants.length ? variants.filter((v) => v.isActive).reduce((s, v) => s + v.stock, 0) : stock,
    },
  };
}
