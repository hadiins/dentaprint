import type { Tier, VerificationLevel } from './pricing.ts';

export interface TierProgress<T extends Tier = Tier> {
  current: T | null;
  next: T | null;
  /** مبلغ باقی‌مانده تا سطح بعد (تومان) */
  remaining: number;
  /** درصد پیشرفت از سطح فعلی تا سطح بعد (۰ تا ۱۰۰) */
  percent: number;
  /** سطح بعد نیاز به مدرک دارد و همکار هنوز مدرک تأییدشده ندارد */
  nextNeedsDocs: boolean;
}

export function tierProgress<T extends Tier>(current: T | null, spend: number, verification: VerificationLevel, tiers: T[]): TierProgress<T> {
  const sorted = [...tiers].sort((a, b) => a.rank - b.rank);
  const next = sorted.find((t) => t.rank > (current?.rank ?? 0)) ?? null;
  if (!next) return { current, next: null, remaining: 0, percent: 100, nextNeedsDocs: false };
  const from = current?.minSpend ?? 0;
  const span = Math.max(1, next.minSpend - from);
  const percent = Math.max(0, Math.min(100, Math.round(((spend - from) / span) * 100)));
  return {
    current, next, remaining: Math.max(0, next.minSpend - spend), percent,
    nextNeedsDocs: next.requiresDocuments && verification !== 'DOCUMENTS',
  };
}
