/**
 * زیبال
 * request: https://gateway.zibal.ir/v1/request  ← trackId   (مبلغ به ریال)
 * کاربر به https://gateway.zibal.ir/start/{trackId} هدایت می‌شود
 * بازگشت: ?trackId=...&success=1|0&status=...&orderId=...
 * verify:  https://gateway.zibal.ir/v1/verify  (result=100 موفق، 201 قبلاً تأیید شده)
 * برای تست، مرچنت «zibal» استفاده می‌شود.
 */
import type { GatewayDeps, PaymentGateway } from '../types.ts';
import { errMsg, postJson } from '../http.ts';

export interface ZibalConfig { merchant: string }
interface ZibalResponse { result?: number; message?: string; trackId?: number | string; refNumber?: number | string; cardNumber?: string; amount?: number }

export function createZibal(cfg: ZibalConfig, deps: GatewayDeps = {}): PaymentGateway {
  const f = deps.fetch ?? fetch;
  const base = 'https://gateway.zibal.ir';
  return {
    id: 'zibal',
    label: 'زیبال',
    async request(i) {
      try {
        const { data } = await postJson<ZibalResponse>(f, `${base}/v1/request`, {
          merchant: cfg.merchant, amount: i.amountToman * 10, callbackUrl: i.callbackUrl,
          description: i.description, orderId: i.orderNumber, mobile: i.mobile,
        }, deps.timeoutMs);
        if (data?.result === 100 && data.trackId != null) {
          const token = String(data.trackId);
          return { ok: true, token, redirect: { method: 'GET', url: `${base}/start/${token}` }, raw: data };
        }
        return { ok: false, error: data?.message || 'خطا در ارتباط با زیبال', raw: data };
      } catch (e) { return { ok: false, error: errMsg(e) }; }
    },
    parseCallback(p) {
      return { token: p.trackId || null, cancelled: p.success !== '1', raw: p };
    },
    async verify({ token, amountToman }) {
      try {
        const { data } = await postJson<ZibalResponse>(f, `${base}/v1/verify`, { merchant: cfg.merchant, trackId: Number(token) }, deps.timeoutMs);
        if (data && (data.result === 100 || data.result === 201)) {
          if (data.amount != null && data.amount !== amountToman * 10) return { ok: false, error: 'مبلغ پرداخت‌شده با مبلغ سفارش مغایرت دارد.', raw: data };
          return { ok: true, refId: String(data.refNumber ?? token), cardPan: data.cardNumber, alreadyVerified: data.result === 201, raw: data };
        }
        return { ok: false, error: data?.message || 'تأیید پرداخت ناموفق بود.', raw: data };
      } catch (e) { return { ok: false, error: errMsg(e) }; }
    },
  };
}
