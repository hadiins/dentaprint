import Link from 'next/link';

export default function Footer() {
  return (
    <footer id="contact"><div className="wrap">
      <div className="fgrid">
        <div><Link href="/" className="logo" style={{ padding: 0, marginBottom: 12 }}><span className="dot">✦</span>دنتاپرینت</Link><p>تأمین‌کنندهٔ تخصصی رزین چاپ سه‌بعدی، مواد و تجهیزات پروتز، مواد ترمیمی و تجهیزات لابراتوار؛ فروش شخصی و همکاری.</p></div>
        <div><h5>فروشگاه</h5><ul><li><Link href="/products?group=print3d">چاپ سه‌بعدی</Link></li><li><Link href="/products?group=prosthetics">پروتز و دندان مصنوعی</Link></li><li><Link href="/products?group=restorative">ترمیمی و پرکردن</Link></li><li><Link href="/products?group=lab">لابراتوار و مصرفی</Link></li></ul></div>
        <div><h5>همکاران</h5><ul><li><Link href="/#b2b">درخواست همکاری</Link></li><li><Link href="/#b2b">سطوح همکاری</Link></li><li><Link href="/#b2b">ورود همکاران</Link></li></ul></div>
        <div><h5>تماس</h5><ul><li>۰۲۱-۰۰۰۰۰۰۰۰</li><li>info@example.com</li><li>تهران، خیابان نمونه</li></ul></div>
      </div>
      <div className="fbot"><span>© ۱۴۰۵ دنتاپرینت</span><span>جای نماد اعتماد الکترونیکی</span></div>
      <div className="mega" aria-hidden>DENTAPRINT</div>
    </div></footer>
  );
}
