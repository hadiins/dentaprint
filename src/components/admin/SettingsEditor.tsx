'use client';
import { useEffect, useState } from 'react';
import type { CommerceSettings, TierConfig } from '@/lib/commerce-config';
import { fa } from '@/lib/format';
import { useToast } from '../Providers';

const KEY = 'dp_admin_token';
const num = (v: string) => Number(v.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[^\d]/g, '') || 0);

export default function SettingsEditor() {
  const toast = useToast();
  const [token, setToken] = useState('');
  const [s, setS] = useState<CommerceSettings | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load(t = token) {
    setBusy(true); setErrors([]);
    const r = await fetch('/api/admin/commerce-settings', { headers: { 'x-admin-token': t } });
    setBusy(false);
    if (!r.ok) { setS(null); if (t) setErrors(['دسترسی ندارید: با حساب مدیر وارد شوید یا توکن مدیریت درست را وارد کنید.']); return; }
    if (t) sessionStorage.setItem(KEY, t);
    setS(await r.json());
  }
  // مدیر واردشده بدون توکن دسترسی دارد؛ در غیر این صورت توکن ذخیره‌شده امتحان می‌شود
  useEffect(() => { const t = sessionStorage.getItem(KEY) ?? ''; setToken(t); load(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!s) return;
    setBusy(true); setErrors([]);
    const r = await fetch('/api/admin/commerce-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify(s) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) { setErrors(d.errors ?? [d.error ?? 'خطا در ذخیره']); return; }
    setS(d); toast('✓ تنظیمات ذخیره شد');
  }

  const setTier = (i: number, patch: Partial<TierConfig>) => s && setS({ ...s, tiers: s.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const addTier = () => s && setS({ ...s, tiers: [...s.tiers, { id: `tier${s.tiers.length + 1}`, name: 'سطح جدید', icon: '💎', rank: Math.max(0, ...s.tiers.map((t) => t.rank)) + 1, discountPercent: 0, minSpend: 0, requiresDocuments: false, freeShipping: false, isActive: true }] });

  if (!s) return (
    <div className="bform" style={{ position: 'static', maxWidth: 460 }}>
      <h3>ورود مدیر</h3>
      <p>با شماره‌ای که در ADMIN_PHONES تعریف شده <a href="/login?next=/admin/settings" style={{ color: 'var(--c1)' }}>وارد شوید</a>، یا توکن مدیریت (ADMIN_TOKEN) را وارد کنید.</p>
      <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN" dir="ltr" />
      {errors.map((e) => <div className="err" key={e}>{e}</div>)}
      <button className="btn btn-main" disabled={busy || !token} onClick={() => load()}>ورود <span className="arr">←</span></button>
    </div>
  );

  return (
    <div className="admin">
      <section className="admin-card">
        <div className="admin-head"><h3>سطوح همکاری</h3><button className="btn btn-glass" onClick={addTier}>+ افزودن سطح</button></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>فعال</th><th>آیکون</th><th>نام</th><th>شناسه</th><th>رتبه</th><th>تخفیف ٪</th><th>حد خرید (تومان)</th><th>نیاز به مدرک</th><th>ارسال رایگان</th></tr></thead>
            <tbody>{s.tiers.map((t, i) => (
              <tr key={i} style={{ opacity: t.isActive ? 1 : 0.5 }}>
                <td><input type="checkbox" checked={t.isActive} onChange={(e) => setTier(i, { isActive: e.target.checked })} /></td>
                <td><input value={t.icon} onChange={(e) => setTier(i, { icon: e.target.value })} style={{ width: 52 }} /></td>
                <td><input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} /></td>
                <td><input value={t.id} onChange={(e) => setTier(i, { id: e.target.value.toLowerCase() })} dir="ltr" style={{ width: 100 }} /></td>
                <td><input value={fa(t.rank)} onChange={(e) => setTier(i, { rank: num(e.target.value) })} style={{ width: 56 }} /></td>
                <td><input value={fa(t.discountPercent)} onChange={(e) => setTier(i, { discountPercent: num(e.target.value) })} style={{ width: 64 }} /></td>
                <td><input value={fa(t.minSpend)} onChange={(e) => setTier(i, { minSpend: num(e.target.value) })} style={{ width: 160 }} /></td>
                <td><input type="checkbox" checked={t.requiresDocuments} onChange={(e) => setTier(i, { requiresDocuments: e.target.checked })} /></td>
                <td><input type="checkbox" checked={t.freeShipping} onChange={(e) => setTier(i, { freeShipping: e.target.checked })} /></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-head"><h3>تخفیف پلکانی تعداد (همکاران)</h3>
          <button className="btn btn-glass" onClick={() => setS({ ...s, quantityBreaks: [...s.quantityBreaks, { minQty: (s.quantityBreaks.at(-1)?.minQty ?? 5) * 2, extraDiscountPercent: (s.quantityBreaks.at(-1)?.extraDiscountPercent ?? 0) + 5 }] })}>+ افزودن پله</button></div>
        {s.quantityBreaks.map((b, i) => (
          <div className="admin-row" key={i}>
            <span>از</span><input value={fa(b.minQty)} onChange={(e) => setS({ ...s, quantityBreaks: s.quantityBreaks.map((x, j) => (j === i ? { ...x, minQty: num(e.target.value) } : x)) })} style={{ width: 80 }} />
            <span>عدد به بالا،</span><input value={fa(b.extraDiscountPercent)} onChange={(e) => setS({ ...s, quantityBreaks: s.quantityBreaks.map((x, j) => (j === i ? { ...x, extraDiscountPercent: num(e.target.value) } : x)) })} style={{ width: 64 }} />
            <span>٪ تخفیف اضافه</span>
            <button className="icon-btn" aria-label="حذف پله" onClick={() => setS({ ...s, quantityBreaks: s.quantityBreaks.filter((_, j) => j !== i) })}>✕</button>
          </div>))}
      </section>

      <section className="admin-card">
        <h3>ارسال و قوانین ارزیابی</h3>
        <div className="admin-row"><span>هزینهٔ ارسال</span><input value={fa(s.shipping.flatCost)} onChange={(e) => setS({ ...s, shipping: { ...s.shipping, flatCost: num(e.target.value) } })} /><span>تومان</span></div>
        <div className="admin-row"><span>ارسال رایگان بالای</span><input value={fa(s.shipping.freeOver)} onChange={(e) => setS({ ...s, shipping: { ...s.shipping, freeOver: num(e.target.value) } })} /><span>تومان</span></div>
        <div className="admin-row"><span>بازهٔ ارزیابی خرید برای سطح‌بندی</span><input value={fa(s.evaluationWindowDays)} onChange={(e) => setS({ ...s, evaluationWindowDays: num(e.target.value) })} style={{ width: 80 }} /><span>روز</span></div>
        <label className="admin-row"><input type="checkbox" checked={s.autoDowngrade} onChange={(e) => setS({ ...s, autoDowngrade: e.target.checked })} /><span>تنزل خودکار سطح وقتی خرید همکار کم شود</span></label>
      </section>

      {errors.length > 0 && <div className="hint" role="alert"><b>این موارد را اصلاح کنید:</b><ul style={{ margin: '6px 18px 0' }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
      <div className="buy-row">
        <button className="btn btn-main" disabled={busy} onClick={save}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات'} <span className="arr">←</span></button>
        <button className="btn btn-glass" disabled={busy} onClick={() => load()}>بازگردانی تغییرات</button>
      </div>
    </div>
  );
}
