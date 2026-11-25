/** عدد صحیح به حروف فارسی (تا ۹۹۹ تریلیون) — برای «مبلغ به حروف» فاکتور */
const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function under1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100, parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (r >= 10 && r < 20) parts.push(TEENS[r - 10]);
  else { const t = Math.floor(r / 10), o = r % 10; if (t) parts.push(TENS[t]); if (o) parts.push(ONES[o]); }
  return parts.join(' و ');
}

export function numberToWords(n: number): string {
  if (!Number.isSafeInteger(n)) throw new RangeError('عدد نامعتبر');
  if (n === 0) return 'صفر';
  if (n < 0) return `منفی ${numberToWords(-n)}`;
  const groups: string[] = [];
  let i = 0;
  while (n > 0) {
    const g = n % 1000;
    if (g) groups.unshift(i === 1 && g === 1 ? 'یک هزار' : `${under1000(g)}${SCALES[i] ? ` ${SCALES[i]}` : ''}`);
    n = Math.floor(n / 1000); i++;
    if (i >= SCALES.length && n > 0) throw new RangeError('عدد بزرگ‌تر از حد پشتیبانی');
  }
  return groups.join(' و ');
}
