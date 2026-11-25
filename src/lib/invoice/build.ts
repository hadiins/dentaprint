/**
 * ساخت فاکتور از سفارش (خالص و قابل تست)
 * - همهٔ ورودی‌ها به تومان؛ خروجی فاکتور به واحد انتخابی (پیش‌فرض ریال، رایج در فاکتورهای رسمی)
 * - ارزش افزوده قابل تنظیم: غیرفعال، یا با نرخ مشخص و «قیمت‌ها شامل مالیات» / «مالیات اضافه بر قیمت»
 * - گرد کردن در سطح هر ردیف انجام می‌شود تا جمع ستون‌ها دقیقاً با جمع کل برابر باشد
 */
import { numberToWords } from './words.ts';

export interface SellerInfo {
  legalName: string; brandName: string; economicCode: string; nationalId: string; registrationNo: string;
  address: string; postalCode: string; phone: string; email: string; website: string;
  vatEnabled: boolean; vatRate: number; pricesIncludeVat: boolean; currency: 'IRR' | 'IRT'; footerNote: string;
}

export const DEFAULT_SELLER: SellerInfo = {
  legalName: 'شرکت نمونه دنتاپرینت (سهامی خاص)', brandName: 'دنتاپرینت', economicCode: '', nationalId: '', registrationNo: '',
  address: 'تهران، خیابان نمونه، پلاک ۱', postalCode: '', phone: '۰۲۱-۰۰۰۰۰۰۰۰', email: 'info@example.com', website: 'example.com',
  vatEnabled: false, vatRate: 10, pricesIncludeVat: true, currency: 'IRR', footerNote: 'کالای فروخته‌شده طبق شرایط مرجوعی سایت قابل بازگشت است.',
};

export interface BuyerInfo {
  name: string; phone: string; address: string; postalCode: string;
  official: boolean; economicCode?: string | null; nationalId?: string | null; orgName?: string | null;
}

export interface InvoiceSourceLine { name: string; sku: string; variantLabel?: string | null; quantity: number; retailUnitPrice: number; unitPrice: number }
export interface InvoiceSource { orderNumber: string; lines: InvoiceSourceLine[]; shipping: number; priceMode: 'RETAIL' | 'PARTNER'; tierName?: string | null }

export interface InvoiceLine {
  row: number; description: string; sku: string; quantity: number;
  unitPrice: number;   // قیمت واحد قبل از تخفیف (بدون مالیات در حالت شامل مالیات)
  gross: number;       // مبلغ کل قبل از تخفیف
  discount: number;    // تخفیف همکاری
  net: number;         // مبلغ پس از تخفیف (پایهٔ مالیات)
  vat: number;
  total: number;       // مبلغ نهایی ردیف
}
export interface InvoiceData {
  currency: 'IRR' | 'IRT'; currencyLabel: string; lines: InvoiceLine[];
  totals: { gross: number; discount: number; net: number; vat: number; total: number };
  amountInWords: string; vatRate: number | null; note: string | null;
}

const vatOf = (amount: number, rate: number, inclusive: boolean) =>
  inclusive ? Math.round((amount * rate) / (100 + rate)) : Math.round((amount * rate) / 100);

export function buildInvoice(src: InvoiceSource, seller: Pick<SellerInfo, 'vatEnabled' | 'vatRate' | 'pricesIncludeVat' | 'currency'>): InvoiceData {
  const k = seller.currency === 'IRR' ? 10 : 1;
  const rate = seller.vatEnabled ? seller.vatRate : 0;
  const incl = seller.pricesIncludeVat;
  const rows = [
    ...src.lines.map((l) => ({ description: l.variantLabel ? `${l.name} (${l.variantLabel})` : l.name, sku: l.sku, quantity: l.quantity, retail: l.retailUnitPrice, unit: l.unitPrice })),
    ...(src.shipping > 0 ? [{ description: 'هزینهٔ ارسال', sku: '-', quantity: 1, retail: src.shipping, unit: src.shipping }] : []),
  ];
  const lines: InvoiceLine[] = rows.map((r, i) => {
    const grossPaid = r.retail * r.quantity * k;   // مبالغ مصرف‌کننده‌ای (ممکن است شامل مالیات باشد)
    const netPaid = r.unit * r.quantity * k;        // مبلغ پرداختی ردیف
    let gross: number, net: number, vat: number, total: number;
    if (!rate) { gross = grossPaid; net = netPaid; vat = 0; total = netPaid; }
    else if (incl) {
      vat = vatOf(netPaid, rate, true); total = netPaid; net = netPaid - vat;
      gross = grossPaid - vatOf(grossPaid, rate, true);
    } else { gross = grossPaid; net = netPaid; vat = vatOf(netPaid, rate, false); total = net + vat; }
    return { row: i + 1, description: r.description, sku: r.sku, quantity: r.quantity, unitPrice: Math.round(gross / r.quantity), gross, discount: gross - net, net, vat, total };
  });
  const sum = (f: keyof InvoiceLine) => lines.reduce((s, l) => s + (l[f] as number), 0);
  const totals = { gross: sum('gross'), discount: sum('discount'), net: sum('net'), vat: sum('vat'), total: sum('total') };
  const currencyLabel = seller.currency === 'IRR' ? 'ریال' : 'تومان';
  return {
    currency: seller.currency, currencyLabel, lines, totals,
    amountInWords: `${numberToWords(totals.total)} ${currencyLabel}`,
    vatRate: rate || null,
    note: src.priceMode === 'PARTNER' ? `تخفیف همکاری${src.tierName ? ` سطح ${src.tierName}` : ''} در ستون تخفیف اعمال شده است.` : null,
  };
}

/** کد اقتصادی جدید ۱۲ یا ۱۴ رقمی (اشخاص حقیقی/حقوقی)، شناسهٔ ملی ۱۱ رقمی، کد ملی ۱۰ رقمی */
export const validEconomicCode = (s: string) => /^\d{12}$|^\d{14}$/.test(s);
export const validNationalId = (s: string) => /^\d{10,11}$/.test(s);

export function validateSeller(s: Partial<SellerInfo>): string[] {
  const e: string[] = [];
  if (!s.legalName || s.legalName.trim().length < 3) e.push('نام رسمی فروشنده را وارد کنید.');
  if (s.economicCode && !validEconomicCode(s.economicCode)) e.push('کد اقتصادی باید ۱۲ یا ۱۴ رقم باشد.');
  if (s.nationalId && !validNationalId(s.nationalId)) e.push('شناسهٔ ملی باید ۱۰ یا ۱۱ رقم باشد.');
  if (s.postalCode && !/^\d{10}$/.test(s.postalCode)) e.push('کد پستی باید ۱۰ رقم باشد.');
  if (s.vatRate != null && (!Number.isFinite(s.vatRate) || s.vatRate < 0 || s.vatRate > 30)) e.push('نرخ ارزش افزوده باید بین ۰ تا ۳۰ درصد باشد.');
  if (s.currency && s.currency !== 'IRR' && s.currency !== 'IRT') e.push('واحد پول نامعتبر است.');
  return e;
}

/** شمارهٔ فاکتور: سال شمسی + شمارهٔ ترتیبی شش‌رقمی، مثل 1405-000123 */
export const invoiceNumber = (jalaliYear: number, seq: number) => `${jalaliYear}-${String(seq).padStart(6, '0')}`;
