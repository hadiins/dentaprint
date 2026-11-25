import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkTransition } from '../src/lib/admin/order-workflow.ts';
import { validatePartnerDecision, partnerNotifyEvent } from '../src/lib/admin/partner-review.ts';
import { parseProductForm, parseSpecs, specsToText } from '../src/lib/admin/product-input.ts';
import { notify, notifyParams, parseTemplates } from '../src/lib/notify/index.ts';
import { createKavenegar } from '../src/lib/sms/providers/kavenegar.ts';
import { createSmsIr } from '../src/lib/sms/providers/smsir.ts';
import { createConsoleSms } from '../src/lib/sms/providers/console.ts';
import { validateCommerceSettings, activeTiers, type CommerceSettings } from '../src/lib/commerce-config.ts';
import { SAMPLE_PRODUCTS, CATEGORIES, CATEGORY_GROUPS, getProducts } from '../src/lib/catalog.ts';
import { resolvePrice } from '../src/lib/pricing.ts';

const S = (validateCommerceSettings(JSON.parse(readFileSync(new URL('../config/commerce.json', import.meta.url), 'utf8'))) as { ok: true; value: CommerceSettings }).value;
const tiers = activeTiers(S);

test('گردش وضعیت سفارش: مجاز، غیرمجاز، و کد رهگیری الزامی برای ارسال', () => {
  assert.ok(checkTransition('PAID', 'PROCESSING').ok);
  assert.equal(checkTransition('PAID', 'SHIPPED').ok, false);
  assert.ok(checkTransition('PROCESSING', 'SHIPPED', { trackingCode: '1234567890' }).ok);
  assert.equal(checkTransition('DELIVERED', 'PAID').ok, false);
  assert.equal(checkTransition('CANCELLED', 'PAID').ok, false);
  assert.equal(checkTransition('PENDING_PAYMENT', 'PAID').ok, false); // پرداخت فقط از درگاه تأیید می‌شود
});

test('تأیید همکار: حداقل تأیید پایه، انتخاب سطح، و سطح نیازمند مدرک', () => {
  assert.deepEqual(validatePartnerDecision({ status: 'APPROVED', verification: 'BASIC', tierSlug: 'silver', tierLocked: false }, tiers), []);
  assert.ok(validatePartnerDecision({ status: 'APPROVED', verification: 'NONE', tierSlug: 'bronze', tierLocked: false }, tiers).length > 0);
  assert.ok(validatePartnerDecision({ status: 'APPROVED', verification: 'BASIC', tierSlug: null, tierLocked: false }, tiers).length > 0);
  const e = validatePartnerDecision({ status: 'APPROVED', verification: 'BASIC', tierSlug: 'gold', tierLocked: false }, tiers);
  assert.ok(e[0].includes('طلایی'));
  assert.deepEqual(validatePartnerDecision({ status: 'APPROVED', verification: 'DOCUMENTS', tierSlug: 'gold', tierLocked: true }, tiers), []);
  assert.deepEqual(validatePartnerDecision({ status: 'REJECTED', verification: 'NONE', tierSlug: null, tierLocked: false }, tiers), []);
  assert.equal(partnerNotifyEvent('PENDING', 'APPROVED', null, 'bronze'), 'partner_approved');
  assert.equal(partnerNotifyEvent('APPROVED', 'APPROVED', 'bronze', 'silver'), 'partner_tier_changed');
  assert.equal(partnerNotifyEvent('APPROVED', 'APPROVED', 'silver', 'silver'), null);
  assert.equal(partnerNotifyEvent('PENDING', 'REJECTED', null, null), 'partner_rejected');
});

