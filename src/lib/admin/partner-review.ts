/** قوانین بررسی و تأیید همکاران توسط مدیر */
import type { PartnerStatus, VerificationLevel } from '../auth/types.ts';
import type { TierConfig } from '../commerce-config.ts';

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = { PENDING: 'در انتظار بررسی', APPROVED: 'تأییدشده', REJECTED: 'ردشده', SUSPENDED: 'تعلیق‌شده' };
export const VERIFICATION_LABEL: Record<VerificationLevel, string> = { NONE: 'تأییدنشده', BASIC: 'تأیید هویت و محل کار (بدون پروانه)', DOCUMENTS: 'تأیید با پروانه / کد اقتصادی' };

export interface PartnerDecision {
  status: PartnerStatus;
  verification: VerificationLevel;
  tierSlug: string | null;
  tierLocked: boolean;
}

export function validatePartnerDecision(d: PartnerDecision, tiers: TierConfig[]): string[] {
  const e: string[] = [];
  if (d.status === 'APPROVED') {
    if (d.verification === 'NONE') e.push('برای تأیید همکار، حداقل «تأیید هویت و محل کار» لازم است.');
    if (!d.tierSlug) e.push('سطح همکاری را انتخاب کنید.');
    const t = tiers.find((x) => x.id === d.tierSlug);
    if (d.tierSlug && !t) e.push('سطح انتخاب‌شده وجود ندارد یا غیرفعال است.');
    if (t?.requiresDocuments && d.verification !== 'DOCUMENTS') e.push(`سطح «${t.name}» فقط برای همکاران دارای پروانه یا کد اقتصادی تأییدشده است.`);
  }
  return e;
}

/** رویداد پیامکی پس از تصمیم مدیر */
export function partnerNotifyEvent(prev: PartnerStatus, next: PartnerStatus, prevTier: string | null, nextTier: string | null) {
  if (next === 'APPROVED' && prev !== 'APPROVED') return 'partner_approved' as const;
  if (next === 'APPROVED' && prevTier !== nextTier && nextTier) return 'partner_tier_changed' as const;
  if (next === 'REJECTED' && prev !== 'REJECTED') return 'partner_rejected' as const;
  return null;
}
