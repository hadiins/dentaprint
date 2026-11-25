/** بررسی سلامت برای پلتفرم‌های میزبانی و مانیتورینگ:  GET /api/health */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let db: 'ok' | 'skipped' | 'error' = 'skipped';
  if (process.env.DATABASE_URL) {
    try { const { prisma } = await import('@/lib/prisma'); await prisma.$queryRaw`SELECT 1`; db = 'ok'; } catch { db = 'error'; }
  }
  return NextResponse.json({ ok: db !== 'error', db, time: new Date().toISOString() }, { status: db === 'error' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
