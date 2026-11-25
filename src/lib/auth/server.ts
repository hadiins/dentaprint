/** ابزارهای ورود سمت سرور (کوکی، کاربر جاری، IP) */
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import type { AuthRepo, AuthUser, Viewer } from './types';
export type { Viewer } from './types';
import { MemoryAuthRepo, parseDemoPartners } from './memory-repo';
import { SESSION_COOKIE, SESSION_DAYS, hashToken } from './session';

const g = globalThis as unknown as { __dpAuthRepo?: MemoryAuthRepo };

export async function getAuthRepo(): Promise<AuthRepo> {
  if (process.env.DATABASE_URL) {
    const [{ prisma }, { createPrismaAuthRepo }] = await Promise.all([import('../prisma'), import('./prisma-repo')]);
    return createPrismaAuthRepo(prisma);
  }
  return (g.__dpAuthRepo ??= new MemoryAuthRepo(parseDemoPartners(process.env.DEMO_PARTNERS)));
}

export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET (حداقل ۳۲ کاراکتر) در production الزامی است');
  return 'dev-only-insecure-secret-change-me-please';
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
}

/** کاربر واردشده (یک‌بار در هر درخواست) */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return (await getAuthRepo()).getSessionUser(hashToken(token), Date.now());
});

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) await (await getAuthRepo()).deleteSession(hashToken(token));
  c.delete(SESSION_COOKIE);
}

export async function getViewer(): Promise<Viewer> {
  const u = await getCurrentUser();
  if (!u) return { loggedIn: false, name: null, phone: null, isAdmin: false, partnerTier: null, partnerStatus: null };
  return {
    loggedIn: true, name: u.fullName, phone: u.phone, isAdmin: u.role === 'ADMIN',
    partnerTier: u.partner?.status === 'APPROVED' ? u.partner.tierSlug : null, partnerStatus: u.partner?.status ?? null,
  };
}
