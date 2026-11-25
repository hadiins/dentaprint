/** دسترسی به داده‌های پنل مدیریت (فقط با پایگاه داده) */
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { PAID_STATUSES, type OrderStatus } from '../payments/repo';
import { checkTransition } from './order-workflow';
import { validatePartnerDecision, type PartnerDecision } from './partner-review';
import type { ProductInput } from './product-input';
import type { TierConfig } from '../commerce-config';
import type { ProductOption, ProductVariant } from '../variants';

const n = (v: bigint | null | undefined) => (v == null ? null : Number(v));

/* ───────── داشبورد ───────── */
export async function dashboardStats() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [pendingPartners, toShip, today, products, lowStock, pendingPay, pendingDocs] = await Promise.all([
    prisma.partnerProfile.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { status: { in: PAID_STATUSES }, paidAt: { gte: start } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({ where: { isActive: true, stock: { lte: 3 } }, select: { id: true, name: true, stock: true }, take: 8, orderBy: { stock: 'asc' } }),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT', createdAt: { gte: start } } }),
    prisma.partnerDocument.count({ where: { status: 'PENDING' } }),
  ]);
  return { pendingDocs, pendingPartners, toShip, todaySales: n(today._sum.total) ?? 0, todayOrders: today._count, products, lowStock, pendingPay };
}

/* ───────── همکاران ────���──── */
export async function listPartners(f: { status?: string; q?: string }) {
  const where: Prisma.PartnerProfileWhereInput = {
    ...(f.status ? { status: f.status as never } : {}),
    ...(f.q ? { OR: [{ orgName: { contains: f.q, mode: 'insensitive' } }, { city: { contains: f.q } }, { user: { phone: { contains: f.q } } }, { user: { fullName: { contains: f.q } } }] } : {}),
  };
  return prisma.partnerProfile.findMany({
    where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200,
    include: { user: { select: { phone: true, fullName: true } }, tier: { select: { slug: true, name: true, icon: true } }, _count: { select: { documents: { where: { status: 'PENDING' } } } } },
  });
}

export async function getPartner(id: string, windowDays: number) {
  const p = await prisma.partnerProfile.findUnique({
    where: { id },
    include: { user: true, tier: true, documents: { orderBy: { createdAt: 'desc' } }, tierHistory: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!p) return null;
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const [spend, orders] = await Promise.all([
    prisma.order.aggregate({ _sum: { subtotal: true }, where: { userId: p.userId, status: { in: PAID_STATUSES }, paidAt: { gte: since } } }),
    prisma.order.count({ where: { userId: p.userId, status: { in: PAID_STATUSES } } }),
  ]);
  return { ...p, spend: n(spend._sum.subtotal) ?? 0, paidOrders: orders };
}

export async function decidePartner(id: string, d: PartnerDecision & { adminNotes?: string }, tiers: TierConfig[], adminId: string) {
  const errors = validatePartnerDecision(d, tiers);
  if (errors.length) return { ok: false as const, errors };
  const p = await prisma.partnerProfile.findUnique({ where: { id }, include: { tier: true, user: true } });
  if (!p) return { ok: false as const, errors: ['همکار پیدا نشد.'] };
  const tierRow = d.tierSlug ? await prisma.partnerTier.findUnique({ where: { slug: d.tierSlug } }) : null;
  const tierId = d.status === 'APPROVED' ? tierRow?.id ?? null : p.tierId;
  await prisma.$transaction(async (tx) => {
    await tx.partnerProfile.update({
      where: { id },
      data: {
        status: d.status, verification: d.verification, tierId, tierLocked: d.tierLocked,
        adminNotes: d.adminNotes ?? p.adminNotes, approvedAt: d.status === 'APPROVED' ? p.approvedAt ?? new Date() : p.approvedAt,
      },
    });
    if (p.user.role !== 'ADMIN') await tx.user.update({ where: { id: p.userId }, data: { role: d.status === 'APPROVED' ? 'PARTNER' : 'CUSTOMER' } });
    if (tierId && tierId !== p.tierId) await tx.tierChange.create({ data: { partnerId: id, fromTierId: p.tierId, toTierId: tierId, reason: 'ADMIN', changedBy: adminId } });
  });
  return { ok: true as const, phone: p.user.phone, orgName: p.orgName, prevStatus: p.status, prevTier: p.tier?.slug ?? null, tierName: tierRow?.name ?? null };
}

/* ───────── سفارش‌ها ───────── */
export async function listOrders(f: { status?: string; q?: string }) {
  const where: Prisma.OrderWhereInput = {
    ...(f.status ? { status: f.status as OrderStatus } : {}),
    ...(f.q ? { OR: [{ number: { contains: f.q.toUpperCase() } }, { user: { phone: { contains: f.q } } }, { trackingCode: { contains: f.q } }] } : {}),
  };
  const rows = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { phone: true, fullName: true } }, _count: { select: { items: true } } } });
  return rows.map((o) => ({ ...o, total: Number(o.total), receiver: (o.shippingAddress as { fullName?: string } | null)?.fullName ?? '' }));
}

