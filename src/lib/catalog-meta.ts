/**
 * اطلاعات پایهٔ کاتالوگ (نوع‌ها، گروه‌ها، دسته‌ها) — بدون دسترسی به پایگاه داده
 * تا در کامپوننت‌های سمت مرورگر هم بدون حجیم شدن بسته قابل استفاده باشد.
 */
export type ProductType = 'RESIN' | 'MATERIAL' | 'EQUIPMENT' | 'CONSUMABLE';
export const TYPE_LABELS: Record<ProductType, string> = { RESIN: 'رزین‌ها', MATERIAL: 'مواد اولیه', EQUIPMENT: 'تجهیزات', CONSUMABLE: 'مواد مصرفی' };

export type GroupSlug = 'print3d' | 'prosthetics' | 'restorative' | 'lab';
export interface CategoryGroup { slug: GroupSlug; name: string; icon: string; desc: string }
export const CATEGORY_GROUPS: CategoryGroup[] = [
  { slug: 'print3d', name: 'چاپ سه‌بعدی', icon: '🖨️', desc: 'رزین، پرینتر، شستشو و کیورینگ' },
  { slug: 'prosthetics', name: 'پروتز و دندان مصنوعی', icon: '🦷', desc: 'دندان مصنوعی، آکریل، موم و تجهیزات پروتز' },
  { slug: 'restorative', name: 'ترمیمی و پرکردن', icon: '✨', desc: 'کامپوزیت، گلاس آینومر، باندینگ و لایت کیور' },
  { slug: 'lab', name: 'لابراتوار و مصرفی', icon: '⚙️', desc: 'میکروموتور، اسکنر و مواد مصرفی' },
];

import type { ProductOption, ProductVariant } from './variants.ts';
import type { ProductImage } from './media/gallery.ts';

export interface Category { slug: string; name: string; icon: string; group: GroupSlug }

export interface Product {
  slug: string;
  sku: string;
  name: string;
  category: string;
  type: ProductType;
  icon: string;
  retailPrice: number;
  compareAtPrice?: number;
  minPrice?: number;
  partnerMinQty: number;
  maxPartnerDiscountPercent?: number;
  tierPrices?: Record<string, number>;
  wavelength?: string;
  /** کد ثبت ادارهٔ کل تجهیزات پزشکی (IRC) */
  irc?: string;
  inStock: boolean;
  popularity: number;
  short: string;
  description: string;
  specs: Record<string, string>;
  /** گزینه‌های انتخابی، مثل رنگ و فرم (حداکثر ۲) */
  options?: ProductOption[];
  variants?: ProductVariant[];
  /** عکس‌ها به ترتیب نمایش (بدون عکس ← آیکون) */
  images?: ProductImage[];
}

export const CATEGORIES: Category[] = [
  { slug: 'model-resin', name: 'رزین مدل', icon: '🧪', group: 'print3d' },
  { slug: 'clinical-resin', name: 'رزین کلینیکی', icon: '💉', group: 'print3d' },
  { slug: 'printers', name: 'پرینتر دندانی', icon: '🖨️', group: 'print3d' },
  { slug: 'post-processing', name: 'شستشو و کیورینگ', icon: '💡', group: 'print3d' },
  { slug: 'denture-teeth', name: 'دندان مصنوعی', icon: '🦷', group: 'prosthetics' },
  { slug: 'denture-materials', name: 'آکریل و مواد پروتز', icon: '🧴', group: 'prosthetics' },
  { slug: 'prosthetic-equipment', name: 'تجهیزات پروتز', icon: '🔥', group: 'prosthetics' },
  { slug: 'composites', name: 'کامپوزیت و مواد پرکردن', icon: '✨', group: 'restorative' },
  { slug: 'bonding', name: 'باندینگ، اچ و لاینر', icon: '💧', group: 'restorative' },
  { slug: 'restorative-equipment', name: 'تجهیزات ترمیمی', icon: '🔦', group: 'restorative' },
  { slug: 'lab-equipment', name: 'تجهیزات لابراتوار', icon: '⚙️', group: 'lab' },
  { slug: 'consumables', name: 'مواد مصرفی', icon: '🧻', group: 'lab' },
];

export const getCategory = (slug?: string) => CATEGORIES.find((c) => c.slug === slug);
export const getGroup = (slug?: string) => CATEGORY_GROUPS.find((g) => g.slug === slug);
export const categoriesOf = (group: GroupSlug) => CATEGORIES.filter((c) => c.group === group);
