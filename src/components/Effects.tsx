'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** افکت‌های سراسری: ظاهر شدن با اسکرول، شمارنده‌ها، نور کاشی‌ها و نور دنبال‌کنندهٔ ماوس */
export default function Effects() {
  const pathname = usePathname();
  useEffect(() => {
    const fa = (n: number) => n.toLocaleString('fa-IR');
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target as HTMLElement;
      el.classList.add('in');
      const b = el.querySelector<HTMLElement>('[data-to]');
      if (b) {
        const to = Number(b.dataset.to), suffix = b.dataset.suffix ?? '+', s = performance.now();
        const step = (n: number) => { const p = Math.min((n - s) / 1400, 1); b.textContent = fa(Math.round(to * (1 - Math.pow(1 - p, 3)))) + suffix; if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
      io.unobserve(el);
    }), { threshold: 0.15 });
    document.querySelectorAll<HTMLElement>('.rv:not(.in)').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });

    const tiles = Array.from(document.querySelectorAll<HTMLElement>('.tile'));
    const onTile = (e: MouseEvent) => { const t = e.currentTarget as HTMLElement, r = t.getBoundingClientRect(); t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`); };
    tiles.forEach((t) => t.addEventListener('mousemove', onTile));

    const glow = document.getElementById('glow');
    const fine = window.matchMedia('(pointer:fine)').matches;
    const onMove = (e: MouseEvent) => { if (glow) { glow.style.left = `${e.clientX}px`; glow.style.top = `${e.clientY}px`; } };
    if (fine) window.addEventListener('mousemove', onMove, { passive: true }); else if (glow) glow.style.display = 'none';

    return () => { io.disconnect(); tiles.forEach((t) => t.removeEventListener('mousemove', onTile)); window.removeEventListener('mousemove', onMove); };
  }, [pathname]);
  return null;
}
