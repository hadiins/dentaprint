/**
 * پیامک‌های اطلاع‌رسانی (وضعیت سفارش و همکاری)
 * الگوها در .env تعریف می‌شوند و هر رویدادی که الگو نداشته باشد، بی‌صدا رد می‌شود:
 *   SMS_TEMPLATES='{"order_paid":"dp-paid","order_shipped":"dp-shipped","partner_approved":"dp-partner-ok"}'
 * (برای کاوه‌نگار نام الگو، برای SMS.ir شناسهٔ عددی قالب)
 * ترتیب پارامترها = token، token2، token3 در کاوه‌نگار؛ نام پارامترها در SMS.ir همان name است.
 */
import type { SmsProvider, TemplateParam } from '../sms/types.ts';

export type NotifyEvent =
  | 'order_paid' | 'order_processing' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'order_refunded'
  | 'partner_approved' | 'partner_tier_changed' | 'partner_rejected'
  | 'document_accepted' | 'document_rejected';

export interface NotifyData { order?: string; tracking?: string; tier?: string; name?: string; doc?: string }

/** پارامترهای هر رویداد به ترتیب */
export function notifyParams(event: NotifyEvent, d: NotifyData): TemplateParam[] {
  const p = (name: string, v?: string) => ({ name, value: (v ?? '').replace(/\s+/g, '‌') }); // فاصله ← نیم‌فاصله (توکن کاوه‌نگار فاصله نمی‌پذیرد)
  switch (event) {
    case 'order_shipped': return [p('ORDER', d.order), p('TRACKING', d.tracking)];
    case 'partner_approved': case 'partner_tier_changed': return [p('TIER', d.tier)];
    case 'partner_rejected': return [p('NAME', d.name || 'همکار')];
    case 'document_accepted': case 'document_rejected': return [p('DOC', d.doc)];
    default: return [p('ORDER', d.order)];
  }
}

export function parseTemplates(raw?: string): Partial<Record<NotifyEvent, string>> {
  if (!raw) return {};
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
}

export async function notify(sms: SmsProvider | null, templates: Partial<Record<NotifyEvent, string>>, event: NotifyEvent, phone: string, data: NotifyData):
  Promise<'sent' | 'skipped' | 'failed'> {
  // در حالت توسعه (console) بدون تعریف الگو هم پیام در ترمینال نمایش داده می‌شود
  const tpl = templates[event] ?? (sms?.id === 'console' ? event : undefined);
  if (!sms || !tpl || !sms.sendTemplate) return 'skipped';
  const r = await sms.sendTemplate(phone, tpl, notifyParams(event, data));
  return r.ok ? 'sent' : 'failed';
}
