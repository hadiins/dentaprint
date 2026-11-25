import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePrice, eligibleTier, nextTier, shippingCost, type Tier, type Buyer } from '../src/lib/pricing.ts';

const bronze: Tier = { id: 'bronze', name: 'برنزی', rank: 1, discountPercent: 8, minSpend: 0, requiresDocuments: false };
const silver: Tier = { id: 'silver', name: 'نقره‌ای', rank: 2, discountPercent: 12, minSpend: 150_000_000, requiresDocuments: false };
const gold: Tier = { id: 'gold', name: 'طلایی', rank: 3, discountPercent: 16, minSpend: 600_000_000, requiresDocuments: true, freeShipping: true };
const TIERS = [bronze, silver, gold];
const breaks = [{ minQty: 10, extraDiscountPercent: 5 }, { minQty: 50, extraDiscountPercent: 10 }];
const resin = { retailPrice: 4_900_000, partnerMinQty: 3 };
const partner = (tier: Tier, status: 'APPROVED' | 'PENDING' = 'APPROVED'): Buyer => ({ kind: 'partner', tier, status });

test('مصرف‌کننده همیشه قیمت عادی می‌گیرد', () => {
  const r = resolvePrice(resin, { kind: 'retail' }, 100, breaks);
  assert.equal(r.mode, 'retail');
  assert.equal(r.unitPrice, 4_900_000);
  assert.equal(r.lineTotal, 490_000_000);
});

test('همکار تأییدنشده قیمت عادی + پیام راهنما', () => {
  const r = resolvePrice(resin, partner(gold, 'PENDING'), 5);
  assert.equal(r.mode, 'retail');
  assert.ok(r.hint);
});

test('کمتر از حداقل تعداد ← قیمت مصرف‌کننده با پیام', () => {
  const r = resolvePrice(resin, partner(silver), 2);
  assert.equal(r.mode, 'retail');
  assert.match(r.hint!, /حداقل 3/);
});

test('تخفیف سطح نقره‌ای ۱۲٪', () => {
  const r = resolvePrice(resin, partner(silver), 3);
  assert.equal(r.unitPrice, 4_312_000); // 4.9M × 0.88
  assert.equal(r.savingsPercent, 12);
});

test('تخفیف پلکانی: بزرگ‌ترین پله اعمال می‌شود، نه جمع پله‌ها', () => {
  const r10 = resolvePrice(resin, partner(bronze), 10, breaks);
  assert.equal(r10.unitPrice, Math.round(4_900_000 * 0.92 * 0.95 / 1000) * 1000);
  const r50 = resolvePrice(resin, partner(bronze), 50, breaks);
  assert.equal(r50.unitPrice, Math.round(4_900_000 * 0.92 * 0.90 / 1000) * 1000);
  assert.ok(r50.appliedRules.includes('QTY_BREAK:50:10'));
  assert.ok(!r50.appliedRules.includes('QTY_BREAK:10:5'));
});

test('سقف تخفیف محصول (مثلاً پرینتر حداکثر ۷٪)', () => {
  const printer = { retailPrice: 185_000_000, maxPartnerDiscountPercent: 7 };
  const r = resolvePrice(printer, partner(gold), 1);
  assert.equal(r.unitPrice, 172_050_000);
  assert.ok(r.appliedRules.includes('DISCOUNT_CAPPED:7'));
});

test('قیمت دستی سطح بر تخفیف درصدی مقدم است', () => {
  const p = { retailPrice: 12_500_000, tierPrices: { gold: 10_000_000 } };
  assert.equal(resolvePrice(p, partner(gold), 1).unitPrice, 10_000_000);
  assert.equal(resolvePrice(p, partner(bronze), 1).unitPrice, 11_500_000);
});

test('کف قیمت رعایت می‌شود', () => {
  const p = { retailPrice: 1_000_000, minPrice: 900_000 };
  const r = resolvePrice(p, partner(gold), 50, breaks);
  assert.equal(r.unitPrice, 900_000);
  assert.ok(r.appliedRules.includes('MIN_PRICE_FLOOR'));
});

test('قیمت همکار هرگز بیشتر از مصرف‌کننده نیست', () => {
  const p = { retailPrice: 1_000_000, tierPrices: { bronze: 1_200_000 } };
  assert.equal(resolvePrice(p, partner(bronze), 1).unitPrice, 1_000_000);
});

test('تعداد نامعتبر خطا می‌دهد', () => {
  assert.throws(() => resolvePrice(resin, { kind: 'retail' }, 0));
  assert.throws(() => resolvePrice(resin, { kind: 'retail' }, 1.5));
});

test('بدون مدرک: حداکثر تا نقره‌ای؛ با مدرک: طلایی', () => {
  assert.equal(eligibleTier(0, 'BASIC', TIERS)?.id, 'bronze');
  assert.equal(eligibleTier(800_000_000, 'BASIC', TIERS)?.id, 'silver');
  assert.equal(eligibleTier(800_000_000, 'DOCUMENTS', TIERS)?.id, 'gold');
});

test('ارتقای خودکار بله، تنزل خودکار نه، قفل مدیر محترم است', () => {
  assert.equal(nextTier(bronze, 200_000_000, 'BASIC', TIERS)?.id, 'silver');
  assert.equal(nextTier(silver, 0, 'BASIC', TIERS)?.id, 'silver');
  assert.equal(nextTier(bronze, 900_000_000, 'DOCUMENTS', TIERS, { locked: true })?.id, 'bronze');
});

test('تنزل خودکار فقط وقتی در تنظیمات روشن باشد', () => {
  assert.equal(nextTier(gold, 100_000_000, 'DOCUMENTS', TIERS, { autoDowngrade: true })?.id, 'bronze');
  assert.equal(nextTier(gold, 100_000_000, 'DOCUMENTS', TIERS)?.id, 'gold');
});

test('اگر مدرک همکار طلایی رد شود، به بهترین سطح مجاز می‌رود', () => {
  assert.equal(nextTier(gold, 900_000_000, 'BASIC', TIERS)?.id, 'silver');
});

test('هزینهٔ ارسال', () => {
  const rule = { flatCost: 450_000, freeOver: 10_000_000 };
  assert.equal(shippingCost(0, rule, { kind: 'retail' }), 0);
  assert.equal(shippingCost(5_000_000, rule, { kind: 'retail' }), 450_000);
  assert.equal(shippingCost(12_000_000, rule, { kind: 'retail' }), 0);
  assert.equal(shippingCost(1_000_000, rule, partner(gold)), 0);
  assert.equal(shippingCost(1_000_000, rule, partner(silver)), 450_000);
});
