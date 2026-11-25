import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createZarinpal } from '../src/lib/payments/gateways/zarinpal.ts';
import { createZibal } from '../src/lib/payments/gateways/zibal.ts';
import { createMockGateway } from '../src/lib/payments/gateways/mock.ts';
import { getEnabledGateways, getDefaultGateway } from '../src/lib/payments/registry.ts';
import { startPayment, handleCallback } from '../src/lib/payments/service.ts';
import { MemoryRepo } from '../src/lib/payments/memory-repo.ts';
import { buildOrderDraft, type CatalogItem } from '../src/lib/orders.ts';
import { validateCommerceSettings, type CommerceSettings } from '../src/lib/commerce-config.ts';
import type { FetchLike, PaymentGateway } from '../src/lib/payments/types.ts';

/** fetch ساختگی که درخواست‌ها را ثبت می‌کند و پاسخ از پیش تعیین‌شده برمی‌گرداند */
function fakeFetch(responses: unknown[]) {
  const calls: { url: string; body: any }[] = [];
  const f: FetchLike = async (url, init) => {
    calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify(responses.shift()), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { f, calls };
}
const req = { orderNumber: 'DP-1', amountToman: 4_900_000, callbackUrl: 'https://x.ir/cb', description: 'test', mobile: '09120000000' };

test('زرین‌پال: درخواست موفق ← هدایت به StartPay', async () => {
  const { f, calls } = fakeFetch([{ data: { code: 100, authority: 'A0001' }, errors: [] }]);
  const g = createZarinpal({ merchantId: 'm', sandbox: true }, { fetch: f });
  const r = await g.request(req);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.redirect, { method: 'GET', url: 'https://sandbox.zarinpal.com/pg/StartPay/A0001' });
  assert.equal(calls[0].url, 'https://sandbox.zarinpal.com/pg/v4/payment/request.json');
  assert.equal(calls[0].body.amount, 4_900_000);
  assert.equal(calls[0].body.currency, 'IRT');
});

test('زرین‌پال: حالت ریالی مبلغ را ×۱۰ می‌کند', async () => {
  const { f, calls } = fakeFetch([{ data: { code: 100, authority: 'A' } }, { data: { code: 100, ref_id: 1 } }]);
  const g = createZarinpal({ merchantId: 'm', currency: 'IRR' }, { fetch: f });
  await g.request(req); await g.verify({ token: 'A', amountToman: 100 });
  assert.equal(calls[0].body.amount, 49_000_000);
  assert.equal(calls[1].body.amount, 1000);
  assert.equal(calls[0].url, 'https://payment.zarinpal.com/pg/v4/payment/request.json');
});

test('زرین‌پال: verify کد ۱۰۰ و ۱۰۱ موفق، خطا با پیام فارسی', async () => {
  const { f } = fakeFetch([{ data: { code: 100, ref_id: 201, card_pan: '5022**' } }, { data: { code: 101, ref_id: 201 } }, { data: [], errors: { code: -51, message: 'x' } }]);
  const g = createZarinpal({ merchantId: 'm' }, { fetch: f });
  const a = await g.verify({ token: 'A', amountToman: 1 }); assert.ok(a.ok && a.refId === '201');
  const b = await g.verify({ token: 'A', amountToman: 1 }); assert.ok(b.ok && b.alreadyVerified);
  const c = await g.verify({ token: 'A', amountToman: 1 }); assert.ok(!c.ok && c.error === 'پرداخت ناموفق بود.');
  assert.deepEqual(g.parseCallback({ Authority: 'A', Status: 'NOK' }), { token: 'A', cancelled: true, raw: { Authority: 'A', Status: 'NOK' } });
});

test('زیبال: ریال، آدرس start و کنترل مغایرت مبلغ', async () => {
  const { f, calls } = fakeFetch([{ result: 100, trackId: 777 }, { result: 100, amount: 49_000_000, refNumber: 9 }, { result: 100, amount: 1 }]);
  const g = createZibal({ merchant: 'zibal' }, { fetch: f });
  const r = await g.request(req);
  assert.ok(r.ok && r.redirect.method === 'GET' && r.redirect.url === 'https://gateway.zibal.ir/start/777');
  assert.equal(calls[0].body.amount, 49_000_000);
  assert.ok((await g.verify({ token: '777', amountToman: 4_900_000 })).ok);
  const bad = await g.verify({ token: '777', amountToman: 4_900_000 });
  assert.ok(!bad.ok && bad.error.includes('مغایرت'));
  assert.equal(g.parseCallback({ trackId: '777', success: '0' }).cancelled, true);
});

