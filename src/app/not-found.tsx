import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page"><div className="wrap" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 90 }}>🦷</div>
      <h1 style={{ fontSize: 40 }}>صفحه پیدا نشد</h1>
      <p style={{ color: 'var(--muted)', margin: '10px 0 26px' }}>شاید این صفحه حذف شده یا آدرس اشتباه است.</p>
      <Link href="/products" className="btn btn-main">رفتن به فروشگاه <span className="arr">←</span></Link>
    </div></main>
  );
}
