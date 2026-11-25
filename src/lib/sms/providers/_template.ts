/**
 * قالب افزودن سرویس پیامک جدید (ملی‌پیامک، فراز اس‌ام‌اس/IPPanel، قاصدک، ...)
 * ۱) این فایل را کپی کنید  ۲) sendOtp را طبق مستندات «ارسال الگو/پترن» کامل کنید
 * ۳) یک خط در sms/registry.ts اضافه کنید  ۴) SMS_PROVIDER را در .env تنظیم کنید
 */
import type { SmsDeps, SmsProvider } from '../types.ts';

export function createExampleSms(cfg: { apiKey: string; patternCode: string; sender: string }, deps: SmsDeps = {}): SmsProvider {
  const f = deps.fetch ?? fetch;
  return {
    id: 'example',
    label: 'سرویس نمونه',
    async sendOtp(phone, code) {
      try {
        const res = await f('https://api.example-sms.ir/pattern/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
          body: JSON.stringify({ to: phone, from: cfg.sender, pattern: cfg.patternCode, values: { code } }),
        });
        return res.ok ? { ok: true } : { ok: false, error: `خطای سرویس پیامک (${res.status})` };
      } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'خطای ارسال پیامک' }; }
    },
  };
}
