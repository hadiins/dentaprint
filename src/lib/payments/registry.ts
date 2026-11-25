/**
 * فهرست درگاه‌ها و انتخاب درگاه فعال از روی تنظیمات محیطی (.env)
 *
 *   PAYMENT_GATEWAYS="zarinpal,zibal"   ← درگاه‌های فعال (به ترتیب نمایش)
 *   PAYMENT_DEFAULT_GATEWAY="zarinpal"  ← درگاه پیش‌فرض
 *
 * درگاهی که کلیدش تنظیم نشده باشد خودکار غیرفعال می‌شود.
 * برای افزودن درگاه جدید فقط یک خط به GATEWAY_FACTORIES اضافه کنید.
 */
import type { GatewayDeps, PaymentGateway } from './types.ts';
import { createZarinpal } from './gateways/zarinpal.ts';
import { createZibal } from './gateways/zibal.ts';
import { createMockGateway } from './gateways/mock.ts';

type Env = Record<string, string | undefined>;
type Factory = (env: Env, deps: GatewayDeps) => PaymentGateway | null;

export const GATEWAY_FACTORIES: Record<string, Factory> = {
  zarinpal: (env, deps) => env.ZARINPAL_MERCHANT_ID
    ? createZarinpal({ merchantId: env.ZARINPAL_MERCHANT_ID, sandbox: env.ZARINPAL_SANDBOX === 'true', currency: env.ZARINPAL_CURRENCY === 'IRR' ? 'IRR' : 'IRT' }, deps)
    : null,
  zibal: (env, deps) => env.ZIBAL_MERCHANT ? createZibal({ merchant: env.ZIBAL_MERCHANT }, deps) : null,
  mock: (env) => (env.NODE_ENV !== 'production' || env.PAYMENT_ALLOW_MOCK === 'true')
    ? createMockGateway(env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
    : null,
  // sep: (env, deps) => env.SEP_TERMINAL_ID ? createSep({...}, deps) : null,
};

export function getEnabledGateways(env: Env = process.env, deps: GatewayDeps = {}): PaymentGateway[] {
  const ids = (env.PAYMENT_GATEWAYS ?? 'mock').split(',').map((s) => s.trim()).filter(Boolean);
  const out: PaymentGateway[] = [];
  for (const id of ids) {
    const g = GATEWAY_FACTORIES[id]?.(env, deps);
    if (g && !out.some((x) => x.id === g.id)) out.push(g);
  }
  return out;
}

export function getGateway(id: string, env: Env = process.env, deps: GatewayDeps = {}): PaymentGateway | null {
  return getEnabledGateways(env, deps).find((g) => g.id === id) ?? null;
}

export function getDefaultGateway(env: Env = process.env, deps: GatewayDeps = {}): PaymentGateway | null {
  const all = getEnabledGateways(env, deps);
  return all.find((g) => g.id === env.PAYMENT_DEFAULT_GATEWAY) ?? all[0] ?? null;
}