export async function getOrderAdmin(id: string) {
  const o = await prisma.order.findUnique({
    where: { id },
    include: { user: true, items: true, payments: { orderBy: { createdAt: 'desc' } }, statusHistory: { orderBy: { createdAt: 'desc' } } },
  });
  return o;
}

export async function changeOrderStatus(id: string, to: OrderStatus, opts: { trackingCode?: string; note?: string; adminId: string }) {
  const o = await prisma.order.findUnique({ where: { id }, include: { user: { select: { phone: true } } } });
  if (!o) return { ok: false as const, error: 'سفارش پیدا نشد.' };
  const c = checkTransition(o.status, to, { trackingCode: opts.trackingCode });
  if (!c.ok) return c;
  // به‌روزرسانی شرطی: اگر هم‌زمان کس دیگری وضعیت را عوض کرده باشد، تغییر اعمال نمی‌شود
  const res = await prisma.order.updateMany({ where: { id, status: o.status }, data: { status: to, ...(to === 'SHIPPED' ? { trackingCode: opts.trackingCode!.trim() } : {}) } });
  if (res.count === 0) return { ok: false as const, error: 'وضعیت سفارش هم‌زمان تغییر کرده است؛ صفحه را دوباره باز کنید.' };
  await prisma.orderStatusChange.create({ data: { orderId: id, from: o.status, to, note: opts.note || null, changedBy: opts.adminId } });
  return { ok: true as const, phone: o.user.phone, number: o.number, trackingCode: opts.trackingCode?.trim() };
}

/* ───────── محصولات ───────── */
export async function listProductsAdmin(f: { q?: string; category?: string }) {
  const rows = await prisma.product.findMany({
    where: {
      ...(f.category ? { category: { slug: f.category } } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q } }, { sku: { contains: f.q.toUpperCase() } }, { slug: { contains: f.q } }] } : {}),
    },
    include: { category: { select: { name: true, slug: true } } }, orderBy: [{ isActive: 'desc' }, { popularity: 'desc' }], take: 500,
  });
  return rows.map((p) => ({ ...p, retailPrice: Number(p.retailPrice) }));
}

export async function getProductAdmin(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: { category: true, tierPrices: { include: { tier: true } }, variants: { orderBy: { sort: 'asc' } } } });
  if (!p) return null;
  return {
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, category: p.category.slug, type: p.type, icon: p.icon ?? '', irc: p.irc ?? '',
    shortDescription: p.shortDescription ?? '', description: p.description, specs: (p.specs ?? {}) as Record<string, string>,
    wavelengthNm: p.wavelengthNm, retailPrice: Number(p.retailPrice), compareAtPrice: n(p.compareAtPrice), minPrice: n(p.minPrice),
    partnerMinQty: p.partnerMinQty, maxPartnerDiscountPercent: p.maxPartnerDiscountPercent, stock: p.stock, popularity: p.popularity, isActive: p.isActive,
    tierPrices: Object.fromEntries(p.tierPrices.map((t) => [t.tier.slug, Number(t.price)])),
    options: (Array.isArray(p.options) ? p.options : []) as unknown as ProductOption[],
    variants: p.variants.map((v): ProductVariant => ({ key: v.key, values: v.values, sku: v.sku, stock: v.stock, retailPrice: n(v.retailPrice), isActive: v.isActive })),
  };
}
export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getProductAdmin>>>;

