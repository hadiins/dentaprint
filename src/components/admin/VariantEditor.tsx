'use client';
import { useMemo, useState } from 'react';
import { generateVariants, parseValues, validateOptions, type ProductOption, type ProductVariant } from '@/lib/variants';
import { fa } from '@/lib/format';

/** ویرایشگر گزینه‌ها (رنگ/فرم) و جدول زندهٔ ترکیب‌ها */
export default function VariantEditor({ sku, options, variants }: { sku: string; options: ProductOption[]; variants: ProductVariant[] }) {
  const [o1n, setO1n] = useState(options[0]?.name ?? '');
  const [o1v, setO1v] = useState(options[0]?.values.join('، ') ?? '');
  const [o2n, setO2n] = useState(options[1]?.name ?? '');
  const [o2v, setO2v] = useState(options[1]?.values.join('، ') ?? '');
  const opts = useMemo(() => [{ name: o1n.trim(), values: parseValues(o1v) }, { name: o2n.trim(), values: parseValues(o2v) }].filter((o) => o.name || o.values.length), [o1n, o1v, o2n, o2v]);
  const errors = validateOptions(opts);
  const rows = errors.length ? [] : generateVariants(sku || 'SKU', opts, variants);

  const preset = (name: string, values: string) => { setO1n(name); setO1v(values); };
  return (
    <section className="admin-card">
      <h3>رنگ‌بندی و فرم (اختیاری)</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>برای دندان مصنوعی، کامپوزیت و هر محصولی که مشتری باید گزینه انتخاب کند. هر ترکیب موجودی و کد کالای جداگانه دارد. مقادیر را با کاما جدا کنید.</p>
      <div className="admin-row">
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>الگوی آماده:</span>
        <button type="button" className="link" onClick={() => preset('رنگ', 'A1، A2، A3، A3.5، B1، B2، C2، D3')}>رنگ‌های VITA</button>
        <button type="button" className="link" onClick={() => preset('رنگ', 'A1، A2، A3، A3.5، B1')}>رنگ کامپوزیت</button>
        <button type="button" className="link" onClick={() => { setO2n('فرم'); setO2v('S (مربعی)، T (مثلثی)، O (بیضی)'); }}>+ فرم دندان</button>
      </div>
      <div className="grid2">
        <label className="fld"><span>گزینهٔ ۱ (مثلاً رنگ)</span><input name="opt1_name" value={o1n} onChange={(e) => setO1n(e.target.value)} /></label>
        <label className="fld"><span>مقادیر گزینهٔ ۱</span><input name="opt1_values" value={o1v} onChange={(e) => setO1v(e.target.value)} placeholder="A1، A2، A3" /></label>
        <label className="fld"><span>گزینهٔ ۲ (مثلاً فرم) — اختیاری</span><input name="opt2_name" value={o2n} onChange={(e) => setO2n(e.target.value)} /></label>
        <label className="fld"><span>مقادیر گزینهٔ ۲</span><input name="opt2_values" value={o2v} onChange={(e) => setO2v(e.target.value)} placeholder="S، T، O" /></label>
      </div>
      {errors.length > 0 && opts.length > 0 && <div className="flash bad">{errors.map((e) => <div key={e}>⚠️ {e}</div>)}</div>}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <p style={{ fontSize: 13 }}>{fa(rows.length)} ترکیب — موجودی کل محصول = جمع موجودی ترکیب‌های فعال. قیمت خالی = قیمت اصلی محصول.</p>
          <table className="var-table">
            <thead><tr><th>فعال</th><th>ترکیب</th><th>کد کالا</th><th>موجودی</th><th>قیمت جداگانه (تومان)</th></tr></thead>
            <tbody>{rows.map((v) => (
              <tr key={v.key}>
                <td><input type="hidden" name={`v_active_${v.key}`} value="off" /><input type="checkbox" name={`v_active_${v.key}`} defaultChecked={v.isActive !== false} /></td>
                <td><b>{v.values.join(' / ')}</b></td>
                <td>{sku ? <input name={`v_sku_${v.key}`} defaultValue={v.sku} dir="ltr" /> : <small style={{ color: 'var(--muted)' }}>خودکار پس از ذخیره</small>}</td>
                <td><input name={`v_stock_${v.key}`} defaultValue={String(v.stock)} inputMode="numeric" style={{ width: 80 }} /></td>
                <td><input name={`v_price_${v.key}`} defaultValue={v.retailPrice ? String(v.retailPrice) : ''} inputMode="numeric" /></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
