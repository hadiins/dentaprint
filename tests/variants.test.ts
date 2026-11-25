import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { combinations, generateVariants, lineKey, parseLineKey, variantSku, variantLabel, valueAvailable, validateOptions, parseValues, pricedFor, type ProductOption } from '../src/lib/variants.ts';
import { buildOrderDraft, type CatalogItem } from '../src/lib/orders.ts';
import { validateCommerceSettings, type CommerceSettings } from '../src/lib/commerce-config.ts';
import { SAMPLE_PRODUCTS } from '../src/lib/catalog.ts';

const S = (validateCommerceSettings(JSON.parse(readFileSync(new URL('../config/commerce.json', import.meta.url), 'utf8'))) as { ok: true; value: CommerceSettings }).value;
const silver = S.tiers.find((t) => t.id === 'silver')!;
const OPTS: ProductOption[] = [{ name: 'رنگ', values: ['A1', 'A2', 'A3.5'] }, { name: 'فرم', values: ['S', 'T'] }];

test('ترکیب‌ها، کلید و کد کالای هر تنوع', () => {
  assert.equal(combinations(OPTS).length, 6);
  const vs = generateVariants('DP-DT-001', OPTS, [], 5);
  assert.deepEqual(vs[0], { key: 'A1|S', values: ['A1', 'S'], sku: 'DP-DT-001-A1-S', stock: 5, retailPrice: null, isActive: true });
  assert.equal(vs.find((v) => v.key === 'A3.5|T')!.sku, 'DP-DT-001-A35-T');
  assert.equal(new Set(vs.map((v) => v.sku)).size, 6);
  assert.deepEqual(combinations([]), []);
});

test('بازسازی تنوع‌ها بعد از تغییر گزینه‌ها: اطلاعات قبلی حفظ می‌شود', () => {
  const before = generateVariants('X', OPTS, [], 0).map((v) => (v.key === 'A2|S' ? { ...v, stock: 42, retailPrice: 999_000 } : v));
  const after = generateVariants('X', [{ name: 'رنگ', values: ['A2', 'B1'] }, { name: 'فرم', values: ['S'] }], before, 0);
  assert.deepEqual(after.map((v) => v.key), ['A2|S', 'B1|S']);
  assert.equal(after[0].stock, 42); assert.equal(after[0].retailPrice, 999_000); assert.equal(after[1].stock, 0);
});

test('کلید ردیف سبد', () => {
  assert.equal(lineKey('teeth', 'A2|S'), 'teeth::A2|S');
  assert.deepEqual(parseLineKey('teeth::A2|S'), { slug: 'teeth', variant: 'A2|S' });
  assert.deepEqual(parseLineKey('resin'), { slug: 'resin', variant: null });
});

const teeth: CatalogItem & { options: ProductOption[] } = {
  slug: 'teeth', sku: 'T', name: 'دندان', retailPrice: 1_000_000, partnerMinQty: 5, inStock: true, options: OPTS,
  variants: generateVariants('T', OPTS, [], 10).map((v) => (v.key === 'A3.5|T' ? { ...v, stock: 0 } : v.key === 'A1|T' ? { ...v, retailPrice: 1_200_000 } : v)),
};
const lookup = (s: string) => (s === 'teeth' ? teeth : undefined);

test('برچسب و دسترس‌پذیری مقادیر بر اساس انتخاب', () => {
  assert.equal(variantLabel(teeth, teeth.variants![0]), 'رنگ: A1 · فرم: S');
  assert.equal(valueAvailable(teeth, ['A3.5', null], 1, 'T'), false);
  assert.equal(valueAvailable(teeth, ['A3.5', null], 1, 'S'), true);
  assert.equal(valueAvailable(teeth, [null, 'T'], 0, 'A3.5'), false);
  assert.equal(valueAvailable(teeth, [null, null], 0, 'A3.5'), true);
});

