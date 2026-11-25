'use client';
import { useEffect, useRef } from 'react';

const TOOTH = 'M100 30c-16-14-40-18-58-8C20 34 18 62 26 90c6 22 9 44 12 70 3 26 10 46 22 46 10 0 15-18 19-40 4-20 9-32 21-32s17 12 21 32c4 22 9 40 19 40 12 0 19-20 22-46 3-26 6-48 12-70 8-28 6-56-16-68-18-10-42-6-58 8z';

/** انیمیشن چاپ لایه‌ای دندان + شمارندهٔ لایه هم‌گام با انیمیشن CSS (۵٫۵ ثانیه) */
export default function PrintScene() {
  const counter = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) % 5500) / 5500, l = Math.round(Math.min(t / 0.7, 1) * 420);
      if (counter.current) counter.current.textContent = `LAYER ${String(l).padStart(3, '0')} / 420 · 405nm`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="scene rv" aria-hidden>
      <div className="plate">
        <svg className="tooth" viewBox="0 0 200 220">
          <defs>
            <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--c1)' }} /><stop offset=".6" style={{ stopColor: 'var(--c2)' }} /><stop offset="1" style={{ stopColor: 'var(--c3)' }} />
            </linearGradient>
            <pattern id="layers" width="200" height="6" patternUnits="userSpaceOnUse"><rect width="200" height="4.6" fill="url(#tg)" /></pattern>
          </defs>
          <path className="outline" d={TOOTH} fill="none" strokeWidth="1.5" strokeDasharray="4 4" />
          <path className="fill" d={TOOTH} fill="url(#layers)" />
        </svg>
        <div className="laser" />
        <div className="layer-count" ref={counter}>LAYER 000 / 420 · 405nm</div>
      </div>
      <div className="chip c1"><small>دقت چاپ</small><b className="g">۲۲ میکرون</b></div>
      <div className="chip c2"><small>زمان چاپ مدل فک</small><b>۲۸ دقیقه ⚡</b></div>
      <div className="chip c3"><small>زیست‌سازگار</small><b>✓ کلاس IIa</b></div>
    </div>
  );
}
