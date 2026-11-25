import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCommerceSettings, saveCommerceSettings } from '@/lib/settings';
import { validateCommerceSettings } from '@/lib/commerce-config';
import { isAdmin } from '@/lib/server/admin-auth';

const deny = () => NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return deny();
  return NextResponse.json(await getCommerceSettings());
}

export async function PUT(req: Request) {
  if (!(await isAdmin(req))) return deny();
  const v = validateCommerceSettings(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ errors: v.errors }, { status: 422 });
  await saveCommerceSettings(v.value);
  revalidatePath('/', 'layout');
  return NextResponse.json(v.value);
}
