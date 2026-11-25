/**
 * درگاه آزمایشی برای توسعه — هیچ پولی جابه‌جا نمی‌شود.
 * کاربر به صفحهٔ /pay/mock می‌رود و «پرداخت موفق» یا «انصراف» را انتخاب می‌کند.
 * در محیط production فقط با PAYMENT_ALLOW_MOCK=true فعال می‌شود.
 */
import type { PaymentGateway } from '../types.ts';

export function createMockGateway(siteUrl: string): PaymentGateway {
  return {
    id: 'mock',
    label: 'درگاه آزمایشی',
    async request(i) {
      const token = `MOCK-${i.orderNumber}-${Date.now().toString(36)}`;
      const q = new URLSearchParams({ token, amount: String(i.amountToman), order: i.orderNumber, cb: i.callbackUrl });
      return { ok: true, token, redirect: { method: 'GET', url: `${siteUrl}/pay/mock?${q}` } };
    },
    parseCallback(p) {
      return { token: p.token || null, cancelled: p.status !== 'OK', raw: p };
    },
    async verify({ token }) {
      return token.startsWith('MOCK-') ? { ok: true, refId: `T${Date.now()}`, cardPan: '6037-99**-****-1234' } : { ok: false, error: 'توکن آزمایشی نامعتبر' };
    },
  };
}
