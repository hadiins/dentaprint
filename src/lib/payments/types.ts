/**
 * قرارداد مشترک همهٔ درگاه‌های پرداخت.
 * هر درگاه جدید (بانکی یا واسط) فقط باید این رابط را پیاده‌سازی کند و در registry.ts ثبت شود.
 * بقیهٔ سیستم (سفارش، سبد، صفحهٔ پرداخت) هیچ وابستگی‌ای به درگاه خاص ندارد.
 *
 * مبالغ ورودی همیشه «تومان» هستند؛ تبدیل به ریال (در صورت نیاز) داخل خود درگاه انجام می‌شود.
 */

export interface PaymentRequestInput {
  orderNumber: string;
  amountToman: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
  email?: string;
}

/** برخی درگاه‌ها با GET و برخی (اغلب درگاه‌های بانکی) با ارسال فرم POST باز می‌شوند */
export type PaymentRedirect =
  | { method: 'GET'; url: string }
  | { method: 'POST'; url: string; fields: Record<string, string> };

export type RequestResult =
  | { ok: true; token: string; redirect: PaymentRedirect; raw?: unknown }
  | { ok: false; error: string; raw?: unknown };

export interface CallbackData {
  /** شناسهٔ تراکنش درگاه (Authority / trackId / token / RefId ...) */
  token: string | null;
  /** کاربر انصراف داده یا درگاه پرداخت ناموفق اعلام کرده */
  cancelled: boolean;
  raw: Record<string, string>;
}

export type VerifyResult =
  | { ok: true; refId: string; cardPan?: string; alreadyVerified?: boolean; raw?: unknown }
  | { ok: false; error: string; raw?: unknown };

export interface PaymentGateway {
  /** شناسهٔ انگلیسی، در آدرس بازگشت استفاده می‌شود: /api/payments/callback/{id} */
  readonly id: string;
  /** نام نمایشی برای کاربر */
  readonly label: string;
  request(input: PaymentRequestInput): Promise<RequestResult>;
  parseCallback(params: Record<string, string>): CallbackData;
  /** مبلغ مورد انتظار همیشه از پایگاه داده خوانده می‌شود، نه از پارامترهای بازگشتی */
  verify(input: { token: string; amountToman: number }): Promise<VerifyResult>;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export interface GatewayDeps { fetch?: FetchLike; timeoutMs?: number }
