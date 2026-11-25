'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_THEME, THEMES, THEME_KEY, resolveTheme, type ThemeId } from '@/lib/themes';
import { useToast } from './Providers';

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<ThemeId>(DEFAULT_THEME);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const apply = (c: ThemeId) => {
    const real = resolveTheme(c);
    document.documentElement.setAttribute('data-theme', real);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES.find((t) => t.id === real)?.meta ?? '#060d14');
  };

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as ThemeId | null) ?? DEFAULT_THEME;
    setChoice(saved); apply(saved);
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onSys = () => { if ((localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME) === 'auto') apply('auto'); };
    mq.addEventListener('change', onSys);
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey);
    return () => { mq.removeEventListener('change', onSys); document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const select = (id: ThemeId) => {
    setChoice(id); apply(id);
    try { localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
    toast(`تم «${THEMES.find((t) => t.id === id)?.name}» فعال شد`);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" aria-label="انتخاب تم" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16.5" cy="10.5" r="1" /></svg>
      </button>
      <div className={`theme-panel${open ? ' open' : ''}`} role="menu">
        <h6>انتخاب تم سایت</h6>
        {THEMES.map((t) => (
          <button key={t.id} role="menuitemradio" aria-checked={choice === t.id} className={`th${choice === t.id ? ' on' : ''}`} onClick={() => select(t.id)}>
            <span className="sw" style={{ background: t.swatch }} />
            <span>{t.name}<small>{t.desc}</small></span>
            <span className="ck">✓</span>
          </button>
        ))}
      </div>
    </div>
  );
}
