/**
 * مدارک همکاران (خالص و قابل تست)
 * - همکار از حساب خودش بارگذاری می‌کند؛ فقط خودش و مدیر به فایل دسترسی دارند
 * - تأیید «پروانه» یا «کد اقتصادی» ← سطح تأیید همکار خودکار «تأیید با مدرک» می‌شود (سطوح نیازمند مدرک باز می‌شوند)
 */
import type { PartnerStatus, VerificationLevel } from '../auth/types.ts';

export type DocKind = 'LICENSE' | 'ECONOMIC_CODE' | 'NATIONAL_ID' | 'WORKSPACE_PHOTO' | 'SAMPLE_WORK' | 'OTHER';
export type DocStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type DocFileKind = 'pdf' | 'jpeg' | 'png' | 'webp';

export const DOC_KINDS: { id: DocKind; label: string; hint: string; grantsDocuments: boolean }[] = [
  { id: 'LICENSE', label: 'پروانهٔ فعالیت / مجوز لابراتوار', hint: 'تصویر یا PDF پروانهٔ معتبر', grantsDocuments: true },
  { id: 'ECONOMIC_CODE', label: 'کد اقتصادی / گواهی ارزش افزوده', hint: 'برای صدور فاکتور رسمی', grantsDocuments: true },
  { id: 'NATIONAL_ID', label: 'کارت ملی مسئول', hint: 'برای تأیید هویت (بدون پروانه هم کافی است)', grantsDocuments: false },
  { id: 'WORKSPACE_PHOTO', label: 'عکس محل کار / تجهیزات', hint: 'برای لابراتوارهای بدون پروانه', grantsDocuments: false },
  { id: 'SAMPLE_WORK', label: 'نمونه کار', hint: 'اختیاری', grantsDocuments: false },
  { id: 'OTHER', label: 'سایر مدارک', hint: 'معرفی‌نامه، قرارداد اجاره و ...', grantsDocuments: false },
];
export const DOC_KIND_LABEL = Object.fromEntries(DOC_KINDS.map((k) => [k.id, k.label])) as Record<DocKind, string>;
export const DOC_STATUS_LABEL: Record<DocStatus, string> = { PENDING: 'در انتظار بررسی', ACCEPTED: 'تأییدشده', REJECTED: 'ردشده' };
export const isDocKind = (v: unknown): v is DocKind => DOC_KINDS.some((k) => k.id === v);

export const DOC_LIMITS = { maxBytes: 10 * 1024 * 1024, maxDocsPerPartner: 15 };

export function sniffDoc(b: Uint8Array): DocFileKind | null {
  if (b.length < 8) return null;
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'pdf'; // %PDF-
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'webp';
  return null;
}

export type DocCheck = { ok: true; fileKind: DocFileKind } | { ok: false; error: string };
export function checkDocUpload(name: string, bytes: Uint8Array): DocCheck {
  if (bytes.length === 0) return { ok: false, error: `«${name}» خالی است.` };
  if (bytes.length > DOC_LIMITS.maxBytes) return { ok: false, error: `حجم «${name}» بیشتر از ۱۰ مگابایت است.` };
  const fileKind = sniffDoc(bytes);
  if (!fileKind) return { ok: false, error: `«${name}» باید PDF یا عکس (JPG، PNG، WebP) باشد.` };
  return { ok: true, fileKind };
}

export function docKey(partnerId: string, random: string, ext: 'pdf' | 'jpg') {
  const id = partnerId.replace(/[^a-zA-Z0-9_-]/g, ''), r = random.replace(/[^a-zA-Z0-9]/g, '');
  if (!id || r.length < 16) throw new Error('شناسهٔ نامعتبر برای کلید مدرک');
  return `partners/${id}/${r}.${ext}`;
}
const DOC_KEY_RE = /^partners\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9]{16,}\.(pdf|jpg)$/;
export const isSafeDocKey = (k: string) => DOC_KEY_RE.test(k);

/** آیا همکار با این وضعیت می‌تواند مدرک بارگذاری کند؟ */
export function canUploadDoc(status: PartnerStatus, currentCount: number): string | null {
  if (status === 'REJECTED' || status === 'SUSPENDED') return 'حساب همکاری شما فعال نیست؛ برای ارسال مدرک با پشتیبانی تماس بگیرید.';
  if (currentCount >= DOC_LIMITS.maxDocsPerPartner) return `حداکثر ${DOC_LIMITS.maxDocsPerPartner} مدرک قابل بارگذاری است.`;
  return null;
}

/** همکار فقط مدرکی را که هنوز بررسی نشده می‌تواند حذف کند */
export const canDeleteDoc = (s: DocStatus) => s === 'PENDING';

/**
 * سطح تأیید پس از بررسی مدارک:
 *  - اگر پروانه یا کد اقتصادی تأییدشده وجود دارد ← DOCUMENTS
 *  - اگر قبلاً DOCUMENTS بود ولی دیگر مدرک تأییدشده‌ای نیست (مثلاً رد شد) ← BASIC
 *  - در غیر این صورت بدون تغییر (BASIC فقط با تصمیم مدیر داده می‌شود)
 */
export function verificationAfterReview(current: VerificationLevel, docs: { kind: DocKind; status: DocStatus }[]): VerificationLevel {
  const granting = new Set(DOC_KINDS.filter((k) => k.grantsDocuments).map((k) => k.id));
  const has = docs.some((d) => d.status === 'ACCEPTED' && granting.has(d.kind));
  if (has) return 'DOCUMENTS';
  if (current === 'DOCUMENTS') return 'BASIC';
  return current;
}

/** نام فایل دانلود امن (بدون کاراکترهای خطرناک هدر) */
export function downloadName(kind: DocKind, ext: string, original?: string | null) {
  const base = (original ?? '').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || kind.toLowerCase();
  return `${base}.${ext}`;
}
