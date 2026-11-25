import { fa } from '@/lib/format';
import { getCommerceSettings } from '@/lib/settings';
import { activeTiers } from '@/lib/commerce-config';
import PartnerForm from './PartnerForm';

export default async function PartnerSection() {
  const settings = await getCommerceSettings();
  const tiers = activeTiers(settings);
  const months = Math.round(settings.evaluationWindowDays / 30);
  const docTier = tiers.find((t) => t.requiresDocuments);
  const freeTiers = tiers.filter((t) => !t.requiresDocuments).map((t) => t.name).join(' و ');
  const breaksText = settings.quantityBreaks.map((b) => `${fa(b.minQty)} عدد به بالا ${fa(b.extraDiscountPercent)}٪`).join(' و ');
  return (
    <section id="b2b" style={{ paddingTop: 0 }}><div className="wrap">
      <div className="head rv">
        <div><span className="eyebrow">همکاری و فروش عمده</span><h2>لابراتوار یا کلینیک دارید؟<br /><span className="gt">همکار ما شوید</span></h2></div>
        <p>هر چه بیشتر خرید کنید، سطح همکاری‌تان بالاتر و قیمت‌تان بهتر می‌شود. داشتن پروانه شرط همکاری نیست.</p>
      </div>
      <div className="b2b">
        <div className="perks">
          <div className="perk rv"><div className="pi">💰</div><h3>قیمت ویژه بر اساس سطح</h3><p>{fa(tiers.length)} سطح {tiers.map((t) => t.name).join('، ')} با تخفیف رو به افزایش</p></div>
          <div className="perk rv"><div className="pi">📈</div><h3>ارتقای خودکار</h3><p>با رسیدن خرید {fa(months)} ماه اخیر به حد نصاب، سطح شما خودکار بالا می‌رود</p></div>
          <div className="perk rv"><div className="pi">🤝</div><h3>مدیر حساب اختصاصی</h3><p>یک کارشناس مشخص برای سفارش‌ها و مشاورهٔ فنی شما</p></div>
          <div className="perk rv"><div className="pi">💳</div><h3>پرداخت آنلاین امن</h3><p>پرداخت از درگاه بانکی و صدور فاکتور برای همکاران دارای کد اقتصادی</p></div>
          <div className="tiers rv">
            <h3>سطوح همکاری</h3>
            <div className="tier-cards">
              {tiers.map((t, i) => (
                <div key={t.id} className={`tier${i === tiers.length - 1 ? ' hot' : ''}`}>
                  <span style={{ fontSize: 26 }}>{t.icon}</span>
                  <b>−{fa(t.discountPercent)}٪</b>
                  <span>{t.name}</span>
                  <small>{t.minSpend ? `خرید ${fa(t.minSpend / 1_000_000)} میلیون تومان در ${fa(months)} ماه` : 'سطح ورود همهٔ همکاران'}</small>
                  <small>{t.requiresDocuments ? 'نیازمند پروانه یا کد اقتصادی' : 'بدون نیاز به پروانه'}{t.freeShipping ? ' · ارسال رایگان' : ''}</small>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>{breaksText && <>به‌علاوهٔ تخفیف پلکانی تعداد: {breaksText} اضافه. </>}تجهیزات گران‌قیمت سقف تخفیف جداگانه دارند.</p>
          </div>
        </div>
        <PartnerForm freeTiers={freeTiers} docTierName={docTier?.name} />
      </div>
    </div></section>
  );
}
