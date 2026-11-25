/**
 * قرارداد مشترک ارائه‌دهندگان پیامک — مثل درگاه پرداخت، هر سرویس پیامکی قابل اتصال است.
 * برای ورود از «پیامک الگو/وریفای» استفاده می‌شود (سریع‌تر و بدون فیلتر مخابرات).
 */
export type SendResult = { ok: true; messageId?: string } | { ok: false; error: string };

export interface TemplateParam { name: string; value: string }

export interface SmsProvider {
  readonly id: string;
  readonly label: string;
  sendOtp(phone: string, code: string): Promise<SendResult>;
  /** پیامک الگو برای اطلاع‌رسانی (وضعیت سفارش، تأیید همکار، ...) */
  sendTemplate?(phone: string, template: string, params: TemplateParam[]): Promise<SendResult>;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export interface SmsDeps { fetch?: FetchLike; timeoutMs?: number; log?: (msg: string) => void }