test('خطای شبکه به پیام قابل‌فهم تبدیل می‌شود', async () => {
  const f: FetchLike = async () => { throw new Error('ECONNRESET'); };
  const r = await createZarinpal({ merchantId: 'm' }, { fetch: f }).request(req);
  assert.ok(!r.ok && r.error === 'ECONNRESET');
});

test('registry: فقط درگاه‌های دارای کلید فعال می‌شوند؛ پیش‌فرض قابل انتخاب است', () => {
  const env = { PAYMENT_GATEWAYS: 'zarinpal,zibal,mock,unknown', ZIBAL_MERCHANT: 'zibal', NODE_ENV: 'development', PAYMENT_DEFAULT_GATEWAY: 'zibal' };
  assert.deepEqual(getEnabledGateways(env).map((g) => g.id), ['zibal', 'mock']);
  assert.equal(getDefaultGateway(env)?.id, 'zibal');
  assert.deepEqual(getEnabledGateways({ PAYMENT_GATEWAYS: 'mock', NODE_ENV: 'production' }).map((g) => g.id), []);
});

/* ---------- جریان کامل: سفارش ← پرداخت ← بازگشت ---------- */
const settings = validateCommerceSettings(JSON.parse(readFileSync(new URL('../config/commerce.json', import.meta.url), 'utf8')));
const S = (settings as { ok: true; value: CommerceSettings }).value;
const CAT: CatalogItem[] = [
  { slug: 'resin', sku: 'R1', name: 'رزین', retailPrice: 4_900_000, partnerMinQty: 3, inStock: true },
  { slug: 'out', sku: 'O1', name: 'ناموجود', retailPrice: 1_000_000, inStock: false },
];
const lookup = (s: string) => CAT.find((c) => c.slug === s);
const customer = { fullName: 'تست', phone: '09120000000', province: 'تهران', city: 'تهران', address: 'خیابان نمونه پلاک ۱', postalCode: '1234567890' };

test('ساخت سفارش: قیمت همکار در سرور محاسبه و ادغام اقلام تکراری', () => {
  const silver = S.tiers.find((t) => t.id === 'silver')!;
  const r = buildOrderDraft([{ slug: 'resin', qty: 2 }, { slug: 'resin', qty: 1 }], lookup, { kind: 'partner', tier: silver, status: 'APPROVED' }, S);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.draft.lines.length, 1);
    assert.equal(r.draft.lines[0].unitPrice, 4_312_000);
    assert.equal(r.draft.priceMode, 'PARTNER');
    assert.equal(r.draft.shipping, 0); // بالای ۱۰ میلیون
    assert.equal(r.draft.total, 12_936_000);
  }
  assert.equal(buildOrderDraft([{ slug: 'out', qty: 1 }], lookup, { kind: 'retail' }, S).ok, false);
  assert.equal(buildOrderDraft([{ slug: 'resin', qty: 0 }], lookup, { kind: 'retail' }, S).ok, false);
  assert.equal(buildOrderDraft([], lookup, { kind: 'retail' }, S).ok, false);
});

async function newOrder(repo: MemoryRepo) {
  const d = buildOrderDraft([{ slug: 'resin', qty: 1 }], lookup, { kind: 'retail' }, S);
  assert.ok(d.ok);
  return repo.createOrder((d as any).draft, customer);
}

