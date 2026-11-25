/**
 * کاوه‌نگار — Verify Lookup
 * GET https://api.kavenegar.com/v1/{API-KEY}/verify/lookup.json?receptor=...&token=...&template=...
 * موفقیت: return.status === 200
 */
import type { SmsDeps, SmsProvider } from '../types.ts';

export function createKavenegar(cfg: { apiKey: string; template: string }, deps: SmsDeps = {}): SmsProvider {
  const f = deps.fetch ?? fetch;
  const lookup = async (q: URLSearchParams) => {
    try {
      const res = await f(`https://api.kavenegar.com/v1/${encodeURIComponent(cfg.apiKey)}/verify/lookup.json?${q}`, { signal: AbortSignal.timeout(deps.timeoutMs ?? 10000) });
      const d = (await res.json().catch(() => null)) as { return?: { status?: number; message?: string }; entries?: { messageid?: number }[] } | null;
      if (d?.return?.status === 200) return { ok: true as const, messageId: String(d.entries?.[0]?.messageid ?? '') };
      return { ok: false as const, error: d?.return?.message || `خطای کاوه‌نگار (${res.status})` };
    } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : 'خطای ارسال پیامک' }; }
  };
  return {
    id: 'kavenegar',
    label: 'کاوه‌نگار',
    async sendTemplate(phone, template, params) {
      const q = new URLSearchParams({ receptor: phone, template });
      params.slice(0, 3).forEach((p, i) => q.set(i === 0 ? 'token' : `token${i + 1}`, p.value || '-'));
      return lookup(q);
    },
    async sendOtp(phone, code) {
      const q = new URLSearchParams({ receptor: phone, token: code, template: cfg.template });
      try {
        const res = await f(`https://api.kavenegar.com/v1/${encodeURIComponent(cfg.apiKey)}/verify/lookup.json?${q}`, { signal: AbortSignal.timeout(deps.timeoutMs ?? 10000) });
        const d = (await res.json().catch(() => null)) as { return?: { status?: number; message?: string }; entries?: { messageid?: number }[] } | null;
        if (d?.return?.status === 200) return { ok: true, messageId: String(d.entries?.[0]?.messageid ?? '') };
        return { ok: false, error: d?.return?.message || `خطای کاوه‌نگار (${res.status})` };
      } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'خطای ارسال پیامک' }; }
    },
  };
}
