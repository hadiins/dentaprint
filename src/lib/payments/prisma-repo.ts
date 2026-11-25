/** ذخیره‌سازی سفارش و پرداخت در PostgreSQL با Prisma */
import type { Prisma, PrismaClient } from '@prisma/client';
import { PAID_STATUSES, type CommerceRepo, type Customer, type OrderRecord, type PaymentRecord } from './repo';
import { newOrderNumber, type OrderDraft } from '../orders';

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

export function createPrismaRepo(prisma: PrismaClient): CommerceRepo {
  const toOrder = (o: { id: string; number: string; status: OrderRecord['status']; total: bigint; createdAt: Date; user: { phone: string } }): OrderRecord =>
    ({ id: o.id, number: o.number, status: o.status, total: Number(o.total), customerPhone: o.user.phone, createdAt: o.createdAt.getTime() });
  const toPayment = (p: { id: string; orderId: string; gateway: string; amount: bigint; status: PaymentRecord['status']; authority: string | null; refId: string | null }): PaymentRecord =>
    ({ id: p.id, orderId: p.orderId, gateway: p.gateway, amount: Number(p.amount), status: p.status, token: p.authority, refId: p.refId });

  return {
    async createOrder(draft: OrderDraft, c: Customer, accountPhone?: string) {
      const phone = accountPhone ?? c.phone;
      const user = await prisma.user.upsert({ where: { phone }, update: {}, create: { phone, fullName: c.fullName } });
      const products = await prisma.product.findMany({ where: { slug: { in: draft.lines.map((l) => l.slug) } }, select: { id: true, slug: true } });
      const idOf = new Map(products.map((p) => [p.slug, p.id]));
      const missing = draft.lines.find((l) => !idOf.has(l.slug));
      if (missing) throw new Error(`محصول ${missing.slug} در پایگاه داده نیست`);
      const o = await prisma.order.create({
        data: {
          number: newOrderNumber(), userId: user.id, priceMode: draft.priceMode, tierSlug: draft.tierSlug,
          subtotal: BigInt(draft.subtotal), discountTotal: BigInt(draft.discountTotal), shippingCost: BigInt(draft.shipping), total: BigInt(draft.total),
          shippingAddress: json(c)!,
          needsOfficialInvoice: !!c.officialInvoice, economicCode: c.officialInvoice?.economicCode ?? null,
          items: { create: draft.lines.map((l) => ({
            productId: idOf.get(l.slug)!, productName: l.name, sku: l.sku, variantKey: l.variantKey, variantLabel: l.variantLabel, quantity: l.quantity,
            retailUnitPrice: BigInt(l.retailUnitPrice), unitPrice: BigInt(l.unitPrice), lineTotal: BigInt(l.lineTotal), appliedRules: l.appliedRules,
          })) },
        },
        include: { user: { select: { phone: true } } },
      });
      return toOrder(o);
    },
    async listOrdersByAccount(phone, limit = 20) {
      const list = await prisma.order.findMany({ where: { user: { phone } }, orderBy: { createdAt: 'desc' }, take: limit, include: { user: { select: { phone: true } } } });
      return list.map(toOrder);
    },
    async paidSpendByAccount(phone, since) {
      const r = await prisma.order.aggregate({ _sum: { subtotal: true }, where: { user: { phone }, status: { in: PAID_STATUSES }, paidAt: { gte: new Date(since) } } });
      return Number(r._sum.subtotal ?? 0);
    },
    async getOrder(id) {
      const o = await prisma.order.findUnique({ where: { id }, include: { user: { select: { phone: true } } } });
      return o ? toOrder(o) : null;
    },
    async getOrderByNumber(number) {
      const o = await prisma.order.findUnique({ where: { number }, include: { user: { select: { phone: true } } } });
      return o ? toOrder(o) : null;
    },
    async createPayment(i) {
      return toPayment(await prisma.payment.create({ data: { orderId: i.orderId, gateway: i.gateway, amount: BigInt(i.amount) } }));
    },
    async attachToken(id, token, raw) {
      await prisma.payment.update({ where: { id }, data: { authority: token, rawResponse: json(raw) } });
    },
    async findPayment(gateway, token) {
      const p = await prisma.payment.findFirst({ where: { gateway, authority: token } });
      return p ? toPayment(p) : null;
    },
    async failPayment(id, status, raw) {
      await prisma.payment.updateMany({ where: { id, status: 'INITIATED' }, data: { status, rawResponse: json(raw) } });
    },
    async completePayment(id, r) {
      return prisma.$transaction(async (tx) => {
        const res = await tx.payment.updateMany({
          where: { id, status: 'INITIATED' },
          data: { status: 'SUCCEEDED', refId: r.refId, cardPan: r.cardPan, rawResponse: json(r.raw), verifiedAt: new Date() },
        });
        if (res.count === 0) return false;
        const p = await tx.payment.findUniqueOrThrow({ where: { id } });
        await tx.order.update({ where: { id: p.orderId }, data: { status: 'PAID', paidAt: new Date() } });
        // کسر موجودی (تنوع و محصول). اگر موجودی منفی شود در داشبورد «رو به اتمام» دیده می‌شود.
        const items = await tx.orderItem.findMany({ where: { orderId: p.orderId }, select: { productId: true, variantKey: true, quantity: true } });
        for (const it of items) {
          await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity }, popularity: { increment: 1 } } });
          if (it.variantKey) await tx.productVariant.updateMany({ where: { productId: it.productId, key: it.variantKey }, data: { stock: { decrement: it.quantity } } });
        }
        return true;
      });
    },
  };
}
