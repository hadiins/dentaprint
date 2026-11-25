import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllProducts } from '@/lib/catalog';
import { getDefaultGateway, getEnabledGateways } from '@/lib/payments';
import { getCurrentUser } from '@/lib/auth/server';
import CheckoutClient from '@/components/checkout/CheckoutClient';

export const metadata: Metadata = { title: 'سبد خرید و پرداخت', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const products = await getAllProducts();
  const gateways = getEnabledGateways().map((g) => ({ id: g.id, label: g.label }));
  return (
    <main className="page"><div className="wrap">
      <span className="eyebrow">تکمیل خرید</span>
      <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', marginBottom: 24 }}>سبد خرید و پرداخت</h1>
      {user
        ? <CheckoutClient products={products} gateways={gateways} defaultGateway={getDefaultGateway()?.id} defaults={{ fullName: user.fullName ?? user.partner?.orgName ?? '', phone: user.phone }} />
        : <div className="bform" style={{ position: 'static', maxWidth: 520 }}>
            <h3>برای ادامهٔ خرید وارد شوید</h3>
            <p>فقط با شمارهٔ موبایل و کد پیامکی؛ سبد خرید شما حفظ می‌شود.</p>
            <Link href="/login?next=/checkout" className="btn btn-main" style={{ justifyContent: 'center' }}>ورود / ثبت‌نام <span className="arr">←</span></Link>
          </div>}
    </div></main>
  );
}
