import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/server/admin-auth';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: { default: 'پنل مدیریت', template: '%s | پنل مدیریت دنتاپرینت' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <main className="page"><div className="wrap">
      <div className="admin-top">
        <div><span className="eyebrow">پنل مدیریت</span><p style={{ color: 'var(--muted)', fontSize: 13 }}>{admin.fullName ?? admin.phone}</p></div>
        <AdminNav />
      </div>
      {children}
    </div></main>
  );
}
