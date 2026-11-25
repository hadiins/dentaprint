/**
 * SMS.ir — ارسال وریفای (الگو)
 * POST https://api.sms.ir/v1/send/verify   هدر: x-api-key
 * بدنه: { mobile, templateId, parameters: [{ name, value }] }
 * موفقیت: status === 1
 */
import type { SmsDeps, SmsProvider } from '../types.ts';

export function createSmsIr(cfg: { apiKey: string; templateId: number; paramName?: string }, deps: SmsDeps = {}): SmsProvider {
  const f = deps.fetch ?? fetch;
  const send = async (phone: string, templateId: number, parameters: { name: string; value: string }[]) => {
    try {
      const res = await f('https://api.sms.ir/v1/send/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-api-key': cfg.apiKey },
        body: JSON.stringify({ mobile: phone, templateId, parameters }), signal: AbortSignal.timeout(deps.timeoutMs ?? 10000),
      });
      const d = (await res.json().catch(() => null)) as { status?: number; message?: string } | null;
      return d?.status === 1 ? { ok: true as const } : { ok: false as const, error: d?.message || `خطای SMS.ir (${res.status})` };
    } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : 'خطای ارسال پیامک' }; }
  };
  return {
    id: 'smsir',
    label: 'SMS.ir',
    async sendTemplate(phone, template, params) {
      const id = Number(template);
      if (!Number.isInteger(id)) return { ok: false, error: 'شناسهٔ قالب SMS.ir باید عدد باشد' };
      return send(phone, id, params);
    },
    async sendOtp(phone, code) {
      try {
        const res = await f('https://api.sms.ir/v1/send/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-api-key': cfg.apiKey },
          body: JSON.stringify({ mobile: phone, templateId: cfg.templateId, parameters: [{ name: cfg.paramName ?? 'CODE', value: code }] }),
          signal: AbortSignal.timeout(deps.timeoutMs ?? 10000),
        });
        const d = (await res.json().catch(() => null)) as { status?: number; message?: string; data?: { messageId?: number } } | null;
        if (d?.status === 1) return { ok: true, messageId: String(d.data?.messageId ?? '') };
        return { ok: false, error: d?.message || `خطای SMS.ir (${res.status})` };
      } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'خطای ارسال پیامک' }; }
    },
  };
}
