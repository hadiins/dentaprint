/**
 * زرین‌پال — نسخهٔ ۴ (REST/JSON)
 * request: /pg/v4/payment/request.json  ← authority
 * کاربر به /pg/StartPay/{authority} هدایت می‌شود
 * بازگشت: ?Authority=...&Status=OK|NOK
 * verify:  /pg/v4/payment/verify.json  (کد ۱۰۰ موفق، ۱۰۱ قبلاً تأیید شده)
 */
import type { GatewayDeps, PaymentGateway } from '../types.ts';
import { errMsg, postJson } from '../http.ts';

export interface ZarinpalConfig { merchantId: string; sandbox?: boolean; currency?: 'IRT' | 'IRR' }

interface ZpResponse { data?: { code?: number; message?: string; authority?: string; ref_id?: number | string; card_pan?: string } | []; errors?: { code?: number; message?: string } | unknown[] }

const ERRORS: Record<number, string> = {
  [-9]: 'اطلاعات ارسالی به زرین‌پال نامعتبر است.', [-10]: 'آی‌پی یا مرچنت کد پذیرنده صحیح نیست.',
  [-11]: 'مرچنت کد فعال نیست.', [-12]: 'تلاش بیش از حد؛ کمی بعد دوباره امتحان کنید.',
  [-50]: 'مبلغ پرداخت‌شده با مبلغ سفارش مغایرت دارد.', [-51]: 'پرداخت ناموفق بود.',
  [-54]: 'شناسهٔ پرداخت (Authority) نامعتبر است.',
};

export function createZarinpal(cfg: ZarinpalConfig, deps: GatewayDeps = {}): PaymentGateway {
  const f = deps.fetch ?? fetch;
  const host = cfg.sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  const currency = cfg.currency ?? 'IRT';
  const amount = (toman: number) => (currency === 'IRR' ? toman * 10 : toman);
  const errorOf = (r: ZpResponse | null) => {
    const e = r?.errors as { code?: number; message?: string } | undefined;
    const code = e && !Array.isArray(e) ? e.code : undefined;
    return (code != null && ERRORS[code]) || e?.message || 'خطا در ارتباط با زرین‌پال';
  };

  return {
    id: 'zarinpal',
    label: 'زرین‌پال',
    async request(i) {
      try {
        const { data } = await postJson<ZpResponse>(f, `${host}/pg/v4/payment/request.json`, {
          merchant_id: cfg.merchantId, amount: amount(i.amountToman), currency, description: i.description,
          callback_url: i.callbackUrl, metadata: { mobile: i.mobile, email: i.email, order_id: i.orderNumber },
        }, deps.timeoutMs);
        const d = data?.data && !Array.isArray(data.data) ? data.data : undefined;
        if (d?.code === 100 && d.authority) {
          return { ok: true, token: d.authority, redirect: { method: 'GET', url: `${host}/pg/StartPay/${d.authority}` }, raw: data };
        }
        return { ok: false, error: errorOf(data), raw: data };
      } catch (e) { return { ok: false, error: errMsg(e) }; }
    },
    parseCallback(p) {
      return { token: p.Authority || null, cancelled: p.Status !== 'OK', raw: p };
    },
    async verify({ token, amountToman }) {
      try {
        const { data } = await postJson<ZpResponse>(f, `${host}/pg/v4/payment/verify.json`, {
          merchant_id: cfg.merchantId, amount: amount(amountToman), authority: token,
        }, deps.timeoutMs);
        const d = data?.data && !Array.isArray(data.data) ? data.data : undefined;
        if (d && (d.code === 100 || d.code === 101)) {
          return { ok: true, refId: String(d.ref_id ?? ''), cardPan: d.card_pan, alreadyVerified: d.code === 101, raw: data };
        }
        return { ok: false, error: errorOf(data), raw: data };
      } catch (e) { return { ok: false, error: errMsg(e) }; }
    },
  };
}
