/** منطق گالری محصول (خالص، قابل استفاده در مرورگر) */
export interface ProductImage { id?: string; url: string; alt: string; width?: number | null; height?: number | null; optionValue?: string | null }

/**
 * ترتیب نمایش عکس‌ها با توجه به رنگ انتخاب‌شده:
 * ابتدا عکس‌های همان رنگ، سپس عکس‌های عمومی (بدون رنگ). عکس رنگ‌های دیگر پنهان می‌شوند
 * تا مشتری رنگ اشتباه را نبیند. اگر رنگی انتخاب نشده، همهٔ عکس‌ها به ترتیب اصلی.
 */
export function imagesForSelection(images: ProductImage[], selectedValue: string | null | undefined): ProductImage[] {
  if (!selectedValue) return images;
  const own = images.filter((i) => i.optionValue === selectedValue);
  const general = images.filter((i) => !i.optionValue);
  const out = [...own, ...general];
  return out.length ? out : images;
}

/** عکس اصلی برای کارت محصول: اولین عکس عمومی، وگرنه اولین عکس */
export const primaryImage = (images?: ProductImage[]) => images?.find((i) => !i.optionValue) ?? images?.[0];

/** جابه‌جایی یک عکس در فهرست (برای مرتب‌سازی در پنل) */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

/** متن جایگزین پیش‌فرض برای سئو و دسترس‌پذیری */
export const defaultAlt = (productName: string, optionValue?: string | null, index = 0) =>
  [productName, optionValue ? `رنگ ${optionValue}` : '', index > 0 ? `تصویر ${index + 1}` : ''].filter(Boolean).join(' — ');
