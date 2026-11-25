export type ThemeId = 'auto' | 'teal' | 'light' | 'violet' | 'sunset' | 'arctic';

export const THEMES: { id: ThemeId; name: string; desc: string; swatch: string; meta?: string }[] = [
  { id: 'auto', name: 'خودکار', desc: 'مطابق تنظیمات دستگاه', swatch: 'linear-gradient(135deg,#060d14 50%,#f3f6f9 50%)' },
  { id: 'teal', name: 'شب فیروزه‌ای', desc: 'تیره · پیش‌فرض', swatch: 'linear-gradient(135deg,#2ee6d6,#8b7bff,#ffb35c)', meta: '#060d14' },
  { id: 'light', name: 'روشن کلینیکی', desc: 'روشن · تمیز و پزشکی', swatch: 'linear-gradient(135deg,#ffffff,#0aa89b)', meta: '#f3f6f9' },
  { id: 'violet', name: 'بنفش نئونی', desc: 'تیره · جسور و مدرن', swatch: 'linear-gradient(135deg,#c084fc,#f472b6,#60a5fa)', meta: '#0a0716' },
  { id: 'sunset', name: 'غروب کهربایی', desc: 'تیره · گرم و لوکس', swatch: 'linear-gradient(135deg,#ffb35c,#ff6b6b,#ffd93d)', meta: '#120a06' },
  { id: 'arctic', name: 'آبی قطبی', desc: 'روشن · آرام و حرفه‌ای', swatch: 'linear-gradient(135deg,#eef4fb,#0284c7,#4f46e5)', meta: '#eef4fb' },
];

/** تم پیش‌فرض سایت (بعداً از پنل مدیریت قابل تغییر) */
export const DEFAULT_THEME: ThemeId = 'auto';
export const THEME_KEY = 'dp_theme';

/** اسکریپتی که قبل از نمایش صفحه اجرا می‌شود تا رنگ‌ها پرش نکنند */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'${DEFAULT_THEME}';var r=t==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'teal'):t;document.documentElement.setAttribute('data-theme',r);}catch(e){}})();`;

export function resolveTheme(choice: ThemeId): Exclude<ThemeId, 'auto'> {
  if (choice !== 'auto') return choice;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'teal';
}
