import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeIranMobile } from '@/lib/format';

const schema = z.object({
  orgName: z.string().trim().min(3).max(120),
  fullName: z.string().trim().min(3).max(80),
  phone: z.string().transform((v, ctx) => {
    const n = normalizeIranMobile(v);
    if (!n) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'شمارهٔ موبایل معتبر نیست' }); return z.NEVER; }
    return n;
  }),
  city: z.string().trim().min(2).max(60),
  businessType: z.enum(['LAB', 'CLINIC', 'RESELLER', 'EDUCATION', 'OTHER']),
  hasLicense: z.boolean(),
  licenseNumber: z.string().trim().max(40).optional(),
  economicCode: z.string().trim().max(20).optional(),
});

/**
 * ثبت درخواست همکاری.
 * داشتن پروانه اختیاری است: درخواست با وضعیت PENDING و سطح تأیید NONE ثبت می‌شود.
 * مدیر پس از تماس و تأیید هویت/محل کار ← BASIC (سطوح برنزی و نقره‌ای)
 * و در صورت بررسی پروانه یا کد اقتصادی ← DOCUMENTS (همهٔ سطوح، از جمله طلایی).
 */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر' }, { status: 422 });
  }
  const d = parsed.data;

  // تا وقتی پایگاه داده راه‌اندازی نشده، درخواست فقط اعتبارسنجی و ثبت در لاگ می‌شود
  if (!process.env.DATABASE_URL) {
    console.info('[partner-application:demo]', { ...d, phone: d.phone.slice(0, 4) + '***' });
    return NextResponse.json({ ok: true, demo: true }, { status: 202 });
  }

  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.upsert({
    where: { phone: d.phone },
    update: { fullName: d.fullName },
    create: { phone: d.phone, fullName: d.fullName },
    include: { partner: true },
  });
  if (user.partner) {
    return NextResponse.json({ error: 'برای این شماره قبلاً درخواست همکاری ثبت شده است.' }, { status: 409 });
  }
  await prisma.partnerProfile.create({
    data: {
      userId: user.id, orgName: d.orgName, businessType: d.businessType, city: d.city,
      hasLicense: d.hasLicense, licenseNumber: d.licenseNumber || null, economicCode: d.economicCode || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
