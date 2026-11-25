/**
 * موتور قیمت‌گذاری دنتاپرینت
 * ------------------------------------------------------------
 * همهٔ مبالغ به «تومان» و عدد صحیح هستند.
 * این فایل هیچ وابستگی ندارد تا هم در سرور، هم در مرورگر و هم در تست‌ها
 * دقیقاً یک منطق اجرا شود. قیمت نهایی سفارش همیشه در سرور دوباره محاسبه می‌شود.
 *
 * ترتیب محاسبهٔ قیمت همکار:
 *  ۱) اگر برای این محصول و این سطح «قیمت دستی» ثبت شده باشد ← همان
 *  ۲) در غیر این صورت: قیمت مصرف‌کننده × (۱ − تخفیف سطح)
 *     (تخفیف سطح با سقف تخفیف مجاز همان محصول محدود می‌شود؛ مثلاً برای پرینترها)
 *  ۳) تخفیف پلکانی تعداد (۱۰+ عدد، ۵۰+ عدد، ...)
 *  ۴) کف قیمت محصول (زیر آن فروخته نمی‌شود)
 *  ۵) گرد کردن به ۱٬۰۰۰ تومان و هرگز بیشتر از قیمت مصرف‌کننده
 */

export type PartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type VerificationLevel = 'NONE' | 'BASIC' | 'DOCUMENTS';

export interface Tier {
  id: string;
  name: string;
  rank: number;
  discountPercent: number;
  /** حداقل خرید پرداخت‌شده در بازهٔ ارزیابی (پیش‌فرض ۱۸۰ روز) برای رسیدن به این سطح */
  minSpend: number;
  /** آیا این سطح فقط برای همکاران دارای مدرک (پروانه/کد اقتصادی) است؟ */
  requiresDocuments: boolean;
  freeShipping?: boolean;
}

export interface PricedProduct {
  retailPrice: number;
  compareAtPrice?: number | null;
  minPrice?: number | null;
  partnerMinQty?: number;
  maxPartnerDiscountPercent?: number | null;
  /** قیمت دستی برای هر سطح: { [tierId]: price } */
  tierPrices?: Record<string, number>;
}

export interface QuantityBreak {
  minQty: number;
  extraDiscountPercent: number;
}

export type Buyer =
  | { kind: 'retail' }
  | { kind: 'partner'; tier: Tier; status: PartnerStatus };

export interface PriceResult {
  mode: 'retail' | 'partner';
  unitPrice: number;
  retailUnitPrice: number;
  quantity: number;
  lineTotal: number;
  /** صرفه‌جویی نسبت به قیمت مصرف‌کننده (کل ردیف) */
  savings: number;
  savingsPercent: number;
  appliedRules: string[];
  /** پیام راهنما برای کاربر (مثلاً حداقل تعداد برای قیمت همکار) */
  hint?: string;
}

export const ROUND_TO = 1000;

export function roundPrice(n: number, step = ROUND_TO): number {
  return Math.round(n / step) * step;
}

function pct(value: number, percent: number): number {
  return value * (1 - percent / 100);
}