test('پرداخت موفق ← سفارش PAID؛ بازگشت تکراری فقط یک بار پردازش می‌شود', async () => {
  const repo = new MemoryRepo(); const g = createMockGateway('http://localhost:3000');
  const order = await newOrder(repo);
  assert.equal(order.total, 5_350_000); // 4.9M + 450K ارسال
  const s = await startPayment(repo, g, { orderId: order.id, siteUrl: 'http://localhost:3000/' });
  assert.ok(s.ok);
  const token = new URL((s as any).redirect.url).searchParams.get('token')!;
  assert.ok(new URL((s as any).redirect.url).searchParams.get('cb')!.endsWith('/api/payments/callback/mock'));
  const r1 = await handleCallback(repo, g, { token, status: 'OK' });
  assert.equal(r1.status, 'success');
  assert.equal((await repo.getOrder(order.id))!.status, 'PAID');
  const r2 = await handleCallback(repo, g, { token, status: 'OK' });
  assert.equal(r2.status, 'success');
  assert.equal([...repo.payments.values()].filter((p) => p.status === 'SUCCEEDED').length, 1);
  const again = await startPayment(repo, g, { orderId: order.id, siteUrl: 'http://x' });
  assert.ok(!again.ok);
});

test('انصراف کاربر ← CANCELLED و سفارش همچنان منتظر پرداخت', async () => {
  const repo = new MemoryRepo(); const g = createMockGateway('http://x');
  const order = await newOrder(repo);
  const s = await startPayment(repo, g, { orderId: order.id, siteUrl: 'http://x' });
  const token = new URL((s as any).redirect.url).searchParams.get('token')!;
  assert.equal((await handleCallback(repo, g, { token, status: 'NOK' })).status, 'cancelled');
  assert.equal((await repo.getOrder(order.id))!.status, 'PENDING_PAYMENT');
  // دوباره می‌تواند پرداخت کند
  assert.ok((await startPayment(repo, g, { orderId: order.id, siteUrl: 'http://x' })).ok);
});

test('verify با مبلغ ذخیره‌شده در سرور انجام می‌شود، نه پارامتر بازگشتی', async () => {
  const repo = new MemoryRepo(); let seen = -1;
  const spy: PaymentGateway = { ...createMockGateway('http://x'), verify: async ({ amountToman }) => { seen = amountToman; return { ok: true, refId: '1' }; } };
  const order = await newOrder(repo);
  const s = await startPayment(repo, spy, { orderId: order.id, siteUrl: 'http://x' });
  const token = new URL((s as any).redirect.url).searchParams.get('token')!;
  await handleCallback(repo, spy, { token, status: 'OK', amount: '1000' });
  assert.equal(seen, 5_350_000);
});

test('توکن ناشناخته یا verify ناموفق', async () => {
  const repo = new MemoryRepo(); const g = createMockGateway('http://x');
  assert.equal((await handleCallback(repo, g, { token: 'nope', status: 'OK' })).status, 'failed');
  const failing: PaymentGateway = { ...g, verify: async () => ({ ok: false, error: 'رد شد' }) };
  const order = await newOrder(repo);
  const s = await startPayment(repo, failing, { orderId: order.id, siteUrl: 'http://x' });
  const token = new URL((s as any).redirect.url).searchParams.get('token')!;
  const r = await handleCallback(repo, failing, { token, status: 'OK' });
  assert.equal(r.status, 'failed'); assert.equal(r.error, 'رد شد');
  assert.equal((await repo.getOrder(order.id))!.status, 'PENDING_PAYMENT');
});

test('سفارش‌های حساب و جمع خرید پرداخت‌شده برای سطح‌بندی', async () => {
  const repo = new MemoryRepo(); const g = createMockGateway('http://x');
  const d = buildOrderDraft([{ slug: 'resin', qty: 1 }], lookup, { kind: 'retail' }, S);
  assert.ok(d.ok);
  // گیرنده شمارهٔ دیگری دارد، اما سفارش به حساب کاربر واردشده تعلق دارد
  const o1 = await repo.createOrder((d as any).draft, { ...customer, phone: '09350000000' }, '09121234567');
  await repo.createOrder((d as any).draft, customer, '09121234567');
  const s = await startPayment(repo, g, { orderId: o1.id, siteUrl: 'http://x' });
  await handleCallback(repo, g, { token: new URL((s as any).redirect.url).searchParams.get('token')!, status: 'OK' });
  assert.equal((await repo.listOrdersByAccount('09121234567')).length, 2);
  assert.equal(await repo.paidSpendByAccount('09121234567', 0), 4_900_000); // فقط پرداخت‌شده، بدون ارسال
  assert.equal(await repo.paidSpendByAccount('09121234567', Date.now() + 1000), 0);
  assert.equal((await repo.listOrdersByAccount('09350000000')).length, 0);
});
