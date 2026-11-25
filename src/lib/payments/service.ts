/**
 * جریان پرداخت — مستقل از نوع درگاه
 *  startPayment:   سفارش ← ایجاد رکورد پرداخت ← درخواست به درگاه ← آدرس هدایت کاربر
 *  handleCallback: بازگشت از درگاه ← یافتن پرداخت ← verify با «مبلغ ذخیره‌شده در سرور» ← تکمیل سفارش
 * ایمنی: مبلغ هرگز از پارامترهای بازگشتی خوانده نمی‌شود؛ بازگشت تکراری فقط یک بار پردازش می‌شود.
 */
import type { PaymentGateway, PaymentRedirect } from './types.ts';
import type { CommerceRepo } from './repo.ts';

export type StartResult = { ok: true; redirect: PaymentRedirect; paymentId: string } | { ok: false; error: string };

export async function startPayment(repo: CommerceRepo, gateway: PaymentGateway,
  input: { orderId: string; siteUrl: string; email?: string }): Promise<StartResult> {
  const order = await repo.getOrder(input.orderId);
  if (!order) return { ok: false, error: 'سفارش پیدا نشد.' };
  if (order.status !== 'PENDING_PAYMENT') return { ok: false, error: 'این سفارش قبلاً پرداخت یا لغو شده است.' };
  if (order.total <= 0) return { ok: false, error: 'مبلغ سفارش نامعتبر است.' };

  const payment = await repo.createPayment({ orderId: order.id, gateway: gateway.id, amount: order.total });
  const res = await gateway.request({
    orderNumber: order.number, amountToman: order.total, mobile: order.customerPhone, email: input.email,
    description: `سفارش ${order.number} — دنتاپرینت`,
    callbackUrl: `${input.siteUrl.replace(/\/$/, '')}/api/payments/callback/${gateway.id}`,
  });
  if (!res.ok) { await repo.failPayment(payment.id, 'FAILED', res.raw); return { ok: false, error: res.error }; }
  await repo.attachToken(payment.id, res.token, res.raw);
  return { ok: true, redirect: res.redirect, paymentId: payment.id };
}

export type CallbackOutcome = { status: 'success' | 'failed' | 'cancelled'; orderNumber?: string; refId?: string; error?: string };

export async function handleCallback(repo: CommerceRepo, gateway: PaymentGateway, params: Record<string, string>): Promise<CallbackOutcome> {
  const cb = gateway.parseCallback(params);
  if (!cb.token) return { status: 'failed', error: 'اطلاعات بازگشت از درگاه ناقص است.' };
  const payment = await repo.findPayment(gateway.id, cb.token);
  if (!payment) return { status: 'failed', error: 'تراکنش پیدا نشد.' };
  const order = await repo.getOrder(payment.orderId);
  const orderNumber = order?.number;

  if (payment.status === 'SUCCEEDED') return { status: 'success', orderNumber, refId: payment.refId ?? undefined };
  if (payment.status !== 'INITIATED') return { status: payment.status === 'CANCELLED' ? 'cancelled' : 'failed', orderNumber };
  if (cb.cancelled) { await repo.failPayment(payment.id, 'CANCELLED', cb.raw); return { status: 'cancelled', orderNumber }; }

  const v = await gateway.verify({ token: cb.token, amountToman: payment.amount });
  if (!v.ok) { await repo.failPayment(payment.id, 'FAILED', v.raw); return { status: 'failed', orderNumber, error: v.error }; }
  await repo.completePayment(payment.id, { refId: v.refId, cardPan: v.cardPan, raw: v.raw });
  return { status: 'success', orderNumber, refId: v.refId };
}
