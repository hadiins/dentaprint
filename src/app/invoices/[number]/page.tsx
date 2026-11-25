import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { getInvoiceView } from '@/lib/invoice/issue';
import InvoiceSheet from '@/components/invoice/InvoiceSheet';
import PrintButton from '@/components/invoice/PrintButton';

export const metadata: Metadata = { title: 'فاکتور', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
type P = Promise<{ number: string }>;

export default async function InvoicePage({ params }: { params: P }) {
  const { number } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/invoices/${encodeURIComponent(number)}`);
  const inv = await getInvoiceView(decodeURIComponent(number));
  // فقط صاحب سفارش یا مدیر؛ برای دیگران همان ۴۰۴
  if (!inv || !(user.role === 'ADMIN' || inv.ownerPhone === user.phone)) notFound();
  return (
    <main className="page inv-page"><div className="wrap">
      <div className="inv-toolbar no-print">
        <Link href={user.role === 'ADMIN' ? '/admin/orders' : '/account'} className="link">→ بازگشت</Link>
        <PrintButton />
      </div>
      <p className="no-print" style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
        برای PDF: «چاپ» ← مقصد «Save as PDF / ذخیره به‌صورت PDF»، اندازهٔ A4، حاشیه پیش‌فرض و گزینهٔ «Background graphics» روشن.
      </p>
      <InvoiceSheet inv={inv} />
    </div></main>
  );
}
