import { timingSafeEqual } from 'node:crypto';
import { getCurrentUser } from '../auth/server';

/**
 * دسترسی مدیر:
 *  ۱) کاربر واردشده با نقش ADMIN (شماره‌های ADMIN_PHONES هنگام ورود مدیر می‌شوند)
 *  ۲) یا توکن موقت ADMIN_TOKEN در هدر x-admin-token (برای اسکریپت‌ها)
 */
export async function isAdmin(req: Request): Promise<boolean> {
  const user = await getCurrentUser();
  if (user?.role === 'ADMIN') return true;
  const expected = process.env.ADMIN_TOKEN;
  const got = req.headers.get('x-admin-token');
  if (!expected || expected.length < 16 || !got) return false;
  const a = Buffer.from(expected), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** برای صفحات و Server Actionهای پنل: کاربر مدیر یا هدایت به ورود */
export async function requireAdmin() {
  const { redirect } = await import('next/navigation');
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') redirect('/login?next=/admin');
  return user!;
}
