'use client';
import { useActionState } from 'react';
import { saveProductAction, type ProductFormState } from '@/app/admin/actions';
import { CATEGORY_GROUPS, CATEGORIES, TYPE_LABELS } from '@/lib/catalog-meta';
import { specsToText } from '@/lib/admin/product-input';
import type { AdminProduct } from '@/lib/admin/data';
import type { TierConfig } from '@/lib/commerce-config';
import VariantEditor from './VariantEditor';

export default function ProductForm({ product, tiers }: { product?: AdminProduct; tiers: TierConfig[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProductAction, { errors: [] });
  const p = product;
  const v = (x: number | null | undefined) => (x == null ? '' : String(x));
  return (
    <form action={action} className="admin">
      {p && <input type="hidden" name="id" value={p.id} />}
      {state.errors.length > 0 && <div className="flash bad" role="alert">{state.errors.map((e) => <div key={e}>⚠️ {e}</div>)}</div>}
      <section className="admin-card">
        <h3>مشخصات اصلی</h3>
        <div className="grid2">
          <label className="fld"><span>نام محصول *</span><input name="name" defaultValue={p?.name} required /></label>
          <label className="fld"><span>آیکون (ایموجی، تا افزودن عکس)</span><input name="icon" defaultValue={p?.icon || '📦'} style={{ width: 90 }} /></label>
          <label className="fld"><span>نامک آدرس (slug) *</span><input name="slug" defaultValue={p?.slug} dir="ltr" placeholder="nanohybrid-composite-4g" /></label>
          <label className="fld"><span>کد کالا (SKU) *</span><input name="sku" defaultValue={p?.sku} dir="ltr" placeholder="DP-RS-001" /></label>
          <label className="fld"><span>دسته‌بندی *</span>
            <select name="category" defaultValue={p?.category ?? ''}><option value="" disabled>انتخاب کنید</option>
              {CATEGORY_GROUPS.map((g) => <optgroup key={g.slug} label={g.name}>{CATEGORIES.filter((c) => c.group === g.slug).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</optgroup>)}
            </select></label>
          <label className="fld"><span>نوع *</span>
            <select name="type" defaultValue={p?.type ?? 'MATERIAL'}>{Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="fld"><span>کد IRC (تجهیزات پزشکی)</span><input name="irc" defaultValue={p?.irc} dir="ltr" /></label>
          <label className="fld"><span>طول موج (نانومتر، برای رزین)</span><input name="wavelengthNm" defaultValue={v(p?.wavelengthNm)} inputMode="numeric" /></label>
        </div>
        <label className="fld"><span>توضیح کوتاه</span><input name="shortDescription" defaultValue={p?.shortDescription} /></label>
        <label className="fld"><span>توضیحات کامل *</span><textarea name="description" rows={4} defaultValue={p?.description} /></label>
        <label className="fld"><span>مشخصات فنی (هر خط: «عنوان: مقدار»)</span><textarea name="specs" rows={5} defaultValue={p ? specsToText(p.specs) : 'وزن: \nرنگ‌بندی: '} /></label>
      </section>
      <section className="admin-card">
        <h3>قیمت و موجودی (تومان)</h3>
        <div className="grid2">
          <label className="fld"><span>قیمت مصرف‌کننده *</span><input name="retailPrice" defaultValue={v(p?.retailPrice)} inputMode="numeric" /></label>
          <label className="fld"><span>قیمت قبل از تخفیف (خط‌خورده)</span><input name="compareAtPrice" defaultValue={v(p?.compareAtPrice)} inputMode="numeric" /></label>
          <label className="fld"><span>کف قیمت (هیچ تخفیفی زیر آن نمی‌رود)</span><input name="minPrice" defaultValue={v(p?.minPrice)} inputMode="numeric" /></label>
          <label className="fld"><span>سقف تخفیف همکار (٪)</span><input name="maxPartnerDiscountPercent" defaultValue={v(p?.maxPartnerDiscountPercent)} inputMode="numeric" /></label>
          <label className="fld"><span>حداقل تعداد برای قیمت همکار</span><input name="partnerMinQty" defaultValue={v(p?.partnerMinQty ?? 1)} inputMode="numeric" /></label>
          <label className="fld"><span>موجودی انبار (اگر رنگ/فرم دارد، از جدول ترکیب‌ها محاسبه می‌شود)</span><input name="stock" defaultValue={v(p?.stock ?? 0)} inputMode="numeric" /></label>
          <label className="fld"><span>اولویت نمایش (بیشتر = بالاتر)</span><input name="popularity" defaultValue={v(p?.popularity ?? 50)} inputMode="numeric" /></label>
        </div>
        <h3 style={{ fontSize: 15 }}>قیمت دستی هر سطح (اختیاری — خالی = تخفیف درصدی سطح)</h3>
        <div className="grid2">{tiers.map((t) => <label key={t.id} className="fld"><span>{t.icon} {t.name}</span><input name={`tier_${t.id}`} defaultValue={v(p?.tierPrices[t.id])} inputMode="numeric" /></label>)}</div>
        <label className="admin-row"><input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} /> نمایش در فروشگاه</label>
      </section>
      <VariantEditor sku={p?.sku ?? ''} options={p?.options ?? []} variants={p?.variants ?? []} />
      <div className="buy-row"><button className="btn btn-main" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیرهٔ محصول'} <span className="arr">←</span></button></div>
    </form>
  );
}
