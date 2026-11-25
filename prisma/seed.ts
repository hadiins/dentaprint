/** پر کردن پایگاه داده با سطوح همکاری، دسته‌ها و محصولات نمونه:  npm run db:seed */
import { PrismaClient } from '@prisma/client';
import { CATEGORIES, PRODUCTS } from '../src/lib/catalog';
import { readFileSync } from 'node:fs';
import { validateCommerceSettings } from '../src/lib/commerce-config';

const parsed = validateCommerceSettings(JSON.parse(readFileSync('config/commerce.json', 'utf8')));
if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
const { tiers: TIERS, quantityBreaks: QUANTITY_BREAKS, shipping, evaluationWindowDays, autoDowngrade } = parsed.value;

const prisma = new PrismaClient();

async function main() {
  for (const t of TIERS) {
    await prisma.partnerTier.upsert({
      where: { slug: t.id },
      update: {},
      create: { slug: t.id, name: t.name, icon: t.icon, rank: t.rank, discountPercent: t.discountPercent,
        minSpend: BigInt(t.minSpend), requiresDocuments: t.requiresDocuments, freeShipping: t.freeShipping, isActive: t.isActive },
    });
  }
  await prisma.setting.upsert({ where: { key: 'commerce' }, update: {}, create: { key: 'commerce', value: { shipping, evaluationWindowDays, autoDowngrade } } });
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { slug: c.slug, name: c.name, icon: c.icon, group: c.group, sort: i } });
  }
  if ((await prisma.quantityBreak.count({ where: { productId: null } })) === 0) {
    await prisma.quantityBreak.createMany({ data: QUANTITY_BREAKS.map((b) => ({ minQty: b.minQty, extraDiscountPercent: b.extraDiscountPercent })) });
  }
  for (const p of PRODUCTS) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug, sku: p.sku, name: p.name, type: p.type, icon: p.icon, irc: p.irc ?? null, categoryId: category.id,
        shortDescription: p.short, description: p.description, specs: p.specs,
        wavelengthNm: p.wavelength ? parseInt(p.wavelength, 10) : null,
        retailPrice: BigInt(p.retailPrice), compareAtPrice: p.compareAtPrice ? BigInt(p.compareAtPrice) : null,
        minPrice: p.minPrice ? BigInt(p.minPrice) : null, partnerMinQty: p.partnerMinQty,
        maxPartnerDiscountPercent: p.maxPartnerDiscountPercent ?? null,
        stock: p.variants?.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.inStock ? 20 : 0, popularity: p.popularity,
        ...(p.options?.length ? { options: p.options as unknown as object } : {}),
      },
    });
    for (const [i, v] of (p.variants ?? []).entries()) {
      await prisma.productVariant.upsert({
        where: { productId_key: { productId: product.id, key: v.key } },
        update: {},
        create: { productId: product.id, key: v.key, values: v.values, sku: v.sku, stock: v.stock, retailPrice: v.retailPrice ? BigInt(v.retailPrice) : null, isActive: v.isActive !== false, sort: i },
      });
    }
    for (const [tierSlug, price] of Object.entries(p.tierPrices ?? {})) {
      const tier = await prisma.partnerTier.findUniqueOrThrow({ where: { slug: tierSlug } });
      await prisma.productTierPrice.upsert({
        where: { productId_tierId: { productId: product.id, tierId: tier.id } },
        update: { price: BigInt(price) },
        create: { productId: product.id, tierId: tier.id, price: BigInt(price) },
      });
    }
  }
  console.log('✓ داده‌های اولیه وارد شد');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
