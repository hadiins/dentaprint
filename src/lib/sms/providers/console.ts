/** حالت توسعه: پیامکی ارسال نمی‌شود و کد در کنسول سرور چاپ می‌شود. در production غیرفعال است. */
import type { SmsDeps, SmsProvider } from '../types.ts';

export function createConsoleSms(deps: SmsDeps = {}): SmsProvider {
  const log = deps.log ?? ((m: string) => console.info(m));
  return {
    id: 'console',
    label: 'کنسول (توسعه)',
    async sendOtp(phone, code) { log(`[SMS:dev] کد ورود ${phone}: ${code}`); return { ok: true }; },
    async sendTemplate(phone, template, params) { log(`[SMS:dev] ${template} ← ${phone}: ${params.map((p) => `${p.name}=${p.value}`).join(' ')}`); return { ok: true }; },
  };
}
