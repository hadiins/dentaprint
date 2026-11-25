/**
 * انتخاب سرویس پیامک از .env
 *   SMS_PROVIDER="kavenegar" | "smsir" | "console"
 * اگر کلید سرویس انتخاب‌شده تنظیم نشده باشد: در توسعه ← console، در production ← null (ورود غیرفعال با پیام خطا)
 */
import type { SmsDeps, SmsProvider } from './types.ts';
import { createKavenegar } from './providers/kavenegar.ts';
import { createSmsIr } from './providers/smsir.ts';
import { createConsoleSms } from './providers/console.ts';

type Env = Record<string, string | undefined>;

export const SMS_FACTORIES: Record<string, (env: Env, deps: SmsDeps) => SmsProvider | null> = {
  kavenegar: (env, deps) => (env.KAVENEGAR_API_KEY && env.KAVENEGAR_OTP_TEMPLATE ? createKavenegar({ apiKey: env.KAVENEGAR_API_KEY, template: env.KAVENEGAR_OTP_TEMPLATE }, deps) : null),
  smsir: (env, deps) => (env.SMSIR_API_KEY && env.SMSIR_OTP_TEMPLATE_ID ? createSmsIr({ apiKey: env.SMSIR_API_KEY, templateId: Number(env.SMSIR_OTP_TEMPLATE_ID), paramName: env.SMSIR_OTP_PARAM || 'CODE' }, deps) : null),
  // روی سرور فقط برای نسخهٔ آزمایشی و با SMS_ALLOW_CONSOLE=true (کد در لاگ سرور نوشته می‌شود)
  console: (env, deps) => (env.NODE_ENV !== 'production' || env.SMS_ALLOW_CONSOLE === 'true' ? createConsoleSms(deps) : null),
};

export function getSmsProvider(env: Env = process.env, deps: SmsDeps = {}): SmsProvider | null {
  const id = env.SMS_PROVIDER ?? 'console';
  const p = SMS_FACTORIES[id]?.(env, deps) ?? null;
  if (p) return p;
  return env.NODE_ENV !== 'production' || env.SMS_ALLOW_CONSOLE === 'true' ? createConsoleSms(deps) : null;
}
