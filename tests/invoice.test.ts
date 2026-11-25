import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJalali, formatJalali, jalaliParts } from '../src/lib/invoice/jalali.ts';
import { numberToWords } from '../src/lib/invoice/words.ts';
import { buildInvoice, validateSeller, validEconomicCode, invoiceNumber, type InvoiceSource } from '../src/lib/invoice/build.ts';

test('تاریخ شمسی: مقایسه با تقویم ایرانی ICU برای ۴۰۰ روز تصادفی', () => {
  assert.deepEqual(toJalali(2024, 3, 20), [1403, 1, 1]);
  assert.deepEqual(toJalali(2025, 3, 21), [1404, 1, 1]);
  assert.deepEqual(toJalali(2026, 11, 24), [1405, 9, 3]);
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.UTC(1990, 0, 1) + Math.floor(Math.random() * 50 * 365) * 86_400_000);
    const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
    assert.deepEqual(toJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), [parseInt(p.year), Number(p.month), Number(p.day)], d.toISOString());
  }
});

test('منطقهٔ زمانی تهران: ساعت ۲۲:۰۰ UTC روز قبل = روز بعد در تهران', () => {
  const d = new Date(Date.UTC(2024, 2, 19, 22, 0)); // 2024-03-20 01:30 تهران
  assert.deepEqual([jalaliParts(d).jy, jalaliParts(d).jm, jalaliParts(d).jd], [1403, 1, 1]);
  assert.equal(formatJalali(d), '۱۴۰۳/۰۱/۰۱');
});

test('عدد به حروف', () => {
  const cases: [number, string][] = [
    [0, 'صفر'], [7, 'هفت'], [15, 'پانزده'], [21, 'بیست و یک'], [100, 'یکصد'], [105, 'یکصد و پنج'], [999, 'نهصد و نود و نه'],
    [1000, 'یک هزار'], [1001, 'یک هزار و یک'], [2500, 'دو هزار و پانصد'], [1_000_000, 'یک میلیون'],
    [12_936_000, 'دوازده میلیون و نهصد و سی و شش هزار'], [53_500_000, 'پنجاه و سه میلیون و پانصد هزار'],
    [4_200_000_000, 'چهار میلیارد و دویست میلیون'], [1_000_001_000, 'یک میلیارد و یک هزار'],
  ];
  for (const [n, w] of cases) assert.equal(numberToWords(n), w, String(n));
  assert.throws(() => numberToWords(1.5));
});

const SRC: InvoiceSource = {
  orderNumber: 'DP-1', priceMode: 'PARTNER', tierName: 'نقره‌ای', shipping: 450_000,
  lines: [
    { name: 'کامپوزیت', sku: 'DP-RS-001-A2', variantLabel: 'رنگ: A2', quantity: 3, retailUnitPrice: 1_650_000, unitPrice: 1_452_000 },
    { name: 'باندینگ', sku: 'DP-BD-001', quantity: 1, retailUnitPrice: 2_300_000, unitPrice: 2_024_000 },
  ],
};
const paid = (3 * 1_452_000 + 2_024_000 + 450_000) * 10;

test('فاکتور بدون ارزش افزوده (ریال): جمع‌ها، تخفیف همکاری، ردیف ارسال', () => {
  const inv = buildInvoice(SRC, { vatEnabled: false, vatRate: 10, pricesIncludeVat: true, currency: 'IRR' });
  assert.equal(inv.lines.length, 3);
  assert.equal(inv.lines[0].description, 'کامپوزیت (رنگ: A2)');
  assert.equal(inv.lines[0].unitPrice, 16_500_000);
  assert.equal(inv.lines[0].discount, 3 * 198_000 * 10);
  assert.equal(inv.lines[2].description, 'هزینهٔ ارسال');
  assert.equal(inv.totals.total, paid);
  assert.equal(inv.totals.gross - inv.totals.discount, inv.totals.net);
  assert.equal(inv.totals.vat, 0); assert.equal(inv.vatRate, null);
  assert.ok(inv.amountInWords.endsWith('ریال')); assert.ok(inv.note?.includes('نقره‌ای'));
});

test('ارزش افزوده شامل قیمت: مبلغ پرداختی ثابت و جمع ستون‌ها دقیق', () => {
  const inv = buildInvoice(SRC, { vatEnabled: true, vatRate: 10, pricesIncludeVat: true, currency: 'IRR' });
  assert.equal(inv.totals.total, paid);
  for (const l of inv.lines) { assert.equal(l.net + l.vat, l.total); assert.equal(l.gross - l.discount, l.net); }
  assert.equal(inv.totals.net + inv.totals.vat, inv.totals.total);
  assert.equal(inv.lines[1].vat, Math.round(20_240_000 * 10 / 110));
  assert.equal(inv.vatRate, 10);
});

test('ارزش افزوده اضافه بر قیمت و حالت تومان', () => {
  const inv = buildInvoice(SRC, { vatEnabled: true, vatRate: 10, pricesIncludeVat: false, currency: 'IRT' });
  assert.equal(inv.totals.net, paid / 10);
  assert.equal(inv.totals.vat, inv.lines.reduce((s, l) => s + l.vat, 0));
  assert.equal(inv.totals.total, inv.totals.net + inv.totals.vat);
  assert.equal(inv.currencyLabel, 'تومان');
  const retail = buildInvoice({ ...SRC, priceMode: 'RETAIL', shipping: 0, lines: [{ name: 'x', sku: 's', quantity: 1, retailUnitPrice: 100, unitPrice: 100 }] }, { vatEnabled: false, vatRate: 0, pricesIncludeVat: true, currency: 'IRT' });
  assert.equal(retail.note, null); assert.equal(retail.totals.discount, 0); assert.equal(retail.amountInWords, 'یکصد تومان');
});

test('اعتبارسنجی فروشنده، کد اقتصادی و شمارهٔ فاکتور', () => {
  assert.deepEqual(validateSeller({ legalName: 'شرکت دنتاپرینت', economicCode: '411111111111', nationalId: '10101010101', postalCode: '1234567890', vatRate: 10, currency: 'IRR' }), []);
  assert.equal(validateSeller({ legalName: 'شرکت', economicCode: '123', postalCode: '12', vatRate: 50 }).length, 3);
  assert.ok(validEconomicCode('12345678901234')); assert.equal(validEconomicCode('1234567890123'), false);
  assert.equal(invoiceNumber(1405, 123), '1405-000123');
});
