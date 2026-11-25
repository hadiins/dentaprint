/**
 * اعتبارسنجی فایل‌های بارگذاری‌شده.
 * نوع فایل از «امضای بایت‌های ابتدایی» تشخیص داده می‌شود، نه از پسوند یا Content-Type مرورگر
 * (جلوگیری از بارگذاری فایل مخرب با پسوند .jpg).
 */
export type ImageKind = 'jpeg' | 'png' | 'webp' | 'avif';

export const MEDIA_LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  maxImagesPerProduct: 12,
  maxFilesPerRequest: 12,
  minDimension: 300,
  outputMaxDimension: 1600,
};

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));

export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (ascii(b, 4, 4) === 'ftyp' && ['avif', 'avis'].includes(ascii(b, 8, 4))) return 'avif';
  return null;
}

export type FileCheck = { ok: true; kind: ImageKind } | { ok: false; error: string };

export function checkUpload(name: string, bytes: Uint8Array): FileCheck {
  if (bytes.length === 0) return { ok: false, error: `«${name}» خالی است.` };
  if (bytes.length > MEDIA_LIMITS.maxBytes) return { ok: false, error: `حجم «${name}» بیشتر از ${MEDIA_LIMITS.maxBytes / 1024 / 1024} مگابایت است.` };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: `«${name}» عکس معتبر نیست (فقط JPG، PNG، WebP و AVIF).` };
  return { ok: true, kind };
}

/** کلید ذخیره‌سازی: products/{productId}/{random}.webp — فقط کاراکترهای امن */
export function imageKey(productId: string, random: string, ext = 'webp') {
  const safeId = productId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeRand = random.replace(/[^a-zA-Z0-9]/g, '');
  if (!safeId || safeRand.length < 8) throw new Error('شناسهٔ نامعتبر برای کلید عکس');
  return `products/${safeId}/${safeRand}.${ext}`;
}

const KEY_RE = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(webp|jpg|jpeg|png|avif|pdf)$/;
export const isSafeKey = (key: string) => KEY_RE.test(key) && !key.includes('..') && key.length <= 200;

export const CONTENT_TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif', pdf: 'application/pdf' };
export const contentTypeOf = (key: string) => CONTENT_TYPES[key.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream';
