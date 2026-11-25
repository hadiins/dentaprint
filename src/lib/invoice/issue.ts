/**
 * صدور و خواندن فاکتور
 * - با پایگاه داده: پس از پرداخت موفق یک‌بار صادر می‌شود (idempotent)، با شمارهٔ ترتیبی سالانه و نسخهٔ ثابت اطلاعات
 * - بدون پایگاه داده (حالت نمایشی): پیش‌نمایش از روی سفارش ساخته می‌شود
 */
import { buildInvoice, invoiceNumber, type BuyerInfo, type InvoiceData, type SellerInfo, type InvoiceSourceLine } from './build';
import { jalaliParts } from './jalali';
import { getSeller } from './seller';
import { PAID_STATUSES, type Customer, type OrderStatus } from '../payments/repo';

export interface InvoiceView {
  number: string; preview: boolean; type: 'SALE' | 'OFFICIAL'; issuedAt: Date; orderNumber: string;
  seller: SellerInfo; buyer: BuyerInfo; data: InvoiceData; ownerPhone: string;
}

function buyerFrom(c: Customer, orgName?: string | null): BuyerInfo {
  const o = c.officialInvoice;
  return {
    name: o?.orgName || orgName || c.fullName, phone: c.phone, postalCode: c.postalCode,
    address: [c.province, c.city, c.address].filter(Boolean).join('، '),
    official: !!o, economicCode: o?.economicCode ?? null, nationalId: o?.nationalId ?? null, orgName: o?.orgName ?? orgName ?? null,
  };
}

export async function issueInvoiceForOrder(orderId: string): Promise<{ number: string } | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import('../prisma');
  const existing = await prisma.invoice.findUnique({ where: { orderId }, select: { number: true } });
  if (existing) return existing;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, user: { include: { partner: { include: { tier: true } } } } } });
  if (!order || !PAID_STATUSES.includes(order.status as OrderStatus)) return null;
  const seller = await getSeller();
  const customer = order.shippingAddress as unknown as Customer;
  const buyer = buyerFrom(customer, order.user.partner?.orgName);
  const data = buildInvoice({
    orderNumber: order.number, shipping: Number(order.shippingCost), priceMode: order.priceMode, tierName: order.user.partner?.tier?.name ?? order.tierSlug,
    lines: order.items.map((i): InvoiceSourceLine => ({ name: i.productName, sku: i.sku, variantLabel: i.variantLabel, quantity: i.quantity, retailUnitPrice: Number(i.retailUnitPrice), unitPrice: Number(i.unitPrice) })),
  }, seller);
  const issuedAt = order.paidAt ?? new Date();
  const year = jalaliParts(issuedAt).jy;
  try {
    return await prisma.$transaction(async (tx) => {
      const c = await tx.invoiceCounter.upsert({ where: { year }, create: { year, last: 1 }, update: { last: { increment: 1 } } });
      const inv = await tx.invoice.create({
        data: {
          number: invoiceNumber(year, c.last), orderId, type: buyer.official ? 'OFFICIAL' : 'SALE', issuedAt,
          seller: JSON.parse(JSON.stringify(seller)), buyer: JSON.parse(JSON.stringify(buyer)), data: JSON.parse(JSON.stringify(data)), total: BigInt(data.totals.total),
        },
      });
      return { number: inv.number };
    });
  } catch (e) {
    // صدور هم‌زمان (مثلاً دو بازگشت از درگاه): رکورد دیگر برنده است؛ تراکنش ما (و شمارنده) برگشت خورده
    const again = await prisma.invoice.findUnique({ where: { orderId }, select: { number: true } });
    if (again) return again;
    throw e;
  }
}

export async function issueInvoiceByOrderNumber(orderNumber: string) {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import('../prisma');
  const o = await prisma.order.findUnique({ where: { number: orderNumber }, select: { id: true } });
  return o ? issueInvoiceForOrder(o.id) : null;
}

/** فاکتور یک سفارش برای نمایش (شمارهٔ سفارش در آدرس) */
export async function getInvoiceView(orderNumber: string): Promise<InvoiceView | null> {
  if (process.env.DATABASE_URL) {
    const { prisma } = await import('../prisma');
    const order = await prisma.order.findUnique({ where: { number: orderNumber }, select: { id: true, status: true, user: { select: { phone: true } } } });
    if (!order || (!PAID_STATUSES.includes(order.status as OrderStatus) && order.status !== 'REFUNDED')) return null;
    let inv = await prisma.invoice.findUnique({ where: { orderId: order.id } });
    if (!inv && PAID_STATUSES.includes(order.status as OrderStatus)) { await issueInvoiceForOrder(order.id); inv = await prisma.invoice.findUnique({ where: { orderId: order.id } }); }
    if (!inv) return null;
    return {
      number: inv.number, preview: false, type: inv.type as 'SALE' | 'OFFICIAL', issuedAt: inv.issuedAt, orderNumber,
      seller: inv.seller as unknown as SellerInfo, buyer: inv.buyer as unknown as BuyerInfo, data: inv.data as unknown as InvoiceData, ownerPhone: order.user.phone,
    };
  }
  // حالت نمایشی (حافظه)
  const { getRepo } = await import('../payments');
  const { MemoryRepo } = await import('../payments/memory-repo');
  const repo = await getRepo();
  if (!(repo instanceof MemoryRepo)) return null;
  const o = [...repo.orders.values()].find((x) => x.number === orderNumber);
  if (!o || !PAID_STATUSES.includes(o.status)) return null;
  const seller = await getSeller();
  const buyer = buyerFrom(o.customer);
  const data = buildInvoice({ orderNumber, shipping: o.draft.shipping, priceMode: o.draft.priceMode, tierName: o.draft.tierSlug,
    lines: o.draft.lines.map((l) => ({ name: l.name, sku: l.sku, variantLabel: l.variantLabel, quantity: l.quantity, retailUnitPrice: l.retailUnitPrice, unitPrice: l.unitPrice })) }, seller);
  return { number: `پیش‌نمایش-${orderNumber}`, preview: true, type: buyer.official ? 'OFFICIAL' : 'SALE', issuedAt: new Date(o.paidAt ?? o.createdAt), orderNumber, seller, buyer, data, ownerPhone: o.accountPhone };
}
