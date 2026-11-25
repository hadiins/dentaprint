/**
 * ارزیابی و ارتقای سطح همکاران (فقط با پایگاه داده)
 * - بعد از هر پرداخت موفق برای همان همکار اجرا می‌شود (ارتقای فوری)
 * - روزانه برای همه از طریق /api/cron/evaluate-tiers یا اسکریپت npm run tiers:evaluate
 */
import { nextTier, type VerificationLevel } from '../pricing';
import { activeTiers } from '../commerce-config';
import { getCommerceSettings } from '../settings';
import { PAID_STATUSES } from '../payments/repo';

export async function evaluatePartner(partnerId: string): Promise<{ changed: boolean; from?: string | null; to?: string | null }> {
  if (!process.env.DATABASE_URL) return { changed: false };
  const { prisma } = await import('../prisma');
  const settings = await getCommerceSettings();
  const tiers = activeTiers(settings);
  const p = await prisma.partnerProfile.findUnique({ where: { id: partnerId }, include: { tier: true } });
  if (!p || p.status !== 'APPROVED') return { changed: false };
  const since = new Date(Date.now() - settings.evaluationWindowDays * 86_400_000);
  const agg = await prisma.order.aggregate({ _sum: { subtotal: true }, where: { userId: p.userId, status: { in: PAID_STATUSES }, paidAt: { gte: since } } });
  const spend = Number(agg._sum.subtotal ?? 0);
  const current = tiers.find((t) => t.id === p.tier?.slug) ?? null;
  const target = nextTier(current, spend, p.verification as VerificationLevel, tiers, { locked: p.tierLocked, autoDowngrade: settings.autoDowngrade });
  if ((target?.id ?? null) === (current?.id ?? null)) return { changed: false };
  const row = target ? await prisma.partnerTier.findUnique({ where: { slug: target.id } }) : null;
  await prisma.$transaction([
    prisma.partnerProfile.update({ where: { id: p.id }, data: { tierId: row?.id ?? null } }),
    prisma.tierChange.create({ data: { partnerId: p.id, fromTierId: p.tierId, toTierId: row?.id ?? '', reason: 'AUTO_SPEND' } }),
  ]);
  return { changed: true, from: current?.id ?? null, to: target?.id ?? null };
}

export async function evaluatePartnerByPhone(phone: string) {
  if (!process.env.DATABASE_URL) return { changed: false };
  const { prisma } = await import('../prisma');
  const p = await prisma.partnerProfile.findFirst({ where: { user: { phone } }, select: { id: true } });
  return p ? evaluatePartner(p.id) : { changed: false };
}

export async function evaluateAllPartners(): Promise<{ checked: number; changed: number }> {
  if (!process.env.DATABASE_URL) return { checked: 0, changed: 0 };
  const { prisma } = await import('../prisma');
  const ids = await prisma.partnerProfile.findMany({ where: { status: 'APPROVED' }, select: { id: true } });
  let changed = 0;
  for (const { id } of ids) if ((await evaluatePartner(id)).changed) changed++;
  return { checked: ids.length, changed };
}
