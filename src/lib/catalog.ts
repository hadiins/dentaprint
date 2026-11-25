/**
 * لایهٔ دسترسی به کاتالوگ.
 * - با پایگاه داده (DATABASE_URL): محصولات از جدول Product خوانده می‌شوند و از پنل مدیریت قابل ویرایش‌اند.
 * - بدون پایگاه داده: از SAMPLE_PRODUCTS (دادهٔ نمونه) استفاده می‌شود.
 */

import { CATEGORIES, type GroupSlug, type Product, type ProductType } from './catalog-meta.ts';
import { generateVariants, type ProductOption, type ProductVariant } from './variants.ts';
export * from './catalog-meta.ts';

export const SAMPLE_PRODUCTS: Product[] = [
  { slug: 'model-resin-beige-1l', sku: 'DP-RM-001', name: 'رزین مدل دندانی بژ دقت بالا – ۱ لیتر', category: 'model-resin', type: 'RESIN', icon: '🧪',
    retailPrice: 4_900_000, compareAtPrice: 5_600_000, minPrice: 3_900_000, partnerMinQty: 3, wavelength: '405nm', inStock: true, popularity: 98,
    short: 'مدل ارتودنسی و مدل کار با انقباض بسیار کم',
    description: 'رزین مدل با دقت ابعادی بالا برای مدل‌های ارتودنسی، مدل کار روکش و پروتز. سطح صاف و رنگ بژ مات، جزئیات مارجین را به‌خوبی نشان می‌دهد.',
    specs: { 'حجم': '۱۰۰۰ میلی‌لیتر', 'طول موج': '۴۰۵ نانومتر', 'ویسکوزیته': '۴۰۰ cP', 'ضخامت لایهٔ پیشنهادی': '۵۰ میکرون', 'سازگاری': 'LCD / DLP' } },
  { slug: 'model-resin-grey-fast-1l', sku: 'DP-RM-002', name: 'رزین مدل خاکستری سریع‌چاپ – ۱ لیتر', category: 'model-resin', type: 'RESIN', icon: '🧪',
    retailPrice: 4_200_000, minPrice: 3_400_000, partnerMinQty: 3, wavelength: '405nm', inStock: true, popularity: 85,
    short: 'تولید انبوه مدل‌های تشخیصی و الاینر',
    description: 'سرعت چاپ بالا با لایه‌های ۱۰۰ میکرونی؛ مناسب لابراتوارهای پرتیراژ الاینر.',
    specs: { 'حجم': '۱۰۰۰ میلی‌لیتر', 'طول موج': '۴۰۵ نانومتر', 'ویسکوزیته': '۳۵۰ cP', 'ضخامت لایهٔ پیشنهادی': '۱۰۰ میکرون' } },
  { slug: 'castable-resin-500g', sku: 'DP-RM-003', name: 'رزین ریختگی بدون خاکستر – ۵۰۰ گرم', category: 'model-resin', type: 'RESIN', icon: '🔥',
    retailPrice: 8_700_000, partnerMinQty: 2, wavelength: '405nm', inStock: true, popularity: 70,
    short: 'فریم پارسیل و کوپینگ فلزی',
    description: 'سوختن تمیز در کوره با باقی‌ماندهٔ خاکستر بسیار کم، برای ریخته‌گری دقیق.',
    specs: { 'وزن': '۵۰۰ گرم', 'طول موج': '۴۰۵ نانومتر', 'خاکستر باقی‌مانده': 'کمتر از ۰٫۱٪' } },
  { slug: 'gingiva-mask-resin-250g', sku: 'DP-RM-004', name: 'رزین ماسک لثه انعطاف‌پذیر – ۲۵۰ گرم', category: 'model-resin', type: 'RESIN', icon: '🩷',
    retailPrice: 5_400_000, partnerMinQty: 2, wavelength: '385nm', inStock: true, popularity: 60,
    short: 'شبیه‌سازی بافت نرم در مدل ایمپلنت',
    description: 'رزین انعطاف‌پذیر برای ساخت ماسک لثه روی مدل‌های ایمپلنت.',
    specs: { 'وزن': '۲۵۰ گرم', 'طول موج': '۳۸۵ نانومتر', 'سختی': 'Shore A 70' } },
  { slug: 'surgical-guide-resin-500g', sku: 'DP-RC-001', name: 'رزین گاید جراحی شفاف زیست‌سازگار – ۵۰۰ گرم', category: 'clinical-resin', type: 'RESIN', icon: '💉',
    retailPrice: 9_800_000, compareAtPrice: 11_000_000, partnerMinQty: 2, wavelength: '405nm', inStock: true, popularity: 92,
    short: 'گاید جراحی ایمپلنت با شفافیت بالا',
    description: 'رزین شفاف زیست‌سازگار برای گایدهای جراحی؛ قابل استریل طبق دستور سازنده.',
    specs: { 'وزن': '۵۰۰ گرم', 'طول موج': '۴۰۵ نانومتر', 'زیست‌سازگاری': 'طبق برگهٔ فنی سازنده', 'رنگ': 'شفاف' } },
  { slug: 'temporary-crown-resin-a2', sku: 'DP-RC-002', name: 'رزین روکش موقت C&B – ۵۰۰ گرم', category: 'clinical-resin', type: 'RESIN', icon: '🦷',
    retailPrice: 12_500_000, partnerMinQty: 2, wavelength: '405nm', inStock: true, popularity: 90, tierPrices: { gold: 10_200_000 },
    short: 'روکش و بریج موقت با رنگ طبیعی',
    description: 'استحکام خمشی بالا و رنگ طبیعی برای روکش و بریج موقت. کیورینگ نیتروژنی پیشنهاد می‌شود.',
    specs: { 'وزن': '۵۰۰ گرم', 'طول موج': '۴۰۵ نانومتر', 'کاربرد': 'روکش و بریج موقت' } },
  { slug: 'denture-base-resin-pink', sku: 'DP-RC-003', name: 'رزین بیس دنچر صورتی – ۵۰۰ گرم', category: 'clinical-resin', type: 'RESIN', icon: '💗',
    retailPrice: 11_200_000, compareAtPrice: 12_400_000, partnerMinQty: 2, wavelength: '405nm', inStock: false, popularity: 76,
    short: 'دنچر دیجیتال با رنگ طبیعی لثه',
    description: 'رنگ طبیعی لثه و مقاومت به ضربهٔ مناسب برای دنچرهای کامل و پارسیل دیجیتال.',
    specs: { 'وزن': '۵۰۰ گرم', 'طول موج': '۳۸۵ / ۴۰۵ نانومتر', 'رنگ': 'صورتی طبیعی' } },
  { slug: 'dental-lcd-printer-8k', sku: 'DP-PR-001', name: 'پرینتر سه‌بعدی دندانی LCD مونوکروم 8K', category: 'printers', type: 'EQUIPMENT', icon: '🖨️',
    retailPrice: 185_000_000, compareAtPrice: 199_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 7, wavelength: '405nm', inStock: true, popularity: 95,
    short: 'دقت ۲۲ میکرون، پروفایل آماده برای همهٔ رزین‌ها',
    description: 'پرینتر دقیق برای مدل، گاید و روکش موقت. همراه با نصب، آموزش و پروفایل‌های چاپ آماده.',
    specs: { 'فناوری': 'LCD مونوکروم', 'وضوح': '8K – ۲۲ میکرون', 'حجم ساخت': '۲۲۳×۱۲۶×۲۰۰ میلی‌متر', 'منبع نور': '۴۰۵ نانومتر', 'گارانتی': '۱۸ ماه' } },
  { slug: 'dental-dlp-printer-pro', sku: 'DP-PR-002', name: 'پرینتر DLP دندانی حرفه‌ای', category: 'printers', type: 'EQUIPMENT', icon: '🖨️',
    retailPrice: 390_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 5, wavelength: '385nm', inStock: true, popularity: 80,
    short: 'پایداری بالا برای تولید کلینیکی',
    description: 'پرینتر DLP با پروفایل باز، مناسب لابراتوارهای پرتیراژ و تولید کلینیکی.',
    specs: { 'فناوری': 'DLP', 'وضوح': '۵۰ میکرون', 'منبع نور': '۳۸۵ نانومتر', 'گارانتی': '۱۸ ماه' } },
  { slug: 'wash-cure-2in1', sku: 'DP-PP-001', name: 'دستگاه شستشو و کیورینگ ۲ در ۱', category: 'post-processing', type: 'EQUIPMENT', icon: '💡',
    retailPrice: 24_500_000, compareAtPrice: 27_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 10, inStock: true, popularity: 88,
    short: 'شستشوی خودکار و کیورینگ یکنواخت',
    description: 'شستشوی خودکار با الکل و کیورینگ ۳۶۰ درجه برای قطعات چاپی.',
    specs: { 'ظرفیت': '۷ لیتر', 'نور کیورینگ': '۳۸۵ + ۴۰۵ نانومتر', 'صفحهٔ گردان': '۳۶۰ درجه' } },
  { slug: 'nitrogen-cure-unit', sku: 'DP-PP-002', name: 'کیورینگ حرارتی با گاز نیتروژن', category: 'post-processing', type: 'EQUIPMENT', icon: '💡',
    retailPrice: 98_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 8, inStock: false, popularity: 55,
    short: 'پخت نهایی رزین‌های کلینیکی',
    description: 'برای رسیدن به حداکثر خواص مکانیکی رزین‌های کلینیکی.',
    specs: { 'دما': 'تا ۸۰ درجه', 'اتمسفر': 'نیتروژن' } },
  { slug: 'lab-micromotor-50k', sku: 'DP-LE-001', name: 'میکروموتور لابراتواری ۵۰٬۰۰۰ دور', category: 'lab-equipment', type: 'EQUIPMENT', icon: '⚙️',
    retailPrice: 18_900_000, partnerMinQty: 1, maxPartnerDiscountPercent: 10, inStock: true, popularity: 83,
    short: 'براشلس، کم‌صدا و قدرتمند',
    description: 'میکروموتور براشلس برای تریم و پرداخت.',
    specs: { 'دور': '۱٬۰۰۰ تا ۵۰٬۰۰۰ دور در دقیقه', 'گشتاور': '۸ N.cm', 'گارانتی': '۱۲ ماه' } },
  { slug: 'lab-desktop-scanner', sku: 'DP-LE-002', name: 'اسکنر لابراتواری رومیزی', category: 'lab-equipment', type: 'EQUIPMENT', icon: '📷',
    retailPrice: 265_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 6, inStock: true, popularity: 72,
    short: 'دقت ۱۰ میکرون، خروجی STL',
    description: 'اسکن مدل و قالب با دقت بالا برای جریان کار دیجیتال.',
    specs: { 'دقت': '۱۰ میکرون', 'خروجی': 'STL / PLY / OBJ' } },
  { slug: 'ipa-99-5l', sku: 'DP-CO-001', name: 'ایزوپروپیل الکل ۹۹٪ – ۵ لیتر', category: 'consumables', type: 'CONSUMABLE', icon: '🧴',
    retailPrice: 2_900_000, minPrice: 2_400_000, partnerMinQty: 2, inStock: true, popularity: 78,
    short: 'شستشوی قطعات رزینی',
    description: 'مادهٔ اصلی شستشوی قطعات پس از چاپ.',
    specs: { 'خلوص': '۹۹٪', 'حجم': '۵ لیتر' } },
  { slug: 'nfep-film-5pack', sku: 'DP-CO-002', name: 'فیلم nFEP مخزن رزین – بستهٔ ۵ عددی', category: 'consumables', type: 'CONSUMABLE', icon: '🎞️',
    retailPrice: 1_800_000, partnerMinQty: 2, inStock: true, popularity: 66,
    short: 'جداشدن آسان لایه‌ها',
    description: 'قطعهٔ مصرفی مخزن پرینتر.',
    specs: { 'ضخامت': '۰٫۱۵ میلی‌متر', 'تعداد': '۵ عدد' } },

  /* ───────── پروتز و دندان مصنوعی ───────── */
  { slug: 'acrylic-teeth-2layer-set28', sku: 'DP-DT-001', name: 'دندان مصنوعی آکریلی دولایه – ست ۲۸ عددی', category: 'denture-teeth', type: 'MATERIAL', icon: '🦷',
    retailPrice: 950_000, partnerMinQty: 5, inStock: true, popularity: 89,
    short: 'دنچر کامل و پارسیل با رنگ طبیعی',
    description: 'دندان مصنوعی آکریلی (PMMA) دولایه با مقاومت سایشی مناسب و شفافیت طبیعی لبهٔ اینسیزال. رنگ و فرم (مولد) را هنگام خرید انتخاب کنید.',
    specs: { 'جنس': 'آکریل PMMA دولایه', 'تعداد': '۲۸ عدد (قدامی و خلفی، بالا و پایین)', 'راهنمای رنگ': 'VITA classical', 'کاربرد': 'دنچر کامل، پارسیل، اوردنچر' } },
  { slug: 'composite-teeth-3layer-set28', sku: 'DP-DT-002', name: 'دندان مصنوعی کامپوزیتی سه‌لایه – ست ۲۸ عددی', category: 'denture-teeth', type: 'MATERIAL', icon: '🦷',
    retailPrice: 2_400_000, compareAtPrice: 2_650_000, partnerMinQty: 3, inStock: true, popularity: 81,
    short: 'زیبایی و مقاومت سایشی بالاتر',
    description: 'دندان مصنوعی نانوکامپوزیتی سه‌لایه با زیبایی بالا و مقاومت سایشی بهتر نسبت به آکریل؛ مناسب دنچرهای زیبایی و ایمپلنت‌ساپورت.',
    specs: { 'جنس': 'نانوکامپوزیت سه‌لایه', 'تعداد': '۲۸ عدد', 'رنگ‌بندی': 'A1 تا D4', 'کاربرد': 'دنچر زیبایی، اوردنچر ایمپلنت' } },
  { slug: 'anterior-teeth-plate6', sku: 'DP-DT-003', name: 'دندان مصنوعی قدامی – پلاک ۶ عددی', category: 'denture-teeth', type: 'MATERIAL', icon: '🦷',
    retailPrice: 280_000, partnerMinQty: 10, inStock: true, popularity: 64,
    short: 'جایگزینی دندان‌های قدامی در پارسیل',
    description: 'پلاک ۶ عددی دندان قدامی بالا یا پایین؛ فرم و رنگ را هنگام خرید انتخاب کنید.',
    specs: { 'جنس': 'آکریل دولایه', 'تعداد': '۶ عدد', 'رنگ‌بندی': 'A1 تا D4' } },
  { slug: 'heat-cure-acrylic', sku: 'DP-DM-001', name: 'آکریل حرارتی (هیت‌کیور) – پودر ۵۰۰ گرم + مایع ۲۵۰ میلی‌لیتر', category: 'denture-materials', type: 'MATERIAL', icon: '🧴',
    retailPrice: 1_850_000, partnerMinQty: 3, minPrice: 1_500_000, inStock: true, popularity: 86,
    short: 'بیس دنچر با رنگ طبیعی لثه و رگه‌های عروقی',
    description: 'آکریل پخت حرارتی برای ساخت بیس دنچر کامل و پارسیل با تخلخل کم و رنگ پایدار.',
    specs: { 'نوع پخت': 'حرارتی (بن‌ماری)', 'وزن پودر': '۵۰۰ گرم', 'حجم مایع': '۲۵۰ میلی‌لیتر', 'رنگ': 'صورتی رگه‌دار' } },
  { slug: 'self-cure-acrylic', sku: 'DP-DM-002', name: 'آکریل خودپخت (سلف‌کیور) – ست ترمیم و ریلاین', category: 'denture-materials', type: 'MATERIAL', icon: '🧴',
    retailPrice: 1_350_000, partnerMinQty: 3, inStock: true, popularity: 74,
    short: 'تعمیر، ریلاین و تری اختصاصی',
    description: 'آکریل پخت سرد برای تعمیر دنچر، ریلاین، ساخت تری اختصاصی و پلاک ارتودنسی.',
    specs: { 'نوع پخت': 'شیمیایی (سرد)', 'زمان کار': 'حدود ۵ دقیقه', 'کاربرد': 'تعمیر، ریلاین، تری' } },
  { slug: 'base-plate-wax-500g', sku: 'DP-DM-003', name: 'موم بیس‌پلیت دندانسازی – ۵۰۰ گرم', category: 'denture-materials', type: 'CONSUMABLE', icon: '🕯️',
    retailPrice: 650_000, partnerMinQty: 5, inStock: true, popularity: 69,
    short: 'رکورد بایت و چیدن دندان',
    description: 'موم صورتی با شکل‌پذیری مناسب برای ساخت ریم اکلوژن و چیدن دندان مصنوعی.',
    specs: { 'وزن': '۵۰۰ گرم', 'رنگ': 'صورتی', 'نوع': 'زمستانی / تابستانی' } },
  { slug: 'dental-stone-type3-25kg', sku: 'DP-DM-004', name: 'گچ استون دندانی نوع III – ۲۵ کیلوگرم', category: 'denture-materials', type: 'MATERIAL', icon: '🧱',
    retailPrice: 2_200_000, partnerMinQty: 2, inStock: true, popularity: 71,
    short: 'مدل کار و فلاسک‌گذاری',
    description: 'گچ استون با سختی و دقت ابعادی مناسب برای مدل‌های کاری پروتز و فلاسک‌گذاری.',
    specs: { 'نوع': 'III (استون)', 'وزن': '۲۵ کیلوگرم', 'زمان سخت شدن': 'حدود ۱۲ دقیقه' } },
  { slug: 'porcelain-furnace-digital', sku: 'DP-PE-001', name: 'کورهٔ پخت پرسلن دیجیتال با پمپ وکیوم', category: 'prosthetic-equipment', type: 'EQUIPMENT', icon: '🔥',
    retailPrice: 420_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 5, inStock: true, popularity: 67,
    short: 'پخت سرامیک و پرسلن با برنامه‌های آماده',
    description: 'کورهٔ پرسلن با صفحهٔ لمسی، برنامه‌های قابل ذخیره و پمپ وکیوم؛ همراه با نصب و آموزش.',
    specs: { 'حداکثر دما': '۱۲۰۰ درجه', 'برنامه‌ها': '۲۰۰ برنامهٔ قابل ذخیره', 'وکیوم': 'پمپ داخلی', 'گارانتی': '۱۸ ماه' } },
  { slug: 'acrylic-curing-unit', sku: 'DP-PE-002', name: 'دستگاه پخت آکریل (پلیمریزاسیون) با کنترل دما', category: 'prosthetic-equipment', type: 'EQUIPMENT', icon: '♨️',
    retailPrice: 38_000_000, partnerMinQty: 1, maxPartnerDiscountPercent: 8, inStock: true, popularity: 62,
    short: 'پخت یکنواخت بیس دنچر',
    description: 'بن‌ماری دیجیتال با برنامهٔ پخت مرحله‌ای برای کاهش تخلخل و تنش داخلی آکریل.',
    specs: { 'ظرفیت': '۴ فلاسک', 'کنترل': 'دیجیتال برنامه‌پذیر', 'گارانتی': '۱۲ ماه' } },
  { slug: 'hydraulic-flask-press', sku: 'DP-PE-003', name: 'پرس هیدرولیک فلاسک', category: 'prosthetic-equipment', type: 'EQUIPMENT', icon: '🗜️',
    retailPrice: 14_500_000, partnerMinQty: 1, maxPartnerDiscountPercent: 10, inStock: true, popularity: 55,
    short: 'پرس یکنواخت آکریل در فلاسک',
    description: 'پرس هیدرولیک با فشارسنج برای پرس دقیق آکریل در فلاسک.',
    specs: { 'حداکثر فشار': '۳ تن', 'فشارسنج': 'دارد' } },
  { slug: 'brass-flask-pair', sku: 'DP-PE-004', name: 'فلاسک برنجی پروتز – جفت', category: 'prosthetic-equipment', type: 'EQUIPMENT', icon: '🧰',
    retailPrice: 2_900_000, partnerMinQty: 2, inStock: true, popularity: 58,
    short: 'مقاوم و دقیق برای پخت آکریل',
    description: 'فلاسک برنجی با جفت‌شدگی دقیق برای ساخت دنچر.',
    specs: { 'جنس': 'برنج', 'تعداد': '۱ جفت' } },

  /* ───────── ترمیمی و پرکردن ───────── */
  { slug: 'nanohybrid-composite-4g', sku: 'DP-RS-001', name: 'کامپوزیت نانوهیبرید یونیورسال – سرنگ ۴ گرمی', category: 'composites', type: 'MATERIAL', icon: '✨',
    retailPrice: 1_650_000, compareAtPrice: 1_850_000, partnerMinQty: 5, inStock: true, popularity: 93,
    short: 'ترمیم قدامی و خلفی با پالیش عالی',
    description: 'کامپوزیت نوری نانوهیبرید برای ترمیم‌های کلاس I تا V با پالیش‌پذیری و استحکام بالا.',
    specs: { 'نوع': 'نانوهیبرید نوری', 'وزن': '۴ گرم', 'رنگ‌بندی': 'A1، A2، A3، A3.5، B1', 'کاربرد': 'ترمیم قدامی و خلفی' } },
  { slug: 'flowable-composite-2g', sku: 'DP-RS-002', name: 'کامپوزیت فلوابل – سرنگ ۲ گرمی', category: 'composites', type: 'MATERIAL', icon: '✨',
    retailPrice: 980_000, partnerMinQty: 5, inStock: true, popularity: 84,
    short: 'لاینر، حفرات کوچک و فیشورسیلانت',
    description: 'کامپوزیت روان با رادیواپسیتی مناسب برای لایهٔ اول ترمیم، حفرات کوچک و ترمیم سرویکال.',
    specs: { 'نوع': 'فلوابل نوری', 'وزن': '۲ گرم', 'رنگ‌بندی': 'A1، A2، A3' } },
  { slug: 'bulk-fill-composite', sku: 'DP-RS-003', name: 'کامپوزیت بالک‌فیل خلفی – سرنگ ۴ گرمی', category: 'composites', type: 'MATERIAL', icon: '✨',
    retailPrice: 1_900_000, partnerMinQty: 3, inStock: true, popularity: 77,
    short: 'پرکردن خلفی تا عمق ۴ میلی‌متر در یک لایه',
    description: 'کامپوزیت بالک‌فیل با انقباض پلیمریزاسیون کم برای ترمیم سریع دندان‌های خلفی.',
    specs: { 'عمق کیورینگ': 'تا ۴ میلی‌متر', 'وزن': '۴ گرم', 'رنگ': 'یونیورسال' } },
  { slug: 'glass-ionomer-restorative', sku: 'DP-RS-004', name: 'گلاس آینومر ترمیمی – پودر و مایع', category: 'composites', type: 'MATERIAL', icon: '🧪',
    retailPrice: 1_450_000, partnerMinQty: 3, inStock: true, popularity: 72,
    short: 'آزادسازی فلوراید، ترمیم کودکان و سرویکال',
    description: 'گلاس آینومر خودسخت‌شونده با آزادسازی فلوراید؛ مناسب دندان‌های شیری، ضایعات سرویکال و بیس.',
    specs: { 'پودر': '۱۵ گرم', 'مایع': '۱۰ میلی‌لیتر', 'سخت شدن': 'شیمیایی' } },
  { slug: 'universal-bonding-5ml', sku: 'DP-BD-001', name: 'باندینگ یونیورسال – ۵ میلی‌لیتر', category: 'bonding', type: 'MATERIAL', icon: '💧',
    retailPrice: 2_300_000, partnerMinQty: 3, inStock: true, popularity: 88,
    short: 'سلف‌اچ، توتال‌اچ و سلکتیو‌اچ',
    description: 'باندینگ تک‌بطری یونیورسال با چسبندگی به مینا، عاج و سطوح غیرمستقیم.',
    specs: { 'حجم': '۵ میلی‌لیتر', 'روش‌ها': 'سلف‌اچ / توتال‌اچ / سلکتیو‌اچ', 'کیورینگ': 'نوری' } },
  { slug: 'phosphoric-etch-gel-37', sku: 'DP-BD-002', name: 'ژل اچ اسید فسفریک ۳۷٪ – سرنگ', category: 'bonding', type: 'CONSUMABLE', icon: '💧',
    retailPrice: 280_000, partnerMinQty: 10, minPrice: 220_000, inStock: true, popularity: 79,
    short: 'اچ مینا و عاج',
    description: 'ژل اچ با رنگ مشخص و ویسکوزیته مناسب برای کنترل آسان محل کاربرد.',
    specs: { 'غلظت': '۳۷٪', 'حجم': '۳ میلی‌لیتر' } },
  { slug: 'light-cure-calcium-liner', sku: 'DP-BD-003', name: 'لاینر کلسیم هیدروکساید نوری', category: 'bonding', type: 'MATERIAL', icon: '💧',
    retailPrice: 1_200_000, partnerMinQty: 3, inStock: true, popularity: 60,
    short: 'محافظت پالپ زیر ترمیم',
    description: 'لاینر نوری حاوی کلسیم هیدروکساید برای پوشش حفرات عمیق.',
    specs: { 'حجم': '۲ سرنگ × ۲ گرم', 'کیورینگ': 'نوری' } },
  { slug: 'led-light-cure-wireless', sku: 'DP-RE-001', name: 'لایت کیور LED بی‌سیم', category: 'restorative-equipment', type: 'EQUIPMENT', icon: '🔦',
    retailPrice: 9_800_000, compareAtPrice: 11_200_000, partnerMinQty: 1, maxPartnerDiscountPercent: 10, inStock: true, popularity: 91,
    short: 'شدت نور بالا و حالت‌های کاری متنوع',
    description: 'لایت کیور LED بی‌سیم با چند حالت کاری، تایمر و باتری لیتیومی؛ مناسب کامپوزیت، باندینگ و لاینرهای نوری.',
    specs: { 'شدت نور': 'تا ۱۴۰۰ mW/cm²', 'طول موج': '۴۲۰ تا ۴۸۰ نانومتر', 'حالت‌ها': 'استاندارد، پالس، افزایشی', 'گارانتی': '۱۲ ماه' } },
  { slug: 'capsule-mixer-digital', sku: 'DP-RE-002', name: 'کپسول‌میکسر (آمالگاماتور) دیجیتال', category: 'restorative-equipment', type: 'EQUIPMENT', icon: '🌀',
    retailPrice: 7_500_000, partnerMinQty: 1, maxPartnerDiscountPercent: 10, inStock: true, popularity: 57,
    short: 'مخلوط‌کردن کپسول گلاس آینومر و آمالگام',
    description: 'میکسر کپسولی با تایمر دیجیتال و درب ایمنی.',
    specs: { 'سرعت': '۴۲۰۰ دور در دقیقه', 'تایمر': 'دیجیتال' } },
  { slug: 'composite-warmer', sku: 'DP-RE-003', name: 'گرم‌کن کامپوزیت', category: 'restorative-equipment', type: 'EQUIPMENT', icon: '🌡️',
    retailPrice: 6_200_000, partnerMinQty: 1, maxPartnerDiscountPercent: 10, inStock: false, popularity: 50,
    short: 'روانی بهتر و تطابق بیشتر کامپوزیت',
    description: 'گرم‌کن کامپوزیت با سه دمای قابل انتخاب برای سرنگ و کامپیول.',
    specs: { 'دما': '۳۹ / ۵۴ / ۶۸ درجه', 'ظرفیت': 'سرنگ و کامپیول' } },
];
/* ───────── رنگ‌بندی و فرم محصولات نمونه ───────── */
const VITA = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C2', 'D3'];
const SAMPLE_OPTIONS: Record<string, { options: ProductOption[]; outOfStock?: string[]; prices?: Record<string, number> }> = {
  'acrylic-teeth-2layer-set28': { options: [{ name: 'رنگ', values: VITA }, { name: 'فرم', values: ['S (مربعی)', 'T (مثلثی)', 'O (بیضی)'] }], outOfStock: ['C2|T (مثلثی)', 'D3|O (بیضی)'] },
  'composite-teeth-3layer-set28': { options: [{ name: 'رنگ', values: VITA.slice(0, 6) }], outOfStock: ['B2'] },
  'anterior-teeth-plate6': { options: [{ name: 'رنگ', values: VITA }, { name: 'فک', values: ['بالا', 'پایین'] }] },
  'nanohybrid-composite-4g': { options: [{ name: 'رنگ', values: ['A1', 'A2', 'A3', 'A3.5', 'B1', 'OA2 (اپک)', 'Incisal'] }], outOfStock: ['B1'], prices: { 'Incisal': 1_750_000 } },
  'flowable-composite-2g': { options: [{ name: 'رنگ', values: ['A1', 'A2', 'A3'] }] },
  'temporary-crown-resin-a2': { options: [{ name: 'رنگ', values: ['A1', 'A2', 'A3', 'B1'] }] },
  'heat-cure-acrylic': { options: [{ name: 'رنگ', values: ['صورتی رگه‌دار', 'صورتی ساده', 'شفاف'] }], prices: { 'شفاف': 2_050_000 } },
  'base-plate-wax-500g': { options: [{ name: 'نوع', values: ['زمستانی', 'تابستانی'] }] },
};
for (const p of SAMPLE_PRODUCTS) {
  const cfg = SAMPLE_OPTIONS[p.slug];
  if (!cfg) continue;
  p.options = cfg.options;
  p.variants = generateVariants(p.sku, cfg.options, [], 20).map((v): ProductVariant => ({
    ...v, stock: cfg.outOfStock?.includes(v.key) ? 0 : v.stock, retailPrice: cfg.prices?.[v.values[0]] ?? null,
  }));
}

