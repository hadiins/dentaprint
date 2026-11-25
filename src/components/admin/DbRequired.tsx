export default function DbRequired() {
  return (
    <div className="acc-card">
      <h3>این بخش به پایگاه داده نیاز دارد</h3>
      <p>مدیریت همکاران، سفارش‌ها و محصولات فقط با PostgreSQL کار می‌کند. مراحل راه‌اندازی:</p>
      <pre dir="ltr" className="code">{`docker compose up -d
# DATABASE_URL را در .env فعال کنید
npm run db:migrate
npm run db:seed`}</pre>
      <p>تنظیمات سطوح و قیمت بدون پایگاه داده هم در دسترس است.</p>
    </div>
  );
}
