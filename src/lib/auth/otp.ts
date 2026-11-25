/**
 * ورود با کد یک‌بارمصرف پیامکی
 * امنیت:
 *  - کد ۵ رقمی تصادفی (crypto) و فقط «هش HMAC» آن ذخیره می‌شود
 *  - اعتبار ۲ دقیقه، حداکثر ۵ بار تلاش برای هر کد
 *  - فاصلهٔ ارسال مجدد ۹۰ ثانیه، حداکثر ۵ پیامک در ساعت برای هر شماره و ۲۰ پیامک در ساعت برای هر IP
 *  - مقایسهٔ زمان-ثابت (timingSafeEqual) و مصرف اتمی کد
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { AuthRepo } from './types.ts';
import type { SmsProvider } from '../sms/types.ts';

export const OTP = {
  length: 5,
  ttlMs: 2 * 60_000,
  resendCooldownMs: 90_000,
  maxPerPhonePerHour: 5,
  maxPerIpPerHour: 20,
  maxAttempts: 5,
};

const HOUR = 3_600_000;
export const hashCode = (secret: string, phone: string, code: string) => createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
export const generateCode = (len = OTP.length) => String(randomInt(0, 10 ** len)).padStart(len, '0');
const sec = (ms: number) => Math.ceil(ms / 1000);

export type RequestOtpResult = { ok: true; expiresIn: number; resendIn: number } | { ok: false; error: string; retryAfter?: number };

export async function requestOtp(a: {
  repo: AuthRepo; sms: SmsProvider | null; secret: string; phone: string; ip: string | null; now?: number; codeGen?: () => string;
}): Promise<RequestOtpResult> {
  const now = a.now ?? Date.now();
  if (!a.sms) return { ok: false, error: 'سرویس پیامک تنظیم نشده است.' };
  const last = await a.repo.latestOtp(a.phone);
  if (last && now - last.createdAt < OTP.resendCooldownMs) {
    const retryAfter = sec(OTP.resendCooldownMs - (now - last.createdAt));
    return { ok: false, error: `لطفاً ${retryAfter} ثانیهٔ دیگر دوباره تلاش کنید.`, retryAfter };
  }
  if ((await a.repo.countOtpsSince({ phone: a.phone }, now - HOUR)) >= OTP.maxPerPhonePerHour) {
    return { ok: false, error: 'تعداد درخواست کد برای این شماره زیاد است؛ یک ساعت دیگر تلاش کنید.' };
  }
  if (a.ip && (await a.repo.countOtpsSince({ ip: a.ip }, now - HOUR)) >= OTP.maxPerIpPerHour) {
    return { ok: false, error: 'تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.' };
  }
  const code = (a.codeGen ?? generateCode)();
  await a.repo.createOtp({ phone: a.phone, codeHash: hashCode(a.secret, a.phone, code), expiresAt: now + OTP.ttlMs, ip: a.ip, now });
  const sent = await a.sms.sendOtp(a.phone, code);
  if (!sent.ok) return { ok: false, error: 'ارسال پیامک ناموفق بود؛ چند لحظهٔ دیگر تلاش کنید.' };
  return { ok: true, expiresIn: sec(OTP.ttlMs), resendIn: sec(OTP.resendCooldownMs) };
}

export type VerifyOtpResult = { ok: true } | { ok: false; error: string };

export async function verifyOtp(a: { repo: AuthRepo; secret: string; phone: string; code: string; now?: number }): Promise<VerifyOtpResult> {
  const now = a.now ?? Date.now();
  const expired = { ok: false as const, error: 'کد منقضی شده است؛ دوباره درخواست کد دهید.' };
  if (!/^\d+$/.test(a.code) || a.code.length !== OTP.length) return { ok: false, error: `کد ${OTP.length} رقمی را وارد کنید.` };
  const otp = await a.repo.latestOtp(a.phone);
  if (!otp || otp.consumedAt || otp.expiresAt <= now) return expired;
  if (otp.attempts >= OTP.maxAttempts) return { ok: false, error: 'تعداد تلاش‌ها بیش از حد مجاز شد؛ دوباره درخواست کد دهید.' };
  const a1 = Buffer.from(hashCode(a.secret, a.phone, a.code), 'hex'), b1 = Buffer.from(otp.codeHash, 'hex');
  if (a1.length !== b1.length || !timingSafeEqual(a1, b1)) {
    await a.repo.incrementOtpAttempts(otp.id);
    const left = OTP.maxAttempts - otp.attempts - 1;
    return { ok: false, error: left > 0 ? `کد اشتباه است. ${left} بار دیگر می‌توانید تلاش کنید.` : 'تعداد تلاش‌ها بیش از حد مجاز شد؛ دوباره درخواست کد دهید.' };
  }
  if (!(await a.repo.consumeOtp(otp.id, now))) return expired;
  return { ok: true };
}
