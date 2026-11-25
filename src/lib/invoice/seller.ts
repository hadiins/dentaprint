/** اطلاعات فروشنده برای فاکتور — پایگاه داده (Setting: seller) یا config/seller.json */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DEFAULT_SELLER, validateSeller, type SellerInfo } from './build';

const FILE = path.join(process.cwd(), 'config', 'seller.json');

export async function getSeller(): Promise<SellerInfo> {
  if (process.env.DATABASE_URL) {
    const { prisma } = await import('../prisma');
    const row = await prisma.setting.findUnique({ where: { key: 'seller' } });
    if (row) return { ...DEFAULT_SELLER, ...(row.value as Partial<SellerInfo>) };
  }
  try { return { ...DEFAULT_SELLER, ...JSON.parse(await fs.readFile(FILE, 'utf8')) }; } catch { return DEFAULT_SELLER; }
}

export async function saveSeller(s: SellerInfo): Promise<string[]> {
  const errors = validateSeller(s);
  if (errors.length) return errors;
  if (process.env.DATABASE_URL) {
    const { prisma } = await import('../prisma');
    const value = JSON.parse(JSON.stringify(s));
    await prisma.setting.upsert({ where: { key: 'seller' }, update: { value }, create: { key: 'seller', value } });
  } else {
    await fs.writeFile(FILE, JSON.stringify(s, null, 2) + '\n', 'utf8');
  }
  return [];
}
