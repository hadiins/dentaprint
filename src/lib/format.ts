export const fa = (n: number) => n.toLocaleString('fa-IR');
export const toman = (n: number) => `${fa(n)} تومان`;

/** تبدیل ارقام فارسی/عربی به انگلیسی و حذف فاصله */
export function toEnDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s|-/g, '');
}

export function normalizeIranMobile(raw: string): string | null {
  let p = toEnDigits(raw);
  if (p.startsWith('+98')) p = '0' + p.slice(3);
  else if (p.startsWith('0098')) p = '0' + p.slice(4);
  else if (p.startsWith('98') && p.length === 12) p = '0' + p.slice(2);
  return /^09\d{9}$/.test(p) ? p : null;
}
