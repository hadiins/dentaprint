import { getSeller } from '@/lib/invoice/seller';
import { saveSellerAction } from '../actions';
import Flash, { one } from '@/components/admin/Flash';

export const metadata = { title: 'اطلاعات فروشنده و فاکتور' };
type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function SellerPage({ searchParams }: { searchParams: SP }) {
  const [s, sp] = await Promise.all([getSeller(), searchParams]);
  const f = (name: keyof typeof s, label: string, opts: { ltr?: boolean; wide?: boolean; ph?: string } = {}) => (
    <label className="fld" style={opts.wide ? { gridColumn: '1/-1' } : undefined}><span>{label}</span>
      <input name={name} defaultValue={String(s[name] ?? '')} dir={opts.ltr ? 'ltr' : undefined} placeholder={opts.ph} /></label>
  );
  return (
    <form action={saveSellerAction} className="admin">
      <h1 className="admin-h1">اطلاعات فروشنده و فاکتور</h1>
      <Flash ok={one(sp.ok)} error={one(sp.error)} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>این اطلاعات روی فاکتورهای جدید چاپ می‌شود. فاکتورهای صادرشده تغییر نمی‌کنند (نسخهٔ ثابت در لحظهٔ صدور).</p>
      <section className="admin-card"><h3>مشخصات رسمی</h3><div className="grid2">
        {f('legalName', 'نام رسمی (مطابق ثبت)')}{f('brandName', 'نام تجاری')}
        {f('economicCode', 'کد اقتصادی (۱۲ یا ۱۴ رقم)', { ltr: true })}{f('nationalId', 'شناسهٔ ملی (۱۱ رقم) / کد ملی', { ltr: true })}
        {f('registrationNo', 'شمارهٔ ثبت', { ltr: true })}{f('postalCode', 'کد پستی (۱۰ رقم)', { ltr: true })}
        {f('address', 'نشانی', { wide: true })}{f('phone', 'تلفن')}{f('email', 'ایمیل', { ltr: true })}{f('website', 'وب‌سایت', { ltr: true })}
      </div></section>
      <section className="admin-card"><h3>مالیات و واحد پول</h3>
        <label className="admin-row"><input type="checkbox" name="vatEnabled" defaultChecked={s.vatEnabled} /> مشمول مالیات بر ارزش افزوده هستیم</label>
        <div className="grid2">
          <label className="fld"><span>نرخ ارزش افزوده (٪)</span><input name="vatRate" defaultValue={String(s.vatRate)} inputMode="decimal" /></label>
          <label className="fld"><span>قیمت‌های سایت</span><select name="pricesIncludeVat" defaultValue={String(s.pricesIncludeVat)}><option value="true">شامل مالیات است (از مبلغ پرداختی جدا می‌شود)</option><option value="false">بدون مالیات است (روی فاکتور اضافه می‌شود)</option></select></label>
          <label className="fld"><span>واحد مبالغ فاکتور</span><select name="currency" defaultValue={s.currency}><option value="IRR">ریال</option><option value="IRT">تومان</option></select></label>
        </div>
        <div className="hint">⚠️ نرخ و نحوهٔ محاسبهٔ ارزش افزوده را با حسابدار خود تأیید کنید. اگر «بدون مالیات» انتخاب شود، مبلغ فاکتور از مبلغ پرداختی آنلاین بیشتر می‌شود؛ معمولاً «شامل مالیات» درست است.</div>
      </section>
      <section className="admin-card"><h3>متن پایین فاکتور</h3>
        <label className="fld"><span>یادداشت</span><textarea name="footerNote" rows={2} defaultValue={s.footerNote} /></label>
      </section>
      <div className="buy-row"><button className="btn btn-main">ذخیره <span className="arr">←</span></button></div>
    </form>
  );
}
