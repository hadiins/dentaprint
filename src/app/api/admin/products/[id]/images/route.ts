/**
 * POST  بارگذاری عکس(ها) برای محصول — multipart، فیلد files
 * PUT   مرتب‌سازی — { order: string[] }
 * GET   فهرست عکس‌ها
 */
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/server/admin-auth';
import { checkUpload, imageKey, MEDIA_LIMITS } from '@/lib/media/validate';
import { processImage } from '@/lib/media/process';
import { getMediaStorage } from '@/lib/media/storage';
import { defaultAlt } from '@/lib/media/gallery';
import { addProductImage, countProductImages, listProductImages, productExists, reorderProductImages } from '@/lib/admin/data';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };
const deny = () => NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
const noDb = () => NextResponse.json({ error: 'برای عکس محصولات پایگاه داده لازم است.' }, { status: 503 });

async function list(productId: string) {
  const storage = getMediaStorage();
  return (await listProductImages(productId)).map((i) => ({ id: i.id, url: storage.url(i.key), alt: i.alt, optionValue: i.optionValue, width: i.width, height: i.height }));
}

export async function GET(req: Request, ctx: Ctx) {
  if (!(await isAdmin(req))) return deny();
  if (!process.env.DATABASE_URL) return noDb();
  return NextResponse.json({ images: await list((await ctx.params).id) });
}

export async function POST(req: Request, ctx: Ctx) {
  if (!(await isAdmin(req))) return deny();
  if (!process.env.DATABASE_URL) return noDb();
  const { id } = await ctx.params;
  if (!(await productExists(id))) return NextResponse.json({ error: 'محصول پیدا نشد.' }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll('files') ?? []).filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  if (files.length === 0) return NextResponse.json({ error: 'فایلی انتخاب نشده است.' }, { status: 400 });
  if (files.length > MEDIA_LIMITS.maxFilesPerRequest) return NextResponse.json({ error: `حداکثر ${MEDIA_LIMITS.maxFilesPerRequest} فایل در هر بار.` }, { status: 400 });
  const existing = await countProductImages(id);
  if (existing + files.length > MEDIA_LIMITS.maxImagesPerProduct) {
    return NextResponse.json({ error: `هر محصول حداکثر ${MEDIA_LIMITS.maxImagesPerProduct} عکس دارد (فعلاً ${existing} عکس).` }, { status: 400 });
  }
  const product = await prisma.product.findUniqueOrThrow({ where: { id }, select: { name: true } });
  const storage = getMediaStorage();
  const errors: string[] = [];
  let n = existing;
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const c = checkUpload(f.name, bytes);
    if (!c.ok) { errors.push(c.error); continue; }
    try {
      const out = await processImage(bytes);
      const key = imageKey(id, randomBytes(12).toString('hex'));
      await storage.put(key, out.data, out.contentType);
      await addProductImage({ productId: id, key, alt: defaultAlt(product.name, null, n++), width: out.width, height: out.height });
    } catch (e) {
      errors.push(`«${f.name}»: ${e instanceof Error ? e.message : 'پردازش ناموفق'}`);
    }
  }
  revalidatePath('/', 'layout');
  return NextResponse.json({ images: await list(id), errors }, { status: errors.length && errors.length === files.length ? 422 : 200 });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!(await isAdmin(req))) return deny();
  if (!process.env.DATABASE_URL) return noDb();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { order?: unknown } | null;
  if (!Array.isArray(body?.order) || !body.order.every((x) => typeof x === 'string')) return NextResponse.json({ error: 'ترتیب نامعتبر' }, { status: 400 });
  await reorderProductImages(id, body.order as string[]);
  revalidatePath('/', 'layout');
  return NextResponse.json({ images: await list(id) });
}
