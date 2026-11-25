'use client';
import Link from 'next/link';
import { useState } from 'react';

const F: Record<string, { e: string; r: string; l: string[]; slug: string }> = {
  'مدل ارتودنسی': { e: '🧪', r: 'رزین مدل بژ دقت بالا', slug: 'model-resin-beige-1l', l: ['انقباض بسیار کم', 'ضخامت لایه ۵۰ میکرون', 'مناسب ترموفرمینگ الاینر'] },
  'گاید جراحی': { e: '💉', r: 'رزین گاید جراحی شفاف', slug: 'surgical-guide-resin-500g', l: ['زیست‌سازگار', 'قابل استریل طبق دستور سازنده', 'شفافیت بالا برای دید بهتر'] },
  'روکش موقت': { e: '🦷', r: 'رزین C&B رنگ A2', slug: 'temporary-crown-resin-a2', l: ['استحکام خمشی بالا', 'رنگ طبیعی', 'کیورینگ نیتروژنی پیشنهادی'] },
  'ریخته‌گری': { e: '🔥', r: 'رزین ریختگی بدون خاکستر', slug: 'castable-resin-500g', l: ['باقی‌ماندهٔ خاکستر کمتر از ۰٫۱٪', 'مناسب فریم پارسیل', 'سوختن تمیز'] },
  'دنچر': { e: '💗', r: 'رزین بیس دنچر صورتی', slug: 'denture-base-resin-pink', l: ['رنگ طبیعی لثه', 'مقاومت به ضربه', 'سازگار با دندان‌های چاپی'] },
  'ماسک لثه': { e: '🩷', r: 'رزین ماسک لثه انعطاف‌پذیر', slug: 'gingiva-mask-resin-250g', l: ['Shore A 70', 'شبیه‌سازی بافت نرم', 'مناسب مدل ایمپلنت'] },
};

export default function ResinFinder() {
  const keys = Object.keys(F);
  const [k, setK] = useState(keys[0]);
  const x = F[k];
  return (
    <section id="finder" style={{ paddingTop: 0 }}><div className="wrap">
      <div className="finder rv">
        <div>
          <span className="eyebrow">رزین‌یاب هوشمند</span>
          <h2>می‌خواهید<br />چه چیزی چاپ کنید؟</h2>
          <p style={{ color: 'var(--muted)', marginTop: 10 }}>کاربرد را انتخاب کنید تا رزین مناسب را پیشنهاد کنیم.</p>
          <div className="opts">{keys.map((o) => <button key={o} className={`opt${o === k ? ' on' : ''}`} onClick={() => setK(o)}>{o}</button>)}</div>
        </div>
        <div className="result" aria-live="polite">
          <span className="big">{x.e}</span>
          <small style={{ color: 'var(--c1)' }}>پیشنهاد ما</small>
          <h3>{x.r}</h3>
          <ul>{x.l.map((i) => <li key={i}>{i}</li>)}</ul>
          <Link href={`/products/${x.slug}`} className="btn btn-main" style={{ alignSelf: 'flex-start', marginTop: 10 }}>مشاهدهٔ محصول <span className="arr">←</span></Link>
        </div>
      </div>
    </div></section>
  );
}
