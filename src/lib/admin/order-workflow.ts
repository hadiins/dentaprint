/** گردش کار وضعیت سفارش — فقط انتقال‌های مجاز پذیرفته می‌شوند */
import type { OrderStatus } from '../payments/repo.ts';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'در انتظار پرداخت', PAID: 'پرداخت‌شده', PROCESSING: 'در حال آماده‌سازی',
  SHIPPED: 'ارسال‌شده', DELIVERED: 'تحویل‌شده', CANCELLED: 'لغوشده', REFUNDED: 'مرجوع / بازپرداخت',
};

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/** رویداد پیامکی هر وضعیت (null = بدون پیامک) */
export const STATUS_NOTIFY: Partial<Record<OrderStatus, 'order_processing' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'order_refunded'>> = {
  PROCESSING: 'order_processing', SHIPPED: 'order_shipped', DELIVERED: 'order_delivered', CANCELLED: 'order_cancelled', REFUNDED: 'order_refunded',
};

export type TransitionCheck = { ok: true } | { ok: false; error: string };

export function checkTransition(from: OrderStatus, to: OrderStatus, opts: { trackingCode?: string } = {}): TransitionCheck {
  if (from === to) return { ok: false, error: 'وضعیت جدید با وضعیت فعلی یکسان است.' };
  if (!ORDER_TRANSITIONS[from]?.includes(to)) return { ok: false, error: `تغییر از «${ORDER_STATUS_LABEL[from]}» به «${ORDER_STATUS_LABEL[to]}» مجاز نیست.` };
  if (to === 'SHIPPED' && !(opts.trackingCode && opts.trackingCode.trim().length >= 4)) return { ok: false, error: 'برای ثبت ارسال، کد رهگیری مرسوله را وارد کنید.' };
  return { ok: true };
}

/** آیا تغییر وضعیت، سفارش را از «خرید پرداخت‌شده» خارج می‌کند؟ (برای ارزیابی دوبارهٔ سطح همکار) */
export const affectsSpend = (to: OrderStatus) => to === 'CANCELLED' || to === 'REFUNDED';
