import { notFound } from 'next/navigation';
import { getGateway } from '@/lib/payments';
import { siteUrl } from '@/lib/server/site';
import { toman } from '@/lib/format';

export const dynamic = 'force-dynamic';
type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** صفحهٔ درگاه آزمایشی — فقط وقتی درگاه mock فعال است */
export default async function MockPay({ searchParams }: { searchParams: SP }) {
  if (!getGateway('mock')) notFound();
  const sp = await searchParams;
  const token = one(sp.token), cb = one(sp.cb), amount = Number(one(sp.amount)), order = one(sp.order);
  // جلوگیری از هدایت به آدرس خارجی
  if (!cb.startsWith(`${siteUrl()}/api/payments/callback/`) || !token) notFound();
  const link = (status: string) => `${cb}?${new URLSearchParams({ token, status })}`;
  return (
    <main className="page"><div className="wrap" style={{ maxWidth: 520 }}>
      <div className="bform" style={{ position: 'static', textAlign: 'center' }}>
        <span className="tag">درگاه آزمایشی — بدون پرداخت واقعی</span>
        <h3 style={{ marginTop: 10 }}>پرداخت سفارش {order}</h3>
        <div style={{ fontSize: 30, fontWeight: 900 }}>{toman(amount)}</div>
        <a href={link('OK')} className="btn btn-main" style={{ justifyContent: 'center' }}>شبیه‌سازی پرداخت موفق</a>
        <a href={link('NOK')} className="btn btn-glass" style={{ justifyContent: 'center' }}>انصراف از پرداخت</a>
      </div>
    </div></main>
  );
}
