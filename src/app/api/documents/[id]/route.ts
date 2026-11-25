/**
 * دانلود/مشاهدهٔ مدرک — فقط مدیر یا صاحب مدرک
 * هدرهای امنیتی: nosniff، sandbox (اجرای اسکریپت داخل PDF/فایل غیرممکن)، no-store (بدون کش در مرورگر/پروکسی)
 */
import { getCurrentUser } from '@/lib/auth/server';
import { docForDownload } from '@/lib/partners/data';
import { downloadName, isSafeDocKey, type DocKind } from '@/lib/partners/documents';
import { getPrivateStorage } from '@/lib/media/storage';

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !process.env.DATABASE_URL) return notFound();
  const doc = await docForDownload((await ctx.params).id);
  // برای کاربر غیرمجاز همان 404 (نه 403) تا وجود مدرک هم فاش نشود
  if (!doc || !(user.role === 'ADMIN' || doc.partner.userId === user.id) || !isSafeDocKey(doc.fileKey)) return notFound();
  const f = await getPrivateStorage().get!(doc.fileKey);
  if (!f) return notFound();
  const isPdf = doc.contentType === 'application/pdf';
  const inline = new URL(req.url).searchParams.get('download') !== '1' && !isPdf;
  const name = downloadName(doc.kind as DocKind, isPdf ? 'pdf' : 'jpg', doc.originalName);
  return new Response(f.data, {
    headers: {
      'Content-Type': isPdf ? 'application/pdf' : 'image/jpeg',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="document.${isPdf ? 'pdf' : 'jpg'}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox", 'Referrer-Policy': 'no-referrer',
    },
  });
}
