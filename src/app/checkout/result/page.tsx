import type { Metadata } from 'next';
import Link from 'next/link';
import ClearCart from '@/components/checkout/ClearCart';

export const metadata: Metadata = { title: 'نتیجهٔ پرداخت', robots: { index: false } };
type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function ResultPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const status = one(sp.status), order = one(sp.order), ref = one(sp.ref), msg = one(sp.msg);
  const ok = status === 'success';
  return (
    <main className="page"><div className="wrap" style={{ maxWidth: 640, textAlign: 'center' }}>
      {ok && <ClearCart />}
      <div style={{ fontSize: 90 }}>{ok ? '✅' : status === 'cancelled' ? '↩️' : '⚠️'}</div>
      <h1 style={{ fontSize: 36, margin: '10px 0' }}>{ok ? 'پرداخت با موفقیت انجام شد' : status === 'cancelled' ? 'پرداخت لغو شد' : 'پرداخت ناموفق بود'}</h1>
      {order && <p>شمارهٔ سفارش: <b>{order}</b></p>}
      {ok && ref && <p>کد پیگیری پرداخت: <b dir="ltr">{ref}</b></p>}
      {ok && order && <p style={{ marginTop: 8 }}><a href={`/invoices/${order}`} target="_blank" rel="noopener" className="link">🧾 مشاهده و چاپ فاکتور</a></p>}
      {!ok && <p style={{ color: 'var(--muted)', marginTop: 8 }}>{msg || 'هیچ مبلغی از حساب شما کسر نشده است؛ اگر کسر شده باشد، حداکثر ظرف ۷۲ ساعت توسط بانک برمی‌گردد.'}</p>}
      <div className="cta" style={{ justifyContent: 'center', marginTop: 28 }}>
        {ok ? <Link href="/products" className="btn btn-main">ادامهٔ خرید <span className="arr">←</span></Link>
            : <Link href="/checkout" className="btn btn-main">تلاش دوباره <span className="arr">←</span></Link>}
      </div>
    </div></main>
  );
}
