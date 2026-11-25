/** نقطهٔ ورود سمت سرور: انتخاب ذخیره‌ساز بر اساس وجود پایگاه داده */
import type { CommerceRepo } from './repo';
import { MemoryRepo } from './memory-repo';

const g = globalThis as unknown as { __dpMemoryRepo?: MemoryRepo };

export async function getRepo(): Promise<CommerceRepo> {
  if (process.env.DATABASE_URL) {
    const [{ prisma }, { createPrismaRepo }] = await Promise.all([import('../prisma'), import('./prisma-repo')]);
    return createPrismaRepo(prisma);
  }
  return (g.__dpMemoryRepo ??= new MemoryRepo());
}

export { getEnabledGateways, getGateway, getDefaultGateway } from './registry';
export { startPayment, handleCallback } from './service';
