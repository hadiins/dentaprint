import { NextResponse } from 'next/server';
import { normalizeIranMobile, toEnDigits } from '@/lib/format';
import { verifyOtp } from '@/lib/auth/otp';
import { createLogin, parseAdminPhones } from '@/lib/auth/session';
import { authSecret, clientIp, getAuthRepo, setSessionCookie } from '@/lib/auth/server';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { phone?: string; code?: string } | null;
  const phone = normalizeIranMobile(String(body?.phone ?? ''));
  const code = toEnDigits(String(body?.code ?? ''));
  if (!phone) return NextResponse.json({ error: 'شمارهٔ موبایل معتبر نیست.' }, { status: 422 });
  const repo = await getAuthRepo();
  const v = await verifyOtp({ repo, secret: authSecret(), phone, code });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { token, user } = await createLogin({
    repo, phone, ip: await clientIp(), userAgent: req.headers.get('user-agent'), adminPhones: parseAdminPhones(process.env.ADMIN_PHONES),
  });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, needsName: !user.fullName });
}
