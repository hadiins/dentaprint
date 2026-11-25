/**
 * آدرس بازگشت همهٔ درگاه‌ها:  /api/payments/callback/{gatewayId}
 * هم GET (مثل زرین‌پال و زیبال) و هم POST فرم (اغلب درگاه‌های بانکی) پشتیبانی می‌شود.
 */
import { NextResponse } from 'next/server';
import { getGateway, getRepo, handleCallback } from '@/lib/payments';
import { siteUrl } from '@/lib/server/site';
import { evaluatePartnerByPhone } from '@/lib/server/tier-eval';
import { issueInvoiceByOrderNumber } from '@/lib/invoice/issue';

type Ctx = { params: Promise<{ gateway: string }> };

async function handle(req: Request, ctx: Ctx) {
  const { gateway: id } = await ctx.params;
  const params: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => { params[k] = v; });
  if (req.method === 'POST') {
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) Object.assign(params, await req.json().catch(() => ({})));
    else (await req.formData().catch(() => new FormData())).forEach((v, k) => { if (typeof v === 'string') params[k] = v; });
  }
  const gateway = getGateway(id);
  const out = gateway
    ? await handleCallback(await getRepo(), gateway, params).catch((e) => { console.error('[payment-callback]', id, e); return { status: 'failed' as const, error: 'خطای داخلی در تأیید پرداخت' }; })
    : { status: 'failed' as const, error: 'درگاه نامعتبر' };
  // ارتقای فوری سطح همکار بعد از پرداخت موفق (خطا در این مرحله نتیجهٔ پرداخت را تغییر نمی‌دهد)
  if (out.status === 'success' && 'orderNumber' in out && out.orderNumber) {
    const order = await (await getRepo()).getOrderByNumber(out.orderNumber);
    if (order) await evaluatePartnerByPhone(order.customerPhone).catch((e) => console.error('[tier-eval]', e));
    // صدور خودکار فاکتور (اگر ناموفق باشد، هنگام باز کردن فاکتور یا از پنل دوباره صادر می‌شود)
    await issueInvoiceByOrderNumber(out.orderNumber).catch((e) => console.error('[invoice]', e));
  }
  const q = new URLSearchParams({ status: out.status });
  if ('orderNumber' in out && out.orderNumber) q.set('order', out.orderNumber);
  if ('refId' in out && out.refId) q.set('ref', out.refId);
  if (out.error) q.set('msg', out.error);
  return NextResponse.redirect(`${siteUrl()}/checkout/result?${q}`, 303);
}

export const GET = handle;
export const POST = handle;
