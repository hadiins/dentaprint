/**
 * تنوع محصول (رنگ، فرم، نوع، ...)
 * - هر محصول حداکثر ۲ گزینه دارد، مثلاً «رنگ» و «فرم»
 * - هر ترکیب = یک «تنوع» با کد کالا، موجودی و (اختیاری) قیمت جداگانه
 * - کلید تنوع: مقادیر به ترتیب گزینه‌ها با «|»، مثل  "A2|S3"
 * - کلید ردیف سبد: "slug" برای محصول ساده و "slug::A2|S3" برای محصول دارای تنوع
 * - حداقل تعداد همکار و تخفیف پلکانی روی «مجموع تعداد همان محصول» حساب می‌شود (رنگ‌ها قابل ترکیب‌اند)
 */
import type { PricedProduct } from './pricing.ts';

export interface ProductOption { name: string; values: string[] }
export interface ProductVariant {
  key: string;
  values: string[];
  sku: string;
  stock: number;
  /** قیمت مصرف‌کنندهٔ جداگانه (خالی = قیمت محصول) */
  retailPrice?: number | null;
  isActive?: boolean;
}

export const MAX_OPTIONS = 2;
export const MAX_VALUES = 40;
export const MAX_VARIANTS = 200;
const SEP = '|';
const LINE_SEP = '::';

export const variantKey = (values: string[]) => values.join(SEP);

export function lineKey(slug: string, variant?: string | null) { return variant ? `${slug}${LINE_SEP}${variant}` : slug; }
export function parseLineKey(key: string): { slug: string; variant: string | null } {
  const i = key.indexOf(LINE_SEP);
  return i < 0 ? { slug: key, variant: null } : { slug: key.slice(0, i), variant: key.slice(i + LINE_SEP.length) };
}

/** کد کوتاه و ثابت برای مقادیر غیرلاتین (مثل «صورتی ساده») */
function shortHash(s: string) {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return h.toString(36).toUpperCase().slice(-4).padStart(4, '0');
}

/**
 * کد کالای هر تنوع از کد محصول:
 *   DP-RS-001 + A3.5 ← DP-RS-001-A35
 *   مقادیر فارسی ← کد کوتاه ثابت، مثل DP-DM-001-X7K2
 */
export function variantSku(baseSku: string, values: string[]) {
  const part = values.map((v) => {
    const latin = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[\x20-\x7E]+$/.test(v) && latin ? latin : `X${shortHash(v)}`;
  }).join('-');
  return `${baseSku}-${part}`;
}

/** همهٔ ترکیب‌های گزینه‌ها (ضرب دکارتی) */
export function combinations(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]).filter((c) => c.length === options.length && c.length > 0);
}

/** ساخت تنوع‌ها از گزینه‌ها؛ اطلاعات تنوع‌های موجود (موجودی/قیمت) با کلید یکسان حفظ می‌شود */
export function generateVariants(baseSku: string, options: ProductOption[], existing: ProductVariant[] = [], defaultStock = 0): ProductVariant[] {
  const old = new Map(existing.map((v) => [v.key, v]));
  return combinations(options).map((values) => {
    const key = variantKey(values);
    const prev = old.get(key);
    return { key, values, sku: prev?.sku ?? variantSku(baseSku, values), stock: prev?.stock ?? defaultStock, retailPrice: prev?.retailPrice ?? null, isActive: prev?.isActive ?? true };
  });
}

export interface HasVariants { options?: ProductOption[]; variants?: ProductVariant[] }
export const hasVariants = (p: HasVariants) => !!p.options?.length && !!p.variants?.length;
export const activeVariants = (p: HasVariants) => (p.variants ?? []).filter((v) => v.isActive !== false);
export const findVariant = (p: HasVariants, key: string | null | undefined) => (key ? activeVariants(p).find((v) => v.key === key) : undefined);
export const variantInStock = (v: ProductVariant) => v.stock > 0;

export function variantLabel(p: HasVariants, v: ProductVariant | undefined): string {
  if (!v || !p.options) return '';
  return p.options.map((o, i) => `${o.name}: ${v.values[i]}`).join(' · ');
}

/** قیمت‌گذاری تنوع: قیمت جداگانهٔ تنوع جایگزین قیمت محصول می‌شود و در آن صورت قیمت دستی سطح‌ها اعمال نمی‌شود */
export function pricedFor<T extends PricedProduct>(p: T, v?: ProductVariant): PricedProduct {
  if (!v?.retailPrice) return p;
  return { ...p, retailPrice: v.retailPrice, compareAtPrice: null, tierPrices: undefined, minPrice: p.minPrice != null ? Math.min(p.minPrice, v.retailPrice) : null };
}

/** آیا با انتخاب فعلی، مقدار value از گزینهٔ optionIndex حداقل یک ترکیب موجود دارد؟ (برای غیرفعال کردن دکمه‌ها) */
export function valueAvailable(p: HasVariants, selected: (string | null)[], optionIndex: number, value: string): boolean {
  return activeVariants(p).some((v) => variantInStock(v) && v.values[optionIndex] === value &&
    v.values.every((x, i) => i === optionIndex || selected[i] == null || selected[i] === x));
}

/** اعتبارسنجی گزینه‌ها (برای پنل مدیریت) */
export function validateOptions(options: ProductOption[]): string[] {
  const e: string[] = [];
  if (options.length > MAX_OPTIONS) e.push(`حداکثر ${MAX_OPTIONS} گزینه (مثلاً رنگ و فرم) مجاز است.`);
  const names = new Set<string>();
  options.forEach((o, i) => {
    const n = o.name.trim();
    if (n.length < 2) e.push(`نام گزینهٔ ${i + 1} را وارد کنید (مثلاً «رنگ»).`);
    if (names.has(n)) e.push(`نام گزینهٔ «${n}» تکراری است.`); names.add(n);
    if (o.values.length < 1) e.push(`برای «${n || `گزینهٔ ${i + 1}`}» حداقل یک مقدار وارد کنید.`);
    if (o.values.length > MAX_VALUES) e.push(`«${n}» حداکثر ${MAX_VALUES} مقدار می‌تواند داشته باشد.`);
    if (new Set(o.values).size !== o.values.length) e.push(`مقادیر «${n}» تکراری دارند.`);
    if (o.values.some((v) => v.length > 24 || v.includes(SEP) || v.includes(':'))) e.push(`مقادیر «${n}» باید کوتاه باشند و «|» یا «:» نداشته باشند.`);
  });
  const total = options.reduce((s, o) => s * Math.max(1, o.values.length), 1);
  if (options.length && total > MAX_VARIANTS) e.push(`تعداد ترکیب‌ها (${total}) از حد مجاز ${MAX_VARIANTS} بیشتر است.`);
  return e;
}

/** «A1، A2 , A3» ← ['A1','A2','A3'] */
export const parseValues = (text: string) => text.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
