'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThemePicker from './ThemePicker';
import { useCart, useViewer } from './Providers';
import { fa } from '@/lib/format';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const viewer = useViewer();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <Link href="/" className="logo"><span className="dot">✦</span>دنتاپرینت</Link>
      <div className="links">
        <Link href="/products">فروشگاه</Link>
        <Link href="/#cats">دسته‌بندی‌ها</Link>
        <Link href="/#b2b">همکاری و عمده</Link>
        <Link href="/#finder">رزین‌یاب</Link>
        <Link href="/#contact">تماس</Link>
      </div>
      <div className="nav-act">
        <ThemePicker />
        <Link href="/products" className="icon-btn" aria-label="جستجو"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg></Link>
        <Link href="/checkout" className="icon-btn" aria-label={`سبد خرید، ${fa(count)} کالا`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
          <span className="cnt">{fa(count)}</span>
        </Link>
        {viewer.isAdmin && <Link href="/admin/settings" className="icon-btn" aria-label="پنل مدیریت" title="پنل مدیریت">⚙️</Link>}
        {viewer.loggedIn
          ? <Link href="/account" className="btn btn-main" style={{ padding: '9px 20px' }}>{viewer.partnerTier ? '🤝 ' : ''}{viewer.name?.split(' ')[0] || 'حساب من'}</Link>
          : <Link href="/login" className="btn btn-main" style={{ padding: '9px 20px' }}>ورود / ثبت‌نام</Link>}
      </div>
    </nav>
  );
}
