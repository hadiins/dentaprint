/** سرو عکس‌های ذخیره‌ساز محلی با کش طولانی (نام فایل‌ها تصادفی و تغییرناپذیرند) */
import { getMediaStorage } from '@/lib/media/storage';
import { isSafeKey } from '@/lib/media/validate';

type Ctx = { params: Promise<{ key: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const key = (await ctx.params).key.join('/');
  if (!isSafeKey(key)) return new Response('Not found', { status: 404 });
  const storage = getMediaStorage();
  if (!storage.get) return new Response('Not found', { status: 404 });
  const f = await storage.get(key);
  if (!f) return new Response('Not found', { status: 404 });
  return new Response(f.data, {
    headers: {
      'Content-Type': f.contentType, 'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'",
    },
  });
}
