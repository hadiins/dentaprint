import { createHash, randomBytes } from 'node:crypto';
import type { AuthRepo, AuthUser } from './types.ts';

export const SESSION_COOKIE = 'dp_session';
export const SESSION_DAYS = 30;

export const newSessionToken = () => randomBytes(32).toString('base64url');
/** در پایگاه داده فقط هش توکن ذخیره می‌شود؛ نشت پایگاه داده = نشت نشست نیست */
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export async function createLogin(a: {
  repo: AuthRepo; phone: string; ip: string | null; userAgent: string | null; adminPhones?: string[]; now?: number;
}): Promise<{ token: string; user: AuthUser; expiresAt: number }> {
  const now = a.now ?? Date.now();
  const user = await a.repo.findOrCreateUser(a.phone, { makeAdmin: a.adminPhones?.includes(a.phone) });
  const token = newSessionToken();
  const expiresAt = now + SESSION_DAYS * 86_400_000;
  await a.repo.createSession({ tokenHash: hashToken(token), userId: user.id, expiresAt, ip: a.ip, userAgent: a.userAgent?.slice(0, 300) ?? null });
  return { token, user, expiresAt };
}

export const parseAdminPhones = (v?: string) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
