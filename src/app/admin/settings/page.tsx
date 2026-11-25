import type { Metadata } from 'next';
import SettingsEditor from '@/components/admin/SettingsEditor';

export const metadata: Metadata = { title: 'سطوح و قیمت' };

export default function AdminSettingsPage() {
  return (
    <>
      <h1 style={{ fontSize: 'clamp(26px,3.5vw,40px)', marginBottom: 8 }}>سطوح همکاری، تخفیف پلکانی و ارسال</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>تغییرات بلافاصله روی قیمت‌های سایت اعمال می‌شود. سطوحی که حذف شوند پاک نمی‌شوند، فقط غیرفعال می‌شوند.</p>
      <SettingsEditor />
    </>
  );
}
