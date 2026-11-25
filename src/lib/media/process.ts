/**
 * پردازش عکس با sharp:
 *  - چرخش خودکار بر اساس EXIF و حذف متادیتا (موقعیت GPS گوشی و ...)
 *  - کوچک کردن تا ۱۶۰۰ پیکسل و تبدیل به WebP با کیفیت ۸۲
 *  - اندازه‌های واکنش‌گرا را next/image در زمان نمایش می‌سازد
 */
import { MEDIA_LIMITS } from './validate.ts';

export interface ProcessedImage { data: Uint8Array; width: number; height: number; contentType: 'image/webp' }

export async function processImage(input: Uint8Array): Promise<ProcessedImage> {
  const sharp = (await import('sharp')).default;
  const img = sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0, h = meta.height ?? 0;
  const [ow, oh] = meta.orientation && meta.orientation >= 5 ? [h, w] : [w, h];
  if (Math.min(ow, oh) < MEDIA_LIMITS.minDimension) throw new Error(`ابعاد عکس کوچک است (حداقل ${MEDIA_LIMITS.minDimension} پیکسل).`);
  const { data, info } = await img
    .resize({ width: MEDIA_LIMITS.outputMaxDimension, height: MEDIA_LIMITS.outputMaxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height, contentType: 'image/webp' };
}

/**
 * عکس مدرک (پروانه، کارت ملی، محل کار): چرخش خودکار، حذف متادیتا (از جمله GPS)،
 * کوچک‌سازی تا ۲۴۰۰ پیکسل با کیفیت بالا برای خوانایی متن، خروجی JPEG
 */
export async function processDocImage(input: Uint8Array): Promise<{ data: Uint8Array; contentType: 'image/jpeg' }> {
  const sharp = (await import('sharp')).default;
  const data = await sharp(input, { failOn: 'error', limitInputPixels: 60_000_000 }).rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { data: new Uint8Array(data), contentType: 'image/jpeg' };
}
