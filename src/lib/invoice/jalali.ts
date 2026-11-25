/** تبدیل میلادی به شمسی (الگوریتم استاندارد، بدون وابستگی) */
export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

/** تاریخ شمسی در منطقهٔ زمانی تهران */
export function jalaliParts(d: Date, timeZone = 'Asia/Tehran') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  const [jy, jm, jd] = toJalali(Number(p.year), Number(p.month), Number(p.day));
  return { jy, jm, jd, hh: p.hour === '24' ? '00' : p.hour, mm: p.minute };
}

const FA = '۰۱۲۳۴۵۶۷۸۹';
export const faDigits = (s: string | number) => String(s).replace(/\d/g, (d) => FA[Number(d)]);

export function formatJalali(d: Date, withTime = false) {
  const { jy, jm, jd, hh, mm } = jalaliParts(d);
  const s = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  return faDigits(withTime ? `${s} - ${hh}:${mm}` : s);
}
