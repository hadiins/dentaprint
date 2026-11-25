'use client';
import { useToast } from '../Providers';

export default function Newsletter() {
  const toast = useToast();
  return (
    <section style={{ paddingTop: 0 }}><div className="wrap">
      <div className="big-cta rv">
        <h2>۱۰٪ تخفیف اولین خرید</h2>
        <p>عضو خبرنامه شوید و کد تخفیف + پروفایل‌های چاپ رایگان بگیرید.</p>
        <form className="nl" onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); toast('🎉 کد تخفیف به ایمیل شما ارسال شد'); }}>
          <input type="email" required placeholder="ایمیل شما" aria-label="ایمیل" />
          <button className="btn">دریافت کد</button>
        </form>
      </div>
    </div></section>
  );
}
