/** POST: بارگذاری مدرک توسط همکار (multipart: kind, file) */
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { canUploadDoc, checkDocUpload, docKey, isDocKind } from '@/lib/partners/documents';
import { countDocs, createDoc, partnerOfUser } from '@/lib/partners/data';
import { getPrivateStorage } from '@/lib/media/storage';
import { processDocImage } from '@/lib/media/process';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ابتدا وارد شوید.' }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'بارگذاری مدرک به پایگاه داده نیاز دارد.' }, { status: 503 });
  const partner = await partnerOfUser(user.id);
  if (!partner) return NextResponse.json({ error: 'ابتدا درخواست همکاری ثبت کنید.' }, { status: 403 });
  const block = canUploadDoc(partner.status, await countDocs(partner.id));
  if (block) return NextResponse.json({ error: block }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const kind = form?.get('kind'), file = form?.get('file');
  if (!isDocKind(kind)) return NextResponse.json({ error: 'نوع مدرک را انتخاب کنید.' }, { status: 422 });
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) return NextResponse.json({ error: 'فایلی انتخاب نشده است.' }, { status: 422 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const c = checkDocUpload(file.name, bytes);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 422 });

  try {
    // عکس‌ها دوباره کدگذاری می‌شوند (حذف GPS و هر محتوای پنهان)؛ PDF همان‌طور ذخیره و فقط به‌صورت دانلود ایمن تحویل می‌شود
    const out = c.fileKind === 'pdf' ? { data: bytes, contentType: 'application/pdf' } : await processDocImage(bytes);
    const key = docKey(partner.id, randomBytes(16).toString('hex'), c.fileKind === 'pdf' ? 'pdf' : 'jpg');
    await getPrivateStorage().put(key, out.data, out.contentType);
    const doc = await createDoc({ partnerId: partner.id, kind, fileKey: key, originalName: file.name.slice(0, 120), contentType: out.contentType, size: out.data.length });
    return NextResponse.json({ ok: true, id: doc.id }, { status: 201 });
  } catch (e) {
    console.error('[doc-upload]', e);
    return NextResponse.json({ error: 'پردازش فایل ناموفق بود؛ فایل دیگری امتحان کنید.' }, { status: 422 });
  }
}
