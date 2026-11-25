import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestOtp, verifyOtp, OTP, hashCode } from '../src/lib/auth/otp.ts';
import { createLogin, hashToken, parseAdminPhones } from '../src/lib/auth/session.ts';
import { MemoryAuthRepo, parseDemoPartners } from '../src/lib/auth/memory-repo.ts';
import { tierProgress } from '../src/lib/tier-progress.ts';
import { createKavenegar } from '../src/lib/sms/providers/kavenegar.ts';
import { createSmsIr } from '../src/lib/sms/providers/smsir.ts';
import { getSmsProvider } from '../src/lib/sms/registry.ts';
import type { SmsProvider } from '../src/lib/sms/types.ts';
import type { Tier } from '../src/lib/pricing.ts';

const SECRET = 'test-secret-test-secret';
const PHONE = '09121234567';
function fakeSms() {
  const sent: { phone: string; code: string }[] = [];
  const sms: SmsProvider = { id: 'fake', label: 'fake', sendOtp: async (phone, code) => { sent.push({ phone, code }); return { ok: true }; } };
  return { sms, sent };
}

test('ورود کامل: درخواست کد ← تأیید ← کد دیگر قابل استفاده نیست', async () => {
  const repo = new MemoryAuthRepo(); const { sms, sent } = fakeSms(); const t0 = 1_000_000;
  const r = await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: '1.1.1.1', now: t0 });
  assert.ok(r.ok);
  assert.equal(sent[0].code.length, 5);
  assert.notEqual(repo.otps[0].codeHash, sent[0].code); // فقط هش ذخیره می‌شود
  assert.equal(repo.otps[0].codeHash, hashCode(SECRET, PHONE, sent[0].code));
  assert.deepEqual(await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: sent[0].code, now: t0 + 1000 }), { ok: true });
  assert.equal((await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: sent[0].code, now: t0 + 2000 })).ok, false);
});

test('کد منقضی‌شده پذیرفته نمی‌شود', async () => {
  const repo = new MemoryAuthRepo(); const { sms, sent } = fakeSms();
  await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: null, now: 0 });
  const r = await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: sent[0].code, now: OTP.ttlMs + 1 });
  assert.ok(!r.ok && r.error.includes('منقضی'));
});

test('حداکثر ۵ تلاش اشتباه؛ بعد از آن حتی کد درست هم رد می‌شود', async () => {
  const repo = new MemoryAuthRepo(); const { sms } = fakeSms();
  await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: null, now: 0, codeGen: () => '12345' });
  for (let i = 0; i < OTP.maxAttempts; i++) assert.equal((await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: '00000', now: 10 })).ok, false);
  const r = await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: '12345', now: 10 });
  assert.ok(!r.ok && r.error.includes('بیش از حد'));
});

test('کد با طول یا قالب نادرست', async () => {
  const repo = new MemoryAuthRepo();
  assert.equal((await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: '12a45' })).ok, false);
  assert.equal((await verifyOtp({ repo, secret: SECRET, phone: PHONE, code: '123' })).ok, false);
});

test('محدودیت ارسال: فاصلهٔ ۹۰ ثانیه و سقف ساعتی هر شماره و هر IP', async () => {
  const repo = new MemoryAuthRepo(); const { sms } = fakeSms();
  assert.ok((await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: 'a', now: 0 })).ok);
  const tooSoon = await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: 'a', now: 30_000 });
  assert.ok(!tooSoon.ok && tooSoon.retryAfter === 60);
  let t = 0;
  for (let i = 1; i < OTP.maxPerPhonePerHour; i++) { t += OTP.resendCooldownMs; assert.ok((await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: 'a', now: t })).ok); }
  t += OTP.resendCooldownMs;
  assert.equal((await requestOtp({ repo, sms, secret: SECRET, phone: PHONE, ip: 'a', now: t })).ok, false);
  // IP: ۲۰ شمارهٔ مختلف از یک IP
  const repo2 = new MemoryAuthRepo();
  for (let i = 0; i < OTP.maxPerIpPerHour; i++) assert.ok((await requestOtp({ repo: repo2, sms, secret: SECRET, phone: `0912000${String(i).padStart(4, '0')}`, ip: 'bot', now: i })).ok);
  assert.equal((await requestOtp({ repo: repo2, sms, secret: SECRET, phone: '09129999999', ip: 'bot', now: 100 })).ok, false);
});

test('شکست ارسال پیامک یا نبود سرویس', async () => {
  const repo = new MemoryAuthRepo();
  const failing: SmsProvider = { id: 'x', label: 'x', sendOtp: async () => ({ ok: false, error: 'down' }) };
  assert.equal((await requestOtp({ repo, sms: failing, secret: SECRET, phone: PHONE, ip: null })).ok, false);
  assert.equal((await requestOtp({ repo, sms: null, secret: SECRET, phone: PHONE, ip: null })).ok, false);
});

