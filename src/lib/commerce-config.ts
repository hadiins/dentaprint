/**
 * تنظیمات تجاری قابل تغییر (سطوح همکاری، تخفیف پلکانی، ارسال).
 * این فایل خالص است (بدون وابستگی) تا هم در سرور، هم در مرورگر و هم در تست‌ها استفاده شود.
 * منبع داده: پایگاه داده (در صورت وجود) یا فایل config/commerce.json — ببینید settings.ts
 */
import type { Tier, QuantityBreak, ShippingRule } from './pricing.ts';

export interface TierConfig extends Tier {
  icon: string;
  isActive: boolean;
  freeShipping: boolean;
}

export interface CommerceSettings {
  tiers: TierConfig[];
  quantityBreaks: QuantityBreak[];
  shipping: ShippingRule;
  /** بازهٔ ارزیابی خرید برای ارتقای سطح (روز) */
  evaluationWindowDays: number;
  /** تنزل خودکار سطح با کاهش خرید */
  autoDowngrade: boolean;
}

export type ValidationResult = { ok: true; value: CommerceSettings } | { ok: false; errors: string[] };

const isInt = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** اعتبارسنجی کامل تنظیمات قبل از ذخیره — خطاها به فارسی برای نمایش در پنل مدیریت */
export function validateCommerceSettings(input: unknown): ValidationResult {
  const e: string[] = [];
  const s = input as Partial<CommerceSettings> | null;
  if (!s || typeof s !== 'object') return { ok: false, errors: ['ساختار تنظیمات نامعتبر است.'] };

  const tiers: TierConfig[] = [];
  if (!Array.isArray(s.tiers) || s.tiers.length === 0) e.push('حداقل یک سطح همکاری لازم است.');
  else {
    const ids = new Set<string>(), ranks = new Set<number>();
    s.tiers.forEach((t, i) => {
      const n = `سطح ${i + 1}`;
      if (!t || typeof t !== 'object') { e.push(`${n}: نامعتبر`); return; }
      if (typeof t.id !== 'string' || !/^[a-z][a-z0-9-]{1,30}$/.test(t.id)) e.push(`${n}: شناسه باید انگلیسی کوچک باشد (مثل gold).`);
      else if (ids.has(t.id)) e.push(`${n}: شناسهٔ «${t.id}» تکراری است.`); else ids.add(t.id);
      if (typeof t.name !== 'string' || t.name.trim().length < 2) e.push(`${n}: نام سطح را وارد کنید.`);
      if (!isInt(t.rank, 1, 100)) e.push(`${n}: رتبه باید عدد صحیح ۱ تا ۱۰۰ باشد.`);
      else if (ranks.has(t.rank)) e.push(`${n}: رتبهٔ ${t.rank} تکراری است.`); else ranks.add(t.rank);
      if (!isInt(t.discountPercent, 0, 90)) e.push(`${n}: درصد تخفیف باید بین ۰ تا ۹۰ باشد.`);
      if (!isInt(t.minSpend, 0)) e.push(`${n}: حد خرید باید عدد صحیح و نامنفی باشد.`);
      tiers.push({
        id: String(t.id), name: String(t.name ?? '').trim(), icon: typeof t.icon === 'string' && t.icon ? t.icon : '⭐',
        rank: Number(t.rank), discountPercent: Number(t.discountPercent), minSpend: Number(t.minSpend),
        requiresDocuments: !!t.requiresDocuments, freeShipping: !!t.freeShipping, isActive: t.isActive !== false,
      });
    });
    const active = tiers.filter((t) => t.isActive).sort((a, b) => a.rank - b.rank);
    if (active.length === 0) e.push('حداقل یک سطح باید فعال باشد.');
    else if (active[0].minSpend !== 0) e.push('حد خرید پایین‌ترین سطح فعال باید ۰ باشد (سطح ورود).');
    for (let i = 1; i < active.length; i++) {
      if (active[i].minSpend <= active[i - 1].minSpend) e.push(`حد خرید «${active[i].name}» باید از «${active[i - 1].name}» بیشتر باشد.`);
      if (active[i].discountPercent < active[i - 1].discountPercent) e.push(`تخفیف «${active[i].name}» نباید از «${active[i - 1].name}» کمتر باشد.`);
    }
  }

  const breaks: QuantityBreak[] = [];
  if (!Array.isArray(s.quantityBreaks)) e.push('فهرست تخفیف پلکانی نامعتبر است.');
  else {
    const seen = new Set<number>();
    s.quantityBreaks.forEach((b, i) => {
      if (!b || !isInt(b.minQty, 2, 100000)) { e.push(`پلهٔ ${i + 1}: حداقل تعداد باید ۲ یا بیشتر باشد.`); return; }
      if (!isInt(b.extraDiscountPercent, 1, 50)) e.push(`پلهٔ ${i + 1}: تخفیف اضافه باید بین ۱ تا ۵۰ درصد باشد.`);
      if (seen.has(b.minQty)) e.push(`پلهٔ ${i + 1}: تعداد ${b.minQty} تکراری است.`); seen.add(b.minQty);
      breaks.push({ minQty: b.minQty, extraDiscountPercent: Number(b.extraDiscountPercent) });
    });
    breaks.sort((a, b) => a.minQty - b.minQty);
    for (let i = 1; i < breaks.length; i++) if (breaks[i].extraDiscountPercent <= breaks[i - 1].extraDiscountPercent) e.push('تخفیف پله‌های بالاتر باید بیشتر باشد.');
  }

  const sh = s.shipping;
  if (!sh || !isInt(sh.flatCost, 0) || !isInt(sh.freeOver, 0)) e.push('هزینهٔ ارسال و حد ارسال رایگان باید عدد صحیح نامنفی باشند.');
  if (!isInt(s.evaluationWindowDays, 30, 730)) e.push('بازهٔ ارزیابی باید بین ۳۰ تا ۷۳۰ روز باشد.');

  if (e.length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      tiers: tiers.sort((a, b) => a.rank - b.rank), quantityBreaks: breaks,
      shipping: { flatCost: sh!.flatCost, freeOver: sh!.freeOver },
      evaluationWindowDays: s.evaluationWindowDays!, autoDowngrade: !!s.autoDowngrade,
    },
  };
}

export const activeTiers = (s: CommerceSettings) => s.tiers.filter((t) => t.isActive).sort((a, b) => a.rank - b.rank);
export const findTier = (s: CommerceSettings, id: string) => activeTiers(s).find((t) => t.id === id);
