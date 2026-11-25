/** DELETE: حذف مدرک بررسی‌نشده توسط خود همکار */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { deleteOwnPendingDoc } from '@/lib/partners/data';
import { getPrivateStorage } from '@/lib/media/storage';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ابتدا وارد شوید.' }, { status: 401 });
  const r = await deleteOwnPendingDoc(user.id, (await ctx.params).id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  await getPrivateStorage().delete(r.key).catch((e) => console.error('[doc-delete]', e));
  return NextResponse.json({ ok: true });
}