test('حداقل تعداد همکار روی مجموع رنگ‌ها: ۳ عدد A1 + ۲ عدد A2 = ۵ ← قیمت همکار', () => {
  const r = buildOrderDraft([{ slug: 'teeth', variant: 'A1|S', qty: 3 }, { slug: 'teeth', variant: 'A2|S', qty: 2 }], lookup, { kind: 'partner', tier: silver, status: 'APPROVED' }, S);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.draft.lines.length, 2);
    assert.ok(r.draft.lines.every((l) => l.unitPrice === 880_000));
    assert.equal(r.draft.lines[0].variantLabel, 'رنگ: A1 · فرم: S');
    assert.equal(r.draft.lines[0].sku, 'T-A1-S');
  }
  const few = buildOrderDraft([{ slug: 'teeth', variant: 'A1|S', qty: 3 }], lookup, { kind: 'partner', tier: silver, status: 'APPROVED' }, S);
  assert.ok(few.ok && few.draft.lines[0].unitPrice === 1_000_000);
});

test('تنوع: الزامی بودن انتخاب، ناموجود، کمبود موجودی و قیمت جداگانه', () => {
  const retail = { kind: 'retail' as const };
  assert.match((buildOrderDraft([{ slug: 'teeth', qty: 1 }], lookup, retail, S) as { error: string }).error, /رنگ و فرم را انتخاب کنید/);
  assert.match((buildOrderDraft([{ slug: 'teeth', variant: 'A3.5|T', qty: 1 }], lookup, retail, S) as { error: string }).error, /ناموجود/);
  assert.match((buildOrderDraft([{ slug: 'teeth', variant: 'A2|T', qty: 11 }], lookup, retail, S) as { error: string }).error, /فقط 10 عدد/);
  assert.equal(buildOrderDraft([{ slug: 'teeth', variant: 'Z9|S', qty: 1 }], lookup, retail, S).ok, false);
  const r = buildOrderDraft([{ slug: 'teeth', variant: 'A1|T', qty: 1 }], lookup, retail, S);
  assert.ok(r.ok && r.draft.lines[0].unitPrice === 1_200_000);
  // قیمت جداگانهٔ تنوع، قیمت دستی سطح را کنار می‌گذارد
  assert.equal(pricedFor({ retailPrice: 1, tierPrices: { gold: 1 } }, { key: 'k', values: [], sku: 's', stock: 1, retailPrice: 5000 }).tierPrices, undefined);
});

test('اعتبارسنجی گزینه‌ها', () => {
  assert.deepEqual(validateOptions(OPTS), []);
  assert.ok(validateOptions([{ name: 'رنگ', values: ['A1', 'A1'] }]).length > 0);
  assert.ok(validateOptions([{ name: '', values: ['A1'] }]).length > 0);
  assert.ok(validateOptions([OPTS[0], OPTS[1], { name: 'سایز', values: ['1'] }]).length > 0);
  assert.ok(validateOptions([{ name: 'رنگ', values: Array.from({ length: 20 }, (_, i) => `c${i}`) }, { name: 'فرم', values: Array.from({ length: 20 }, (_, i) => `f${i}`) }]).some((e) => e.includes('ترکیب')));
  assert.deepEqual(parseValues('A1، A2 , A3\nB1'), ['A1', 'A2', 'A3', 'B1']);
});

test('محصولات نمونهٔ دارای رنگ: کد کالای یکتا و حداقل یک تنوع موجود', () => {
  const withOpts = SAMPLE_PRODUCTS.filter((p) => p.options?.length);
  assert.ok(withOpts.length >= 8);
  const skus = SAMPLE_PRODUCTS.flatMap((p) => [p.sku, ...(p.variants ?? []).map((v) => v.sku)]);
  assert.equal(new Set(skus).size, skus.length);
  for (const p of withOpts) { assert.deepEqual(validateOptions(p.options!), [], p.slug); assert.ok(p.variants!.some((v) => v.stock > 0), p.slug); }
});
