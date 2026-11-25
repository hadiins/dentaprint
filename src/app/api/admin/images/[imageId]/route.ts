/** PATCH: متن جایگزین و رنگ عکس — DELETE: حذف عکس (رکورد و فایل) */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/server/admin-auth';
import { deleteProductImage, updateProductImage } from '@/lib/admin/data';
import { getMediaStorage } from '@/lib/media/storage';

type Ctx = { params: Promise<{ imageId: string }> };
const deny = () => NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAdmin(req))) return deny();
  const body = (await req.json().catch(() => null)) as { alt?: unknown; optionValue?: unknown } | null;
  const d: { alt?: string; optionValue?: string | null } = {};
  if (typeof body?.alt === 'string') d.alt = body.alt.trim().slice(0, 200);
  if (body && 'optionValue' in body) d.optionValue = typeof body.optionValue === 'string' && body.optionValue.trim() ? body.optionValue.trim().slice(0, 40) : null;
  try { await updateProductImage((await ctx.params).imageId, d); } catch { return NextResponse.json({ error: 'عکس پیدا نشد.' }, { status: 404 }); }
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await isAdmin(req))) return deny();
  const key = await deleteProductImage((await ctx.params).imageId);
  if (!key) return NextResponse.json({ error: 'عکس پیدا نشد.' }, { status: 404 });
  // اگر حذف فایل ناموفق باشد، رکورد حذف شده و فقط یک فایل یتیم می‌ماند (بی‌خطر)
  await getMediaStorage().delete(key).catch((e) => console.error('[media-delete]', key, e));
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