const form = (o: Record<string, string> = {}) => ({
  name: 'کامپوزیت تست', slug: 'test-composite', sku: 'dp-rs-099', category: 'composites', type: 'MATERIAL', description: 'توضیحات کامل محصول تست',
  retailPrice: '۱٬۶۵۰٬۰۰۰', compareAtPrice: '', minPrice: '1200000', partnerMinQty: '5', maxPartnerDiscountPercent: '', stock: '10',
  specs: 'وزن: ۴ گرم\nرنگ‌بندی: A1، A2\nخط بدون جداکننده', isActive: 'on', tier_gold: '1300000', ...o,
});
const opts = { categories: CATEGORIES.map((c) => c.slug), tiers: tiers.map((t) => t.id) };

test('فرم محصول: ارقام فارسی و جداکننده، مشخصات، قیمت دستی سطح', () => {
  const r = parseProductForm(form(), opts);
  assert.ok(r.ok, !r.ok ? r.errors.join(' | ') : '');
  if (r.ok) {
    assert.equal(r.value.retailPrice, 1_650_000); assert.equal(r.value.sku, 'DP-RS-099');
    assert.deepEqual(r.value.specs, { 'وزن': '۴ گرم', 'رنگ‌بندی': 'A1، A2' });
    assert.deepEqual(r.value.tierPrices, { gold: 1_300_000 }); assert.equal(r.value.isActive, true);
  }
});

test('فرم محصول: خطاهای رایج', () => {
  const bad = (o: Record<string, string>) => { const r = parseProductForm(form(o), opts); assert.equal(r.ok, false, JSON.stringify(o)); return (r as { errors: string[] }).errors; };
  bad({ slug: 'کامپوزیت' }); bad({ category: 'nope' }); bad({ retailPrice: '' }); bad({ retailPrice: 'abc' });
  assert.ok(bad({ compareAtPrice: '1000000' })[0].includes('قبل از تخفیف'));
  bad({ minPrice: '9000000' }); bad({ maxPartnerDiscountPercent: '95' }); bad({ tier_gold: '9000000' }); bad({ tier_gold: '1000000' });
});

test('تبدیل مشخصات متن ↔ شیء', () => {
  const s = { 'وزن': '۴ گرم', 'طول موج': '۴۰۵ نانومتر' };
  assert.deepEqual(parseSpecs(specsToText(s)), s);
});

test('اطلاع‌رسانی پیامکی: الگو، پارامترها، رد بی‌صدا', async () => {
  const sent: unknown[] = [];
  const sms = { id: 'x', label: 'x', sendOtp: async () => ({ ok: true as const }), sendTemplate: async (...a: unknown[]) => { sent.push(a); return { ok: true as const }; } };
  const tpl = parseTemplates('{"order_shipped":"dp-shipped"}');
  assert.equal(await notify(sms, tpl, 'order_shipped', '0912', { order: 'DP-1', tracking: '123 456' }), 'sent');
  assert.deepEqual(sent[0], ['0912', 'dp-shipped', [{ name: 'ORDER', value: 'DP-1' }, { name: 'TRACKING', value: '123‌456' }]]);
  assert.equal(await notify(sms, tpl, 'order_paid', '0912', { order: 'DP-1' }), 'skipped');
  assert.equal(await notify(null, tpl, 'order_shipped', '0912', {}), 'skipped');
  assert.deepEqual(parseTemplates('not json'), {});
  const logs: string[] = [];
  assert.equal(await notify(createConsoleSms({ log: (m) => logs.push(m) }), {}, 'partner_approved', '0912', { tier: 'نقره‌ای' }), 'sent');
  assert.ok(logs[0].includes('TIER=نقره‌ای'));
  assert.deepEqual(notifyParams('partner_approved', { tier: 'طلایی' }), [{ name: 'TIER', value: 'طلایی' }]);
});