export function resolvePrice(
  product: PricedProduct,
  buyer: Buyer,
  quantity: number,
  breaks: QuantityBreak[] = [],
): PriceResult {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError('تعداد باید عدد صحیح و حداقل ۱ باشد');
  }
  const retail = product.retailPrice;
  const retailResult = (hint?: string, rules: string[] = []): PriceResult => ({
    mode: 'retail', unitPrice: retail, retailUnitPrice: retail, quantity,
    lineTotal: retail * quantity, savings: 0, savingsPercent: 0, appliedRules: rules, hint,
  });

  if (buyer.kind === 'retail') return retailResult();

  if (buyer.status !== 'APPROVED') {
    return retailResult('حساب همکاری شما هنوز تأیید نشده است؛ فعلاً قیمت مصرف‌کننده اعمال می‌شود.');
  }

  const minQty = Math.max(1, product.partnerMinQty ?? 1);
  if (quantity < minQty) {
    return retailResult(`برای قیمت همکار حداقل ${minQty} عدد سفارش دهید.`, ['BELOW_PARTNER_MIN_QTY']);
  }

  const rules: string[] = [];
  let price: number;
  const manual = product.tierPrices?.[buyer.tier.id];
  if (manual != null) {
    price = manual;
    rules.push(`TIER_MANUAL_PRICE:${buyer.tier.id}`);
  } else {
    let d = buyer.tier.discountPercent;
    if (product.maxPartnerDiscountPercent != null && d > product.maxPartnerDiscountPercent) {
      d = product.maxPartnerDiscountPercent;
      rules.push(`DISCOUNT_CAPPED:${d}`);
    }
    price = pct(retail, d);
    rules.push(`TIER_DISCOUNT:${buyer.tier.id}:${d}`);
  }

  const brk = [...breaks]
    .filter((b) => quantity >= b.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  if (brk) {
    price = pct(price, brk.extraDiscountPercent);
    rules.push(`QTY_BREAK:${brk.minQty}:${brk.extraDiscountPercent}`);
  }

  price = roundPrice(price);
  if (product.minPrice != null && price < product.minPrice) {
    price = product.minPrice;
    rules.push('MIN_PRICE_FLOOR');
  }
  if (price > retail) price = retail;

  const savings = (retail - price) * quantity;
  return {
    mode: 'partner', unitPrice: price, retailUnitPrice: retail, quantity,
    lineTotal: price * quantity, savings,
    savingsPercent: retail ? Math.round(((retail - price) / retail) * 100) : 0,
    appliedRules: rules,
  };
}

/**
 * بالاترین سطحی که همکار بر اساس خرید بازهٔ ارزیابی و وضعیت مدارک، شایستهٔ آن است.
 * همکار بدون پروانه هم پذیرفته می‌شود؛ فقط سطوحی که requiresDocuments دارند برایش باز نیست.
 */
export function eligibleTier(spend: number, verification: VerificationLevel, tiers: Tier[]): Tier | null {
  const hasDocs = verification === 'DOCUMENTS';
  const ok = tiers
    .filter((t) => spend >= t.minSpend && (!t.requiresDocuments || hasDocs))
    .sort((a, b) => b.rank - a.rank);
  return ok[0] ?? null;
}

export interface TierEvalOptions {
  /** سطح توسط مدیر قفل شده است */
  locked?: boolean;
  /** اگر true باشد، با کاهش خرید، سطح خودکار پایین می‌آید (پیش‌فرض: false) */
  autoDowngrade?: boolean;
}

/**
 * سطح جدید پس از اجرای بررسی دوره‌ای.
 * - ارتقا همیشه خودکار است.
 * - تنزل فقط اگر autoDowngrade در تنظیمات روشن باشد.
 * - اگر مدیر سطح را قفل کرده باشد، تغییری نمی‌کند.
 */
export function nextTier(current: Tier | null, spend: number, verification: VerificationLevel,
  tiers: Tier[], opts: TierEvalOptions = {}): Tier | null {
  if (opts.locked) return current;
  const target = eligibleTier(spend, verification, tiers);
  if (!current) return target;
  if (target && target.rank > current.rank) return target;
  if (opts.autoDowngrade && target && target.rank < current.rank) return target;
  // اگر سطح فعلی به‌خاطر نبود مدرک دیگر مجاز نیست (مثلاً مدرک رد شد) ← به بهترین سطح مجاز
  if (current.requiresDocuments && verification !== 'DOCUMENTS') return target;
  return current;
}

export interface ShippingRule { flatCost: number; freeOver: number }

export function shippingCost(subtotal: number, rule: ShippingRule, buyer: Buyer): number {
  if (subtotal <= 0) return 0;
  if (buyer.kind === 'partner' && buyer.status === 'APPROVED' && buyer.tier.freeShipping) return 0;
  return subtotal >= rule.freeOver ? 0 : rule.flatCost;
}
