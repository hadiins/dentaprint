/** ارزیابی روزانهٔ سطح همکاران — با cron سرور فراخوانی شود:  curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/evaluate-tiers */
import { NextResponse } from 'next/server';
import { evaluateAllPartners } from '@/lib/server/tier-eval';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await evaluateAllPartners());
}