export async function saveProduct(id: string | null, v: ProductInput): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }> {
  const category = await prisma.category.findUnique({ where: { slug: v.categorySlug } });
  if (!category) return { ok: false, errors: ['دسته‌بندی در پایگاه داده نیست (npm run db:seed را اجرا کنید).'] };
  const dup = await prisma.product.findFirst({ where: { OR: [{ slug: v.slug }, { sku: v.sku }], NOT: id ? { id } : undefined }, select: { slug: true, sku: true } });
  if (dup) return { ok: false, errors: [dup.slug === v.slug ? 'این نامک (slug) قبلاً برای محصول دیگری ثبت شده.' : 'این کد کالا (SKU) قبلاً ثبت شده.'] };
  if (v.variants.length) {
    const vdup = await prisma.productVariant.findFirst({ where: { sku: { in: v.variants.map((x) => x.sku) }, NOT: id ? { productId: id } : undefined }, select: { sku: true } });
    if (vdup) return { ok: false, errors: [`کد کالای تنوع ${vdup.sku} برای محصول دیگری ثبت شده است.`] };
  }
  const data = {
    name: v.name, slug: v.slug, sku: v.sku, type: v.type, categoryId: category.id, icon: v.icon, irc: v.irc,
    shortDescription: v.shortDescription || null, description: v.description, specs: v.specs, wavelengthNm: v.wavelengthNm,
    retailPrice: BigInt(v.retailPrice), compareAtPrice: v.compareAtPrice != null ? BigInt(v.compareAtPrice) : null,
    minPrice: v.minPrice != null ? BigInt(v.minPrice) : null, partnerMinQty: v.partnerMinQty, maxPartnerDiscountPercent: v.maxPartnerDiscountPercent,
    stock: v.stock, popularity: v.popularity, isActive: v.isActive,
    options: v.options.length ? (v.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
  };
  const tiers = await prisma.partnerTier.findMany({ select: { id: true, slug: true } });
  const saved = await prisma.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
    await tx.productTierPrice.deleteMany({ where: { productId: p.id } });
    const rows = Object.entries(v.tierPrices).map(([slug, price]) => ({ productId: p.id, tierId: tiers.find((t) => t.slug === slug)?.id, price: BigInt(price) }))
      .filter((r): r is { productId: string; tierId: string; price: bigint } => !!r.tierId);
    if (rows.length) await tx.productTierPrice.createMany({ data: rows });
    // تنوع‌ها: حذف ترکیب‌هایی که دیگر وجود ندارند، به‌روزرسانی/ایجاد بقیه (سفارش‌های قبلی برچسب خود را نگه می‌دارند)
    await tx.productVariant.deleteMany({ where: { productId: p.id, key: { notIn: v.variants.map((x) => x.key) } } });
    for (const [i, x] of v.variants.entries()) {
      const vd = { values: x.values, sku: x.sku, stock: x.stock, retailPrice: x.retailPrice != null ? BigInt(x.retailPrice) : null, isActive: x.isActive !== false, sort: i };
      await tx.productVariant.upsert({ where: { productId_key: { productId: p.id, key: x.key } }, update: vd, create: { productId: p.id, key: x.key, ...vd } });
    }
    return p;
  });
  return { ok: true, id: saved.id };
}

export async function setProductActive(id: string, isActive: boolean) {
  await prisma.product.update({ where: { id }, data: { isActive } });
}

/* ───────── عکس محصولات ───────── */
export async function listProductImages(productId: string) {
  return prisma.productImage.findMany({ where: { productId }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] });
}
export async function countProductImages(productId: string) { return prisma.productImage.count({ where: { productId } }); }
export async function productExists(id: string) { return !!(await prisma.product.findUnique({ where: { id }, select: { id: true } })); }

export async function addProductImage(i: { productId: string; key: string; alt: string; width: number; height: number }) {
  const last = await prisma.productImage.aggregate({ _max: { sort: true }, where: { productId: i.productId } });
  return prisma.productImage.create({ data: { ...i, sort: (last._max.sort ?? -1) + 1 } });
}

export async function updateProductImage(id: string, d: { alt?: string; optionValue?: string | null }) {
  return prisma.productImage.update({ where: { id }, data: d });
}

export async function deleteProductImage(id: string): Promise<string | null> {
  const img = await prisma.productImage.findUnique({ where: { id } });
  if (!img) return null;
  await prisma.productImage.delete({ where: { id } });
  return img.key;
}

/** مرتب‌سازی: فقط شناسه‌های متعلق به همین محصول پذیرفته می‌شوند */
export async function reorderProductImages(productId: string, ids: string[]) {
  const own = new Set((await listProductImages(productId)).map((x) => x.id));
  const valid = ids.filter((id) => own.has(id));
  await prisma.$transaction(valid.map((id, i) => prisma.productImage.update({ where: { id }, data: { sort: i } })));
}