test('نشست: فقط هش توکن ذخیره می‌شود، انقضا و خروج کار می‌کند، مدیر از فهرست شماره‌ها', async () => {
  const repo = new MemoryAuthRepo();
  const { token, user } = await createLogin({ repo, phone: PHONE, ip: null, userAgent: 'ua', adminPhones: parseAdminPhones(` ${PHONE} , 09000000000`), now: 0 });
  assert.equal(user.role, 'ADMIN');
  assert.ok(!repo.sessions.has(token));
  assert.equal((await repo.getSessionUser(hashToken(token), 1000))?.phone, PHONE);
  assert.equal(await repo.getSessionUser(hashToken(token), 31 * 86_400_000), null);
  await repo.deleteSession(hashToken(token));
  assert.equal(await repo.getSessionUser(hashToken(token), 1000), null);
});

test('همکار نمایشی در حالت بدون پایگاه داده', async () => {
  const repo = new MemoryAuthRepo(parseDemoPartners('09121111111:silver, 09122222222:gold'));
  const u = await repo.findOrCreateUser('09121111111');
  assert.equal(u.partner?.tierSlug, 'silver'); assert.equal(u.partner?.status, 'APPROVED');
  assert.equal((await repo.findOrCreateUser('09123333333')).partner, null);
});

const T = (id: string, rank: number, minSpend: number, requiresDocuments = false): Tier => ({ id, name: id, rank, discountPercent: rank * 4, minSpend, requiresDocuments });
const TIERS = [T('bronze', 1, 0), T('silver', 2, 150_000_000), T('gold', 3, 600_000_000, true)];

test('پیشرفت سطح: مبلغ باقی‌مانده، درصد و نیاز به مدرک', () => {
  const p = tierProgress(TIERS[0], 75_000_000, 'BASIC', TIERS);
  assert.equal(p.next?.id, 'silver'); assert.equal(p.remaining, 75_000_000); assert.equal(p.percent, 50); assert.equal(p.nextNeedsDocs, false);
  const g = tierProgress(TIERS[1], 400_000_000, 'BASIC', TIERS);
  assert.equal(g.next?.id, 'gold'); assert.equal(g.nextNeedsDocs, true); assert.equal(g.percent, 56);
  assert.equal(tierProgress(TIERS[2], 0, 'DOCUMENTS', TIERS).next, null);
});

function fakeFetch(resp: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  return { calls, f: async (url: string, init?: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(resp)); } };
}

test('کاوه‌نگار: آدرس lookup و تشخیص موفقیت', async () => {
  const ok = fakeFetch({ return: { status: 200 }, entries: [{ messageid: 42 }] });
  const r = await createKavenegar({ apiKey: 'KEY', template: 'dp-otp' }, { fetch: ok.f }).sendOtp(PHONE, '12345');
  assert.deepEqual(r, { ok: true, messageId: '42' });
  const u = new URL(ok.calls[0].url);
  assert.equal(u.origin + u.pathname, 'https://api.kavenegar.com/v1/KEY/verify/lookup.json');
  assert.equal(u.searchParams.get('token'), '12345'); assert.equal(u.searchParams.get('template'), 'dp-otp');
  const bad = fakeFetch({ return: { status: 418, message: 'اعتبار کافی نیست' } });
  assert.deepEqual(await createKavenegar({ apiKey: 'K', template: 't' }, { fetch: bad.f }).sendOtp(PHONE, '1'), { ok: false, error: 'اعتبار کافی نیست' });
});

test('SMS.ir: هدر کلید و بدنهٔ وریفای', async () => {
  const ok = fakeFetch({ status: 1, data: { messageId: 7 } });
  const r = await createSmsIr({ apiKey: 'K', templateId: 123456 }, { fetch: ok.f }).sendOtp(PHONE, '54321');
  assert.ok(r.ok);
  assert.equal(ok.calls[0].url, 'https://api.sms.ir/v1/send/verify');
  assert.equal((ok.calls[0].init?.headers as Record<string, string>)['x-api-key'], 'K');
  assert.deepEqual(JSON.parse(String(ok.calls[0].init?.body)), { mobile: PHONE, templateId: 123456, parameters: [{ name: 'CODE', value: '54321' }] });
});

test('انتخاب سرویس پیامک از تنظیمات', () => {
  assert.equal(getSmsProvider({ SMS_PROVIDER: 'kavenegar', KAVENEGAR_API_KEY: 'k', KAVENEGAR_OTP_TEMPLATE: 't' })?.id, 'kavenegar');
  assert.equal(getSmsProvider({ SMS_PROVIDER: 'kavenegar', NODE_ENV: 'development' })?.id, 'console');
  assert.equal(getSmsProvider({ SMS_PROVIDER: 'kavenegar', NODE_ENV: 'production' }), null);
  assert.equal(getSmsProvider({ SMS_PROVIDER: 'console', NODE_ENV: 'production' }), null);
  assert.equal(getSmsProvider({ SMS_PROVIDER: 'console', NODE_ENV: 'production', SMS_ALLOW_CONSOLE: 'true' })?.id, 'console');
});
