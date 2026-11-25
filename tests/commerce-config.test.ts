import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCommerceSettings, activeTiers } from '../src/lib/commerce-config.ts';

const base = () => JSON.parse(readFileSync(new URL('../config/commerce.json', import.meta.url), 'utf8'));

test('فایل پیش‌فرض config/commerce.json معتبر است', () => {
  const r = validateCommerceSettings(base());
  assert.ok(r.ok, !r.ok ? r.errors.join('\n') : '');
  if (r.ok) assert.deepEqual(activeTiers(r.value).map((t) => t.id), ['bronze', 'silver', 'gold']);
});

test('تغییر اعداد سطح‌ها پذیرفته می‌شود', () => {
  const s = base(); s.tiers[1].discountPercent = 14; s.tiers[2].minSpend = 900_000_000;
  const r = validateCommerceSettings(s);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.tiers[1].discountPercent, 14);
});

test('افزودن سطح چهارم (الماسی)', () => {
  const s = base();
  s.tiers.push({ id: 'diamond', name: 'الماسی', icon: '💎', rank: 4, discountPercent: 20, minSpend: 1_500_000_000, requiresDocuments: true, freeShipping: true, isActive: true });
  assert.ok(validateCommerceSettings(s).ok);
});

test('خطاها: رتبهٔ تکراری، حد خرید نزولی، تخفیف نامعقول', () => {
  const s = base(); s.tiers[2].rank = 2; s.tiers[1].discountPercent = 95;
  const r = validateCommerceSettings(s);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.ok(r.errors.some((x) => x.includes('تکراری'))); assert.ok(r.errors.some((x) => x.includes('۰ تا ۹۰'))); }
  const s2 = base(); s2.tiers[2].minSpend = 100_000_000;
  assert.equal(validateCommerceSettings(s2).ok, false);
});

test('پایین‌ترین سطح فعال باید حد خرید ۰ داشته باشد', () => {
  const s = base(); s.tiers[0].isActive = false;
  const r = validateCommerceSettings(s);
  assert.equal(r.ok, false);
});

test('پله‌های تخفیف باید صعودی باشند', () => {
  const s = base(); s.quantityBreaks = [{ minQty: 10, extraDiscountPercent: 8 }, { minQty: 50, extraDiscountPercent: 5 }];
  assert.equal(validateCommerceSettings(s).ok, false);
});
