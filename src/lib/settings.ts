/**
 * خواندن/ذخیرهٔ تنظیمات تجاری — فقط سمت سرور.
 * - اگر DATABASE_URL تنظیم شده باشد: از جداول PartnerTier، QuantityBreak و Setting
 * - در غیر این صورت: از فایل config/commerce.json (برای توسعه و سرورهای ساده)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import { validateCommerceSettings, type CommerceSettings } from './commerce-config';

const FILE = path.join(process.cwd(), 'config', 'commerce.json');
const SETTING_KEY = 'commerce';

async function loadFromFile(): Promise<CommerceSettings> {
  const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
  const v = validateCommerceSettings(raw);
  if (!v.ok) throw new Error('config/commerce.json نامعتبر است: ' + v.errors.join(' | '));
  return v.value;
}

async function loadFromDb(): Promise<CommerceSettings | null> {
  const { prisma } = await import('./prisma');
  const [tiers, breaks, setting] = await Promise.all([
    prisma.partnerTier.findMany({ orderBy: { rank: 'asc' } }),
    prisma.quantityBreak.findMany({ where: { productId: null }, orderBy: { minQty: 'asc' } }),
    prisma.setting.findUnique({ where: { key: SETTING_KEY } }),
  ]);
  if (tiers.length === 0) return null;
  const extra = (setting?.value ?? {}) as Partial<CommerceSettings>;
  const fallback = await loadFromFile();
  const v = validateCommerceSettings({
    tiers: tiers.map((t) => ({ id: t.slug, name: t.name, icon: t.icon ?? '⭐', rank: t.rank, discountPercent: t.discountPercent,
      minSpend: Number(t.minSpend), requiresDocuments: t.requiresDocuments, freeShipping: t.freeShipping, isActive: t.isActive })),
    quantityBreaks: breaks.map((b) => ({ minQty: b.minQty, extraDiscountPercent: b.extraDiscountPercent })),
    shipping: extra.shipping ?? fallback.shipping,
    evaluationWindowDays: extra.evaluationWindowDays ?? fallback.evaluationWindowDays,
    autoDowngrade: extra.autoDowngrade ?? fallback.autoDowngrade,
  });
  if (!v.ok) throw new Error('تنظیمات پایگاه داده نامعتبر است: ' + v.errors.join(' | '));
  return v.value;
}

/** یک‌بار در هر درخواست خوانده می‌شود */
export const getCommerceSettings = cache(async (): Promise<CommerceSettings> => {
  if (process.env.DATABASE_URL) return (await loadFromDb()) ?? loadFromFile();
  return loadFromFile();
});

/** ذخیرهٔ تنظیمات معتبرشده. سطوح حذف‌شده پاک نمی‌شوند، فقط غیرفعال می‌شوند (همکاران فعلی‌شان حفظ شوند). */
export async function saveCommerceSettings(s: CommerceSettings): Promise<void> {
  if (!process.env.DATABASE_URL) {
    await fs.writeFile(FILE, JSON.stringify(s, null, 2) + '\n', 'utf8');
    return;
  }
  const { prisma } = await import('./prisma');
  await prisma.$transaction(async (tx) => {
    const keep = s.tiers.map((t) => t.id);
    // برای جلوگیری از برخورد رتبه‌های unique هنگام جابه‌جایی، ابتدا رتبه‌ها موقتاً منفی می‌شوند
    const existing = await tx.partnerTier.findMany();
    for (const t of existing) await tx.partnerTier.update({ where: { id: t.id }, data: { rank: -1000 - t.rank } });
    for (const t of s.tiers) {
      const data = { name: t.name, icon: t.icon, rank: t.rank, discountPercent: t.discountPercent, minSpend: BigInt(t.minSpend),
        requiresDocuments: t.requiresDocuments, freeShipping: t.freeShipping, isActive: t.isActive };
      await tx.partnerTier.upsert({ where: { slug: t.id }, update: data, create: { slug: t.id, ...data } });
    }
    let parking = 1000;
    for (const t of existing.filter((x) => !keep.includes(x.slug))) {
      await tx.partnerTier.update({ where: { id: t.id }, data: { isActive: false, rank: parking++ } });
    }
    await tx.quantityBreak.deleteMany({ where: { productId: null } });
    if (s.quantityBreaks.length) await tx.quantityBreak.createMany({ data: s.quantityBreaks.map((b) => ({ minQty: b.minQty, extraDiscountPercent: b.extraDiscountPercent })) });
    const value = { shipping: s.shipping, evaluationWindowDays: s.evaluationWindowDays, autoDowngrade: s.autoDowngrade };
    await tx.setting.upsert({ where: { key: SETTING_KEY }, update: { value }, create: { key: SETTING_KEY, value } });
  });
}
