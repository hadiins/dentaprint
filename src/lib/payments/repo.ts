import type { OrderDraft } from '../orders.ts';

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'INITIATED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface Customer {
  fullName: string; phone: string; province: string; city: string; address: string; postalCode: string;
  /** درخواست فاکتور رسمی (اطلاعات اقتصادی خریدار) */
  officialInvoice?: { orgName: string; economicCode: string; nationalId?: string } | null;
}
export interface OrderRecord { id: string; number: string; status: OrderStatus; total: number; customerPhone: string; createdAt?: number }
export const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
export interface PaymentRecord { id: string; orderId: string; gateway: string; amount: number; status: PaymentStatus; token: string | null; refId?: string | null }

/** لایهٔ ذخیره‌سازی سفارش و پرداخت؛ دو پیاده‌سازی دارد: حافظه (توسعه/تست) و Prisma */
export interface CommerceRepo {
  /** accountPhone: شمارهٔ حساب کاربر واردشده (ممکن است با شمارهٔ گیرنده فرق کند) */
  createOrder(draft: OrderDraft, customer: Customer, accountPhone?: string): Promise<OrderRecord>;
  listOrdersByAccount(phone: string, limit?: number): Promise<OrderRecord[]>;
  /** جمع خرید پرداخت‌شده (بدون هزینهٔ ارسال) از تاریخ since — برای سطح‌بندی */
  paidSpendByAccount(phone: string, since: number): Promise<number>;
  getOrder(id: string): Promise<OrderRecord | null>;
  getOrderByNumber(number: string): Promise<OrderRecord | null>;
  createPayment(input: { orderId: string; gateway: string; amount: number }): Promise<PaymentRecord>;
  attachToken(paymentId: string, token: string, raw?: unknown): Promise<void>;
  findPayment(gateway: string, token: string): Promise<PaymentRecord | null>;
  failPayment(paymentId: string, status: 'FAILED' | 'CANCELLED', raw?: unknown): Promise<void>;
  /** به‌صورت اتمی: پرداخت INITIATED ← SUCCEEDED و سفارش ← PAID. اگر قبلاً پردازش شده باشد false */
  completePayment(paymentId: string, result: { refId: string; cardPan?: string; raw?: unknown }): Promise<boolean>;
}
