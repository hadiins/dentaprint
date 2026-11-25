import Link from 'next/link';
import PrintScene from './PrintScene';

export function Hero() {
  return (
    <header className="hero">
      <div className="wrap">
        <div className="rv">
          <span className="pill"><b>جدید</b> رزین‌های کلینیکی نسل جدید رسید ←</span>
          <h1>آیندهٔ دندانسازی<br /><span className="gt">لایه به لایه</span> چاپ می‌شود</h1>
          <p className="lead">رزین‌های چاپگر سه‌بعدی، دندان مصنوعی و مواد پروتز، کامپوزیت و مواد پرکردن، و تجهیزات لابراتوار و کلینیک؛ با ضمانت اصالت و پشتیبانی فنی واقعی. برای خرید شخصی و همکاری عمده.</p>
          <div className="cta">
            <Link href="/products" className="btn btn-main">شروع خرید <span className="arr">←</span></Link>
            <Link href="/#b2b" className="btn btn-glass">درخواست حساب همکاری</Link>
          </div>
          <div className="proof">
            <div className="avatars"><span style={{ background: 'var(--c1)' }}>🦷</span><span style={{ background: 'var(--c2)' }}>🔬</span><span style={{ background: 'var(--c3)' }}>🧪</span></div>
            <div><b>+۸۵۰ لابراتوار و کلینیک</b><br />به دنتاپرینت اعتماد کرده‌اند</div>
          </div>
        </div>
        <PrintScene />
      </div>
    </header>
  );
}

const WORDS = ['رزین مدل', 'گاید جراحی', 'دندان مصنوعی', 'آکریل حرارتی', 'کامپوزیت نانوهیبرید', 'باندینگ یونیورسال', 'لایت کیور LED', 'پرینتر LCD 8K', 'کورهٔ پرسلن', 'گلاس آینومر', 'فروش عمده به همکاران'];
export function Marquee() {
  return (
    <div className="marquee" aria-hidden>
      <div className="track">{[...WORDS, ...WORDS].map((w, i) => <span key={i}>{w}</span>)}</div>
    </div>
  );
}

export function Bento() {
  return (
    <section id="cats"><div className="wrap">
      <div className="head rv">
        <div><span className="eyebrow">دسته‌بندی‌ها</span><h2>هر چیزی که لابراتوار<br />و کلینیک شما لازم دارد</h2></div>
        <p>از رزین چاپگر و دندان مصنوعی تا کامپوزیت و لایت کیور؛ همه در یک‌جا.</p>
      </div>
      <div className="bento">
        <Link href="/products?group=print3d" className="tile t-big rv"><div><span className="tag">دندانسازی دیجیتال</span><h3 style={{ fontSize: 32, marginTop: 14 }}>چاپ سه‌بعدی<br />دندانی</h3><p>رزین مدل و کلینیکی، پرینتر LCD و DLP، شستشو و کیورینگ</p></div><span className="em">🖨️</span><span className="go">←</span></Link>
        <Link href="/products?group=prosthetics" className="tile t-v rv"><div><h3>پروتز و دندان مصنوعی</h3><p>دندان مصنوعی، آکریل، موم، کورهٔ پرسلن</p></div><span className="em">🦷</span><span className="go">←</span></Link>
        <Link href="/products?group=restorative" className="tile rv"><div><h3>ترمیمی و پرکردن</h3><p>کامپوزیت، باندینگ، لایت کیور</p></div><span className="em">✨</span><span className="go">←</span></Link>
        <Link href="/products?group=lab" className="tile t-wide t-o rv"><div><h3>لابراتوار و مواد مصرفی</h3><p>میکروموتور، اسکنر، الکل، فیلم nFEP و…</p></div><span className="em">⚙️</span><span className="go">←</span></Link>
      </div>
    </div></section>
  );
}

export function Workflow() {
  const steps = [
    ['اسکن', 'اسکنر داخل دهانی یا رومیزی؛ خروجی STL دقیق.'],
    ['طراحی', 'طراحی در نرم‌افزار CAD و آماده‌سازی ساپورت.'],
    ['چاپ', 'پرینتر دندانی + رزین مخصوص با پروفایل آماده.'],
    ['پس‌پردازش', 'شستشو با الکل ۹۹٪ و کیورینگ نهایی استاندارد.'],
  ];
  return (
    <section id="flow" style={{ paddingTop: 0 }}><div className="wrap">
      <div className="head rv">
        <div><span className="eyebrow">جریان کار دیجیتال</span><h2>از اسکن تا تحویل،<br />در چهار قدم</h2></div>
        <p>برای هر مرحله، ابزار و ماده‌اش را داریم؛ و اگر جایی گیر کردید، تیم فنی کنارتان است.</p>
      </div>
      <div className="flow">
        {steps.map(([t, d]) => <div className="step rv" key={t}><h3>{t}</h3><p>{d}</p><div className="bar"><i /></div></div>)}
      </div>
    </div></section>
  );
}

export function Stats() {
  const items: [number, string, string][] = [[850, '+', 'لابراتوار و کلینیک'], [120, '+', 'محصول تخصصی'], [98, '٪', 'رضایت مشتری'], [24, 'h', 'ساعت تا ارسال']];
  return (
    <section style={{ paddingTop: 0 }}><div className="wrap"><div className="stats">
      {items.map(([n, s, l]) => <div className="stat rv" key={l}><b data-to={n} data-suffix={s}>۰</b><span>{l}</span></div>)}
    </div></div></section>
  );
}

export function Testimonials() {
  const q = [
    ['«رزین مدل‌شان انقباض تقریباً صفر دارد. پروفایل چاپی که پشتیبانی داد از همان بار اول جواب داد.»', '🦷', 'لابراتوار نمونه', 'تهران · همکار نقره‌ای'],
    ['«پرینتر را نصب کردند و یک جلسه آموزش کامل دادند. گایدهای جراحی‌مان حالا در مطب چاپ می‌شود.»', '🔬', 'کلینیک ایمپلنت نمونه', 'اصفهان'],
    ['«با حساب همکاری، سفارش ماهانهٔ رزین را سریع تکرار می‌کنیم و با هر خرید به سطح بالاتر نزدیک‌تر می‌شویم.»', '🧪', 'لابراتوار نمونه', 'مشهد · همکار طلایی'],
  ];
  return (
    <section style={{ paddingTop: 0 }}><div className="wrap">
      <div className="head rv"><div><span className="eyebrow">نظر مشتریان</span><h2>آن‌هایی که با ما چاپ می‌کنند</h2></div></div>
      <div className="quotes">
        {q.map(([t, e, n, c]) => <div className="q rv" key={n + c}><div className="stars">★★★★★</div><p>{t}</p><div className="who"><span>{e}</span><div>{n}<small>{c}</small></div></div></div>)}
      </div>
    </div></section>
  );
}