test('کاوه‌نگار و SMS.ir: ارسال الگوی اطلاع‌رسانی', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = async (url: string, init?: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(url.includes('kavenegar') ? { return: { status: 200 } } : { status: 1 })); };
  assert.ok((await createKavenegar({ apiKey: 'K', template: 'otp' }, { fetch: f }).sendTemplate!('0912', 'dp-shipped', [{ name: 'ORDER', value: 'DP-1' }, { name: 'TRACKING', value: '99' }])).ok);
  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('template'), 'dp-shipped'); assert.equal(u.searchParams.get('token'), 'DP-1'); assert.equal(u.searchParams.get('token2'), '99');
  const smsir = createSmsIr({ apiKey: 'K', templateId: 1 }, { fetch: f });
  assert.ok((await smsir.sendTemplate!('0912', '555', [{ name: 'ORDER', value: 'DP-1' }])).ok);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { mobile: '0912', templateId: 555, parameters: [{ name: 'ORDER', value: 'DP-1' }] });
  assert.equal((await smsir.sendTemplate!('0912', 'abc', [])).ok, false);
});

test('کاتالوگ: یکتایی، دسته‌های معتبر، و هر گروه محصول دارد', async () => {
  const slugs = new Set(SAMPLE_PRODUCTS.map((p) => p.slug)), skus = new Set(SAMPLE_PRODUCTS.map((p) => p.sku));
  assert.equal(slugs.size, SAMPLE_PRODUCTS.length); assert.equal(skus.size, SAMPLE_PRODUCTS.length);
  const cats = new Set(CATEGORIES.map((c) => c.slug));
  for (const p of SAMPLE_PRODUCTS) assert.ok(cats.has(p.category), p.slug);
  for (const c of CATEGORIES) assert.ok(CATEGORY_GROUPS.some((g) => g.slug === c.group), c.slug);
  for (const g of CATEGORY_GROUPS) assert.ok((await getProducts({ group: g.slug })).length >= 3, g.slug);
  assert.ok((await getProducts({ group: 'prosthetics', q: 'دندان مصنوعی' })).length >= 3);
  assert.ok((await getProducts({ category: 'composites' })).every((p) => p.category === 'composites'));
  // قیمت همکار روی همهٔ محصولات نمونه بدون خطا محاسبه می‌شود
  for (const p of SAMPLE_PRODUCTS) for (const t of tiers) {
    const r = resolvePrice(p, { kind: 'partner', tier: t, status: 'APPROVED' }, Math.max(1, p.partnerMinQty), S.quantityBreaks);
    assert.ok(r.unitPrice > 0 && r.unitPrice <= p.retailPrice, p.slug);
  }
});

test('فرم محصول با رنگ و فرم: ساخت ترکیب‌ها، موجودی کل، قیمت جداگانه و غیرفعال‌سازی', () => {
  const r = parseProductForm(form({
    opt1_name: 'رنگ', opt1_values: 'A1، A2', opt2_name: 'فرم', opt2_values: 'S',
    'v_stock_A1|S': '۷', 'v_stock_A2|S': '3', 'v_price_A2|S': '1800000', 'v_active_A2|S': 'off',
  }), opts);
  assert.ok(r.ok, !r.ok ? r.errors.join(' | ') : '');
  if (r.ok) {
    assert.equal(r.value.variants.length, 2);
    assert.equal(r.value.variants[0].sku, 'DP-RS-099-A1-S');
    assert.equal(r.value.variants[0].stock, 7);
    assert.equal(r.value.variants[1].retailPrice, 1_800_000);
    assert.equal(r.value.variants[1].isActive, false);
    assert.equal(r.value.stock, 7); // فقط ترکیب‌های فعال
  }
  const bad = parseProductForm(form({ opt1_name: 'رنگ', opt1_values: 'A1، A1' }), opts);
  assert.equal(bad.ok, false);
  const allOff = parseProductForm(form({ opt1_name: 'رنگ', opt1_values: 'A1', 'v_active_A1': 'off' }), opts);
  assert.equal(allOff.ok, false);
  const none = parseProductForm(form(), opts);
  assert.ok(none.ok && none.value.variants.length === 0 && none.value.stock === 10);
});
