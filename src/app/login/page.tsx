import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import LoginForm from '@/components/account/LoginForm';

export const metadata: Metadata = { title: 'ورود / ثبت‌نام', robots: { index: false } };
type SP = Promise<{ next?: string | string[] }>;

/** فقط مسیرهای داخلی سایت (جلوگیری از هدایت به سایت خارجی) */
const safeNext = (v?: string | string[]) => { const n = Array.isArray(v) ? v[0] : v; return n && n.startsWith('/') && !n.startsWith('//') ? n : '/account'; };

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <main className="page"><div className="wrap" style={{ maxWidth: 480 }}>
      <LoginForm next={next} />
    </div></main>
  );
}
