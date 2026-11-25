import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDefaultGateway, getGateway, getRepo, startPayment } from '@/lib/payments';
import { siteUrl } from '@/lib/server/site';
import { getCurrentUser } from '@/lib/auth/server';

const schema = z.object({ orderId: z.string().min(1).max(64), gateway: z.string().max(40).optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ابتدا وارد شوید.' }, { status: 401 });
  const repo = await getRepo();
  const order = await repo.getOrder(parsed.data.orderId);
  // فقط صاحب سفارش می‌تواند آن را پرداخت کند
  if (!order || order.customerPhone !== user.phone) return NextResponse.json({ error: 'سفارش پیدا نشد.' }, { status: 404 });
  const gateway = parsed.data.gateway ? getGateway(parsed.data.gateway) : getDefaultGateway();
  if (!gateway) return NextResponse.json({ error: 'درگاه پرداخت فعالی تنظیم نشده است.' }, { status: 503 });
  const r = await startPayment(repo, gateway, { orderId: parsed.data.orderId, siteUrl: siteUrl() });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ redirect: r.redirect });
}
