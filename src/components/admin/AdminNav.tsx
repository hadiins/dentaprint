'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/admin', '📊 داشبورد'], ['/admin/orders', '📦 سفارش‌ها'], ['/admin/partners', '🤝 همکاران'],
  ['/admin/products', '🧪 محصولات'], ['/admin/settings', '⚙️ سطوح و قیمت'], ['/admin/seller', '🧾 فاکتور'],
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="منوی مدیریت">
      {LINKS.map(([href, label]) => {
        const on = href === '/admin' ? path === '/admin' : path.startsWith(href);
        return <Link key={href} href={href} className={on ? 'on' : ''}>{label}</Link>;
      })}
    </nav>
  );
}
