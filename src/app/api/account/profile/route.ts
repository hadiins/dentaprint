import { NextResponse } from 'next/server';
import { getAuthRepo, getCurrentUser } from '@/lib/auth/server';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ابتدا وارد شوید.' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { fullName?: string } | null;
  const fullName = String(body?.fullName ?? '').trim();
  if (fullName.length < 3 || fullName.length > 80) return NextResponse.json({ error: 'نام را کامل وارد کنید.' }, { status: 422 });
  await (await getAuthRepo()).updateProfile(user.id, { fullName });
  return NextResponse.json({ ok: true });
}
