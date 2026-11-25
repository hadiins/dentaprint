'use client';
import { useState, type FormEvent } from 'react';
import { normalizeIranMobile } from '@/lib/format';
import { useToast } from '../Providers';

export default function PartnerForm({ freeTiers, docTierName }: { freeTiers: string; docTierName?: string }) {
  const toast = useToast();
  const [err, setErr] = useState('');
  const [hasLicense, setHasLicense] = useState<'yes' | 'no'>('no');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    if (get('orgName').length < 3) return setErr('نام لابراتوار یا کلینیک را وارد کنید.');
    if (get('fullName').length < 3) return setErr('نام مسئول را وارد کنید.');
    if (!normalizeIranMobile(get('phone'))) return setErr('شمارهٔ موبایل معتبر نیست (مثال: 09121234567).');
    if (get('city').length < 2) return setErr('شهر را وارد کنید.');
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/partner-applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: get('orgName'), fullName: get('fullName'), phone: get('phone'), city: get('city'),
          businessType: get('businessType'), hasLicense: hasLicense === 'yes',
          licenseNumber: get('licenseNumber') || undefined, economicCode: get('economicCode') || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت درخواست');
      (e.target as HTMLFormElement).reset(); setHasLicense('no');
      toast('✓ درخواست همکاری ثبت شد؛ به‌زودی تماس می‌گیریم');
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'خطا در ثبت درخواست');
    } finally { setBusy(false); }
  }

  return (
    <form className="bform rv" onSubmit={onSubmit} noValidate>
      <h3>درخواست حساب همکاری</h3>
      <p>کمتر از ۲ دقیقه؛ کارشناسان ما ظرف ۲۴ ساعت کاری تماس می‌گیرند.</p>
      <input name="orgName" placeholder="نام لابراتوار / کلینیک / شرکت" />
      <div className="two">
        <input name="fullName" placeholder="نام مسئول" />
        <input name="phone" placeholder="موبایل (۰۹۱۲...)" inputMode="numeric" />
      </div>
      <div className="two">
        <select name="businessType" aria-label="نوع کسب‌وکار" defaultValue="LAB">
          <option value="LAB">لابراتوار دندانسازی</option><option value="CLINIC">کلینیک / مطب</option>
          <option value="RESELLER">نمایندهٔ فروش</option><option value="EDUCATION">مرکز آموزشی</option><option value="OTHER">سایر</option>
        </select>
        <input name="city" placeholder="شهر" />
      </div>
      <div className="verify">
        <span>پروانهٔ فعالیت یا کد اقتصادی دارید؟</span>
        <div className="radio">
          <label><input type="radio" name="lic" checked={hasLicense === 'yes'} onChange={() => setHasLicense('yes')} /> بله دارم</label>
          <label><input type="radio" name="lic" checked={hasLicense === 'no'} onChange={() => setHasLicense('no')} /> خیر، ندارم</label>
        </div>
        {hasLicense === 'yes'
          ? <div className="two"><input name="licenseNumber" placeholder="شمارهٔ پروانه (اختیاری)" /><input name="economicCode" placeholder="کد اقتصادی (اختیاری)" /></div>
          : <small>مشکلی نیست؛ با تماس کارشناس و تأیید هویت و محل کار، حساب شما فعال می‌شود. سطوح {freeTiers} بدون پروانه در دسترس‌اند{docTierName ? `؛ برای سطح ${docTierName} بعداً می‌توانید مدرک ارائه دهید` : ''}.</small>}
      </div>
      <div className="err" role="alert">{err}</div>
      <button className="btn btn-main" disabled={busy}>{busy ? 'در حال ارسال…' : 'ارسال درخواست'} <span className="arr">←</span></button>
    </form>
  );
}