/** @deprecated از getAllProducts استفاده کنید (این نام فقط برای seed حفظ شده) */
export const PRODUCTS = SAMPLE_PRODUCTS;

export type SortKey = 'popular' | 'cheap' | 'expensive' | 'discount';
export interface ProductQuery { category?: string; group?: GroupSlug; type?: ProductType; q?: string; sort?: SortKey; inStock?: boolean }

const discountOf = (p: Product) => (p.compareAtPrice ? (p.compareAtPrice - p.retailPrice) / p.compareAtPrice : 0);

async function loadFromDb(): Promise<Product[]> {
  const [{ prisma }, { getMediaStorage }] = await Promise.all([import('./prisma'), import('./media/storage')]);
  const storage = getMediaStorage();
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { slug: true } }, tierPrices: { include: { tier: { select: { slug: true } } } }, variants: { orderBy: { sort: 'asc' } }, images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] } },
  });
  return rows.map((r) => {
    const options = (Array.isArray(r.options) ? r.options : []) as unknown as ProductOption[];
    const variants: ProductVariant[] = r.variants.map((v) => ({ key: v.key, values: v.values, sku: v.sku, stock: v.stock, retailPrice: v.retailPrice != null ? Number(v.retailPrice) : null, isActive: v.isActive }));
    const hasOpts = options.length > 0 && variants.length > 0;
    return {
    slug: r.slug, sku: r.sku, name: r.name, category: r.category.slug, type: r.type as ProductType, icon: r.icon ?? '📦',
    retailPrice: Number(r.retailPrice), compareAtPrice: r.compareAtPrice != null ? Number(r.compareAtPrice) : undefined,
    minPrice: r.minPrice != null ? Number(r.minPrice) : undefined, partnerMinQty: r.partnerMinQty,
    maxPartnerDiscountPercent: r.maxPartnerDiscountPercent ?? undefined,
    tierPrices: Object.fromEntries(r.tierPrices.map((t) => [t.tier.slug, Number(t.price)])),
    wavelength: r.wavelengthNm ? `${r.wavelengthNm}nm` : undefined, irc: r.irc ?? undefined,
    inStock: hasOpts ? variants.some((v) => v.isActive && v.stock > 0) : r.stock > 0, popularity: r.popularity, short: r.shortDescription ?? '', description: r.description,
    specs: (r.specs ?? {}) as Record<string, string>,
    ...(hasOpts ? { options, variants } : {}),
    images: r.images.map((i) => ({ id: i.id, url: storage.url(i.key), alt: i.alt || r.name, width: i.width, height: i.height, optionValue: i.optionValue })),
  }; });
}

/** همهٔ محصولات فعال */
export async function getAllProducts(): Promise<Product[]> {
  return process.env.DATABASE_URL ? loadFromDb() : SAMPLE_PRODUCTS;
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const q = query.q?.trim();
  const groupCats = query.group ? new Set(CATEGORIES.filter((c) => c.group === query.group).map((c) => c.slug)) : null;
  const list = (await getAllProducts()).filter((p) =>
    (!query.category || p.category === query.category) &&
    (!groupCats || groupCats.has(p.category)) &&
    (!query.type || p.type === query.type) &&
    (!query.inStock || p.inStock) &&
    (!q || (p.name + p.short + p.description).includes(q)));
  const s = query.sort ?? 'popular';
  return list.sort((a, b) =>
    s === 'cheap' ? a.retailPrice - b.retailPrice
      : s === 'expensive' ? b.retailPrice - a.retailPrice
        : s === 'discount' ? discountOf(b) - discountOf(a)
          : b.popularity - a.popularity);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getAllProducts()).find((p) => p.slug === slug);
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
  return (await getProducts({ sort: 'popular' })).slice(0, limit);
}

export async function getRelated(p: Product, limit = 4): Promise<Product[]> {
  return (await getAllProducts()).filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, limit);
}

