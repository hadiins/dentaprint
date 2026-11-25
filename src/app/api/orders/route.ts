import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildOrderDraft } from '@/lib/orders';
import { getAllProducts } from '@/lib/catalog';
import { getCommerceSettings } from '@/lib/settings';
import { findTier } from '@/lib/commerce-config';
import { normalizeIranMobile, toEnDigits } from '@/lib/format';
import { getRepo } from '@/lib/payments';
import { allowTierPreview } from '@/lib/server/site';
import { getCurrentUser } from '@/lib/auth/server';
import { buyerForUser } from '@/lib/server/buyer';
import type { Buyer } from '@/lib/pricing';

const schema = z.object({
  items: z.array(z.object({ slug: z.string().max(100), variant: z.string().max(120).nullish(), qty: z.number().int().min(1).max(999) })).min(1).max(50),
  customer: z.object({
    fullName: z.string().trim().min(3, 'نام را کامل وارد کنید').max(80),
    phone: z.string(),
    province: z.string().trim().min(2, 'استان را وارد کنید').max(40),
    city: z.string().trim().min(2, 'شهر را وارد کنید').max(40),
    address: z.string().trim().min(10, 'آدرس را کامل وارد کنید').max(400),
    postalCode: z.string().transform((v) => toEnDigits(v)).refine((v) => /^\d{10}$/.test(v), 'کد پستی باید ۱۰ رقم باشد'),
    officialInvoice: z.object({
      orgName: z.string().trim().min(3, 'نام حقوقی خریدار را وارد کنید').max(120),
      economicCode: z.string().transform((v) => toEnDigits(v)).refine((v) => /^\d{12}$|^\d{14}$/.test(v), 'کد اقتصادی باید ۱۲ یا ۱۴ رقم باشد'),
      nationalId: z.string().transform((v) => toEnDigits(v)).refine((v) => v === '' || /^\d{10,11}$/.test(v), 'شناسهٔ ملی / کد ملی نامعتبر است').optional(),
    }).nullish(),
  }),
  /** فقط در حالت نمایشی پذیرفته می‌شود */
  priceView: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر' }, { status: 422 });
  const { items, customer, priceView } = parsed.data;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'برای ثبت سفارش ابتدا وارد شوید.' }, { status: 401 });
  const phone = normalizeIranMobile(customer.phone);
  if (!phone) return NextResponse.json({ error: 'شمارهٔ موبایل معتبر نیست' }, { status: 422 });

  const settings = await getCommerceSettings();
  // قیمت همکار فقط از روی حساب کاربر؛ پیش‌نمایش نمایشی فقط برای غیرهمکاران و فقط اگر صریحاً فعال باشد
  let buyer: Buyer = buyerForUser(user, settings);
  if (buyer.kind === 'retail' && allowTierPreview() && priceView) {
    const tier = findTier(settings, priceView);
    if (tier) buyer = { kind: 'partner', tier, status: 'APPROVED' };
  }

  const catalog = await getAllProducts();
  const r = buildOrderDraft(items, (slug) => catalog.find((p) => p.slug === slug), buyer, settings);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });

  const repo = await getRepo();
  const order = await repo.createOrder(r.draft, { ...customer, phone }, user.phone);
  return NextResponse.json({ orderId: order.id, number: order.number, total: order.total }, { status: 201 });
}
