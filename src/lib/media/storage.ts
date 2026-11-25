/**
 * ذخیره‌ساز عکس‌ها — قابل تعویض مثل درگاه پرداخت و پیامک
 *   MEDIA_STORAGE="local"  ← دیسک سرور (پوشهٔ UPLOAD_DIR) و سرو از /media/...
 *   MEDIA_STORAGE="s3"     ← هر فضای ابری سازگار با S3 (آروان‌کلود، MinIO، لیارا، ...)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isSafeKey, contentTypeOf } from './validate.ts';

export interface MediaStorage {
  readonly id: string;
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  url(key: string): string;
  /** فقط ذخیره‌ساز محلی (برای سرو فایل) */
  get?(key: string): Promise<{ data: Uint8Array; contentType: string } | null>;
}

function assertKey(key: string) { if (!isSafeKey(key)) throw new Error(`کلید نامعتبر: ${key}`); }

export function createLocalStorage(dir: string, publicBase = '/media'): MediaStorage {
  const root = path.resolve(dir);
  const full = (key: string) => {
    assertKey(key);
    const p = path.resolve(root, key);
    if (!p.startsWith(root + path.sep)) throw new Error('مسیر خارج از پوشهٔ بارگذاری');
    return p;
  };
  return {
    id: 'local',
    async put(key, data) { const p = full(key); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, data); },
    async delete(key) { await fs.rm(full(key), { force: true }); },
    url: (key) => `${publicBase}/${key}`,
    async get(key) {
      try { return { data: await fs.readFile(full(key)), contentType: contentTypeOf(key) }; }
      catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
    },
  };
}

export interface S3Config { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicUrl: string; acl?: string }

export function createS3Storage(cfg: S3Config): MediaStorage {
  // SDK فقط هنگام اولین استفاده بارگذاری می‌شود (نه هنگام ساخت)
  let clientP: Promise<import('@aws-sdk/client-s3').S3Client> | null = null;
  const client = () => (clientP ??= import('@aws-sdk/client-s3').then(({ S3Client }) =>
    new S3Client({ endpoint: cfg.endpoint, region: cfg.region, forcePathStyle: true, credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } })));
  return {
    id: 's3',
    async put(key, data, contentType) {
      assertKey(key);
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      await (await client()).send(new PutObjectCommand({
        Bucket: cfg.bucket, Key: key, Body: data, ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable', ...(cfg.acl ? { ACL: cfg.acl as 'public-read' } : {}),
      }));
    },
    async delete(key) {
      assertKey(key);
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await (await client()).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    },
    url: (key) => `${cfg.publicUrl.replace(/\/$/, '')}/${key}`,
    async get(key) {
      assertKey(key);
      const { GetObjectCommand, NoSuchKey } = await import('@aws-sdk/client-s3');
      try {
        const r = await (await client()).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
        return { data: await r.Body!.transformToByteArray(), contentType: r.ContentType ?? contentTypeOf(key) };
      } catch (e) { if (e instanceof NoSuchKey) return null; throw e; }
    },
  };
}

type Env = Record<string, string | undefined>;

/**
 * ذخیره‌ساز «خصوصی» برای مدارک همکاران — هیچ آدرس عمومی ندارد و فقط از مسیر احراز هویت‌شدهٔ
 * /api/documents/[id] خوانده می‌شود.
 *   local: PRIVATE_UPLOAD_DIR (پیش‌فرض ./private-uploads — هرگز داخل public یا uploads نگذارید)
 *   s3:    S3_PRIVATE_BUCKET (باکت خصوصی، بدون ACL عمومی)
 */
export function getPrivateStorage(env: Env = process.env): MediaStorage {
  if (env.MEDIA_STORAGE === 's3') {
    const need = ['S3_ENDPOINT', 'S3_PRIVATE_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'].filter((k) => !env[k]);
    if (need.length) throw new Error(`تنظیمات فضای ابری خصوصی ناقص است: ${need.join(', ')}`);
    const s = createS3Storage({
      endpoint: env.S3_ENDPOINT!, region: env.S3_REGION || 'default', bucket: env.S3_PRIVATE_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY!, secretAccessKey: env.S3_SECRET_KEY!, publicUrl: 'private://', acl: undefined,
    });
    return { ...s, id: 's3-private', url: () => { throw new Error('ذخیره‌ساز خصوصی آدرس عمومی ندارد'); } };
  }
  const dir = path.resolve(env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), 'private-uploads'));
  const pub = path.resolve(env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
  // پوشهٔ خصوصی نباید داخل پوشهٔ عمومی (یا برعکس) باشد، وگرنه مدارک از /media قابل دسترسی می‌شوند
  const publicDir = path.resolve(process.cwd(), 'public');
  const inside = (a: string, b: string) => a === b || a.startsWith(b + path.sep);
  if (inside(dir, pub) || inside(pub, dir) || inside(dir, publicDir)) {
    throw new Error('PRIVATE_UPLOAD_DIR باید خارج از UPLOAD_DIR و پوشهٔ public باشد');
  }
  const s = createLocalStorage(dir, 'private://');
  return { ...s, id: 'local-private', url: () => { throw new Error('ذخیره‌ساز خصوصی آدرس عمومی ندارد'); } };
}

export function getMediaStorage(env: Env = process.env): MediaStorage {
  if (env.MEDIA_STORAGE === 's3') {
    const need = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'MEDIA_PUBLIC_URL'].filter((k) => !env[k]);
    if (need.length) throw new Error(`تنظیمات فضای ابری ناقص است: ${need.join(', ')}`);
    return createS3Storage({
      endpoint: env.S3_ENDPOINT!, region: env.S3_REGION || 'default', bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY!, secretAccessKey: env.S3_SECRET_KEY!, publicUrl: env.MEDIA_PUBLIC_URL!, acl: env.S3_ACL || 'public-read',
    });
  }
  return createLocalStorage(env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
}
