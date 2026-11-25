'use client';
import Link from 'next/link';
import { useCommerce, usePriceView } from './Providers';

/**
 * - همکار واردشده: نشان سطح خودش (قابل تغییر نیست)
 * - حالت نمایشی (DEMO_ALLOW_TIER_PREVIEW): انتخاب آزاد نوع قیمت
 * - بقیه: دعوت به ورود همکاران
 */
export default function PriceSwitch() {
  const { view, setView, fromAccount, previewAllowed } = usePriceView();
  const { active } = useCommerce();
  if (fromAccount) {
    const t = active.find((x) => x.id === view);
    return <span className="tier-badge">{t?.icon} قیمت همکار {t?.name} شما فعال است</span>;
  }
  if (!previewAllowed) return <Link href="/login" className="tier-badge muted">همکار هستید؟ برای دیدن قیمت همکار وارد شوید ←</Link>;
  return (
    <div className="seg" role="group" aria-label="نمایش قیمت (نمایشی)">
      <button className={view === 'retail' ? 'on' : ''} onClick={() => setView('retail')}>مصرف‌کننده</button>
      {active.map((t) => (
        <button key={t.id} className={view === t.id ? 'on' : ''} onClick={() => setView(t.id)}>{t.icon} {t.name}</button>
      ))}
    </div>
  );
}
