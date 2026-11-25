import { NextResponse } from 'next/server';
import { normalizeIranMobile } from '@/lib/format';
import { requestOtp } from '@/lib/auth/otp';
import { authSecret, clientIp, getAuthRepo } from '@/lib/auth/server';
import { getSmsProvider } from '@/lib/sms/registry';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { phone?: string } | null;
  const phone = normalizeIranMobile(String(body?.phone ?? ''));
  if (!phone) return NextResponse.json({ error: 'شمارهٔ موبایل معتبر نیست.' }, { status: 422 });
  const r = await requestOtp({ repo: await getAuthRepo(), sms: getSmsProvider(), secret: authSecret(), phone, ip: await clientIp() });
  if (!r.ok) return NextResponse.json({ error: r.error, retryAfter: r.retryAfter }, { status: r.retryAfter ? 429 : 400 });
  return NextResponse.json({ ok: true, phone, expiresIn: r.expiresIn, resendIn: r.resendIn });
}
