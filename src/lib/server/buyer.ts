import type { Buyer } from '../pricing';
import type { AuthUser } from '../auth/types';
import { findTier, type CommerceSettings } from '../commerce-config';

/** خریدار از روی حساب کاربر: همکار تأییدشده با سطح فعال ← قیمت همکار؛ در غیر این صورت مصرف‌کننده */
export function buyerForUser(user: AuthUser | null, settings: CommerceSettings): Buyer {
  const p = user?.partner;
  if (!p || p.status !== 'APPROVED' || !p.tierSlug) return { kind: 'retail' };
  const tier = findTier(settings, p.tierSlug);
  return tier ? { kind: 'partner', tier, status: 'APPROVED' } : { kind: 'retail' };
}
