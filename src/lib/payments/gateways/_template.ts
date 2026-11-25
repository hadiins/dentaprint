/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  قالب افزودن درگاه جدید (بانکی یا واسط)                         │
 * └───────────────────────────────────────────────────────────────┘
 * ۱) این فایل را کپی کنید، مثلاً به نام  gateways/sep.ts
 * ۲) سه متد request / parseCallback / verify را طبق مستندات درگاه کامل کنید
 * ۳) در registry.ts یک خط به GATEWAY_FACTORIES اضافه کنید
 * ۴) کلیدها را در .env بگذارید و شناسه را به PAYMENT_GATEWAYS اضافه کنید
 *
 * نکته‌ها:
 * - مبلغ ورودی تومان است؛ اگر درگاه ریال می‌خواهد ×۱۰ کنید.
 * - بیشتر درگاه‌های بانکی کاربر را با «فرم POST» به صفحهٔ پرداخت می‌برند ← redirect.method = 'POST'
 * - بیشتر درگاه‌های بانکی نتیجه را هم با POST به آدرس بازگشت می‌فرستند؛ route بازگشت هر دو را پشتیبانی می‌کند.
 * - در verify همیشه مبلغ تأییدشده را با amountToman مقایسه کنید.
 * - برخی بانک‌ها پس از verify، مرحلهٔ settle هم دارند؛ آن را داخل verify انجام دهید.
 */
import type { GatewayDeps, PaymentGateway } from '../types.ts';
import { errMsg, postJson } from '../http.ts';

export interface ExampleBankConfig { terminalId: string; apiBase: string; paymentPageUrl: string }

export function createExampleBank(cfg: ExampleBankConfig, deps: GatewayDeps = {}): PaymentGateway {
  const f = deps.fetch ?? fetch;
  return {
    id: 'example-bank',
    label: 'بانک نمونه',
    async request(i) {
      try {
        const { data } = await postJson<{ token?: string; error?: string }>(f, `${cfg.apiBase}/token`, {
          terminalId: cfg.terminalId, amount: i.amountToman * 10, resNum: i.orderNumber, redirectUrl: i.callbackUrl, cellNumber: i.mobile,
        });
        if (!data?.token) return { ok: false, error: data?.error || 'دریافت توکن ناموفق بود', raw: data };
        return { ok: true, token: data.token, redirect: { method: 'POST', url: cfg.paymentPageUrl, fields: { Token: data.token } }, raw: data };
      } catch (e) { return { ok: false, error: errMsg(e) }; }
    },
    parseCallback(p) {
      return { token: p.Token || null, cancelled: p.State !== 'OK', raw: p };
    },
    async verify({ token, amountToman }) {
      try {
        const { data } = await postJson<{ success?: boolean; amount?: number; refNum?: string; maskedPan?: string }>(f, `${cfg.apiBase}/verify`, { terminalId: cfg.terminalId, token });
        if (!data?.success) return { ok: false, error: 'تأیید پرداخت ناموفق بود', raw: data };
        if (data.amount !== amountToman * 10) return { ok: false, error: 'مغایرت مبلغ', raw: data };
        return { ok: true, refId: String(data.refNum), cardPan: data.maskedPan, raw: data };
      } catch (e) { return { ok: false, error: errMsg(e) }; }
    },
  };
}
