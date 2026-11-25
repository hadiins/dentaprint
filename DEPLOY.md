# راهنمای استقرار دنتاپرینت

سه مسیر، از ساده به حرفه‌ای:

| مسیر | مناسب برای | پایگاه داده | عکس و مدارک |
|---|---|---|---|
| **الف) نسخهٔ آزمایشی سریع** (Railway / Render) | دیدن سایت روی اینترنت در چند دقیقه | اختیاری | موقت |
| **ب) لیارا** (PaaS ایرانی) | آزمایش جدی و حتی اجرای اصلی؛ سرور در ایران | PostgreSQL لیارا | دیسک لیارا یا Object Storage |
| **ج) سرور مجازی + Docker** (هر ارائه‌دهنده) | کنترل کامل و هزینهٔ ثابت | داخل همان سرور | داخل همان سرور |

> قبل از هر مسیر: پروژه را در یک مخزن **خصوصی** GitHub قرار دهید (فایل `.env` هرگز در مخزن قرار نگیرد).

---

## قدم صفر (روی کامپیوتر خودتان، یک‌بار)

```bash
npm install
npm run typecheck
npm test
# اختیاری اما توصیه‌شده برای اجرای اصلی: ساخت فایل‌های migration
docker compose up -d                      # PostgreSQL محلی
cp .env.example .env                      # DATABASE_URL را فعال کنید
npx prisma migrate dev --name init        # پوشهٔ prisma/migrations ساخته می‌شود ← commit کنید
npm run db:seed && npm run dev
```
اگر پوشهٔ `prisma/migrations` وجود نداشته باشد، سرور هنگام راه‌اندازی جداول را با `prisma db push` می‌سازد (برای آزمایش کافی است؛ برای اجرای اصلی migration بسازید).

---

## متغیرهای محیطی لازم

| متغیر | آزمایشی | اجرای اصلی |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | آدرسی که پلتفرم می‌دهد (مثلاً `https://dentaprint.up.railway.app`) | `https://دامنهٔ‌شما` |
| `AUTH_SECRET` | **الزامی** — خروجی `openssl rand -base64 48` | **الزامی** |
| `DATABASE_URL` | از پلتفرم (یا خالی برای حالت نمایشی) | الزامی |
| `ADMIN_PHONES` | شمارهٔ خودتان | شماره‌های مدیران |
| `SMS_PROVIDER` / `SMS_ALLOW_CONSOLE` | `console` و `true` (کد ورود در **لاگ** سرور) | `kavenegar` یا `smsir` + کلیدها؛ `SMS_ALLOW_CONSOLE` حذف |
| `PAYMENT_GATEWAYS` / `PAYMENT_ALLOW_MOCK` | `mock` و `true` | `zarinpal` یا `zibal` + کلیدها؛ `PAYMENT_ALLOW_MOCK` حذف |
| `DEMO_PARTNERS` | مثلاً `09122222222:silver` (فقط بدون پایگاه داده) | حذف |
| `SEED_ON_START` | `true` در اولین اجرا | `false` |
| `CRON_SECRET` | اختیاری | الزامی (ارزیابی روزانهٔ سطح‌ها) |
| `MEDIA_STORAGE` و … | `local` | `local` با دیسک دائمی یا `s3` |

وقتی `PAYMENT_ALLOW_MOCK` یا `SMS_ALLOW_CONSOLE` روشن باشد، پایین همهٔ صفحات نوار «نسخهٔ آزمایشی» نمایش داده می‌شود.

---

## الف) نسخهٔ آزمایشی سریع روی Railway

1. در railway.com با GitHub ثبت‌نام کنید ← **New Project** ← **Deploy from GitHub repo** ← مخزن را انتخاب کنید. فایل `railway.json` باعث می‌شود با Dockerfile ساخته شود.
2. در همان پروژه: **New** ← **Database** ← **PostgreSQL**. در سرویس سایت ← **Variables** ← `DATABASE_URL` را به متغیر پایگاه داده ارجاع دهید (`${{Postgres.DATABASE_URL}}`).
3. سرویس سایت ← **Settings** ← **Volumes** ← یک Volume با مسیر `/data` (عکس‌ها و مدارک).
4. متغیرهای ستون «آزمایشی» جدول بالا را اضافه کنید.
5. **Settings** ← **Networking** ← **Generate Domain**؛ همان آدرس را در `NEXT_PUBLIC_SITE_URL` بگذارید و دوباره Deploy کنید.
6. برای ورود: شماره را وارد کنید ← در **Deployments ← Logs** خطی مثل `[SMS:dev] کد ورود 0912…: 12345` را ببینید.

**Render** (جایگزین): Web Service از نوع Docker بسازید؛ نسخهٔ رایگان دیسک دائمی ندارد و پایگاه دادهٔ رایگانش موقت است، پس فقط برای دیدن ظاهر سایت مناسب است (یا بدون `DATABASE_URL` در حالت نمایشی).

---

## ب) لیارا

1. در liara.ir ثبت‌نام کنید ← **ایجاد برنامه** ← پلتفرم **Docker** (فایل `liara.json` همراه پروژه است؛ پورت ۳۰۰۰ و دیسک `data` روی `/data`).
2. **دیسک**: در بخش دیسک‌های برنامه یک دیسک با نام `data` بسازید (نام باید با `liara.json` یکی باشد).
3. **پایگاه داده**: یک PostgreSQL بسازید و آدرس اتصال (داخلی) را در `DATABASE_URL` برنامه بگذارید.
4. متغیرهای محیطی را در بخش «تنظیمات ← متغیرها» وارد کنید.
5. استقرار: با CLI لیارا (`npm i -g @liara/cli` سپس `liara login` و `liara deploy` در پوشهٔ پروژه) یا اتصال GitHub.
6. دامنه: در بخش دامنه‌ها، دامنهٔ خود را اضافه و SSL را فعال کنید؛ `NEXT_PUBLIC_SITE_URL` را به‌روز کنید.
7. (اختیاری) **Object Storage** لیارا برای عکس‌ها: یک باکت عمومی و یک باکت خصوصی بسازید و `MEDIA_STORAGE=s3` و متغیرهای `S3_*` را تنظیم کنید.

> نام دقیق گزینه‌ها و ساختار `liara.json` را با مستندات فعلی لیارا (docs.liara.ir) تطبیق دهید.

---

## ج) سرور مجازی با Docker

حداقل منابع پیشنهادی: ۲ هستهٔ CPU، ۴ گیگابایت RAM، ۴۰ گیگابایت دیسک، Ubuntu 22.04/24.04.

```bash
# روی سرور
curl -fsSL https://get.docker.com | sh
git clone <آدرس مخزن خصوصی> /opt/dentaprint && cd /opt/dentaprint
cp .env.example .env && nano .env        # DOMAIN، POSTGRES_PASSWORD، AUTH_SECRET و بقیه
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```
- رکورد **A** دامنه را به IP سرور اشاره دهید؛ Caddy گواهی HTTPS را خودکار می‌گیرد.
- اولین اجرا: `SEED_ON_START=true`؛ بعد آن را `false` کنید.
- **پشتیبان‌گیری روزانه** (پایگاه داده + عکس‌ها + مدارک، رمزنگاری‌شده):
  ```bash
  echo 'BACKUP_PASSPHRASE=یک-رمز-طولانی' >> .env
  crontab -e
  0 3 * * *  cd /opt/dentaprint && set -a && . ./.env && ./scripts/backup.sh >> backups/backup.log 2>&1
  ```
  نسخه‌های پشتیبان را مرتب به جای دیگری (فضای ابری یا کامپیوتر خودتان) منتقل کنید.
- **ارزیابی روزانهٔ سطح همکاران:**
  ```bash
  30 3 * * *  curl -fs -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron/evaluate-tiers
  ```
- به‌روزرسانی: `git pull && docker compose -f docker-compose.prod.yml up -d --build`

---

## چک‌لیست آزمون پس از استقرار

- [ ] `https://آدرس/api/health` ← `{"ok":true,"db":"ok"}`
- [ ] صفحهٔ اول، تغییر تم، فروشگاه، فیلتر گروه‌ها، صفحهٔ محصول
- [ ] انتخاب رنگ/فرم و افزودن به سبد
- [ ] ورود با کد (از لاگ یا پیامک)، تکمیل نام
- [ ] پرداخت آزمایشی ← نتیجهٔ موفق ← سفارش در حساب ← **فاکتور** و چاپ PDF
- [ ] ورود با شمارهٔ مدیر ← `/admin`: داشبورد، تغییر وضعیت سفارش با کد رهگیری
- [ ] افزودن محصول با رنگ‌بندی و **بارگذاری عکس**
- [ ] درخواست همکاری ← تأیید در پنل ← قیمت همکار در فروشگاه
- [ ] بارگذاری مدرک توسط همکار ← تأیید در پنل ← تغییر سطح تأیید
- [ ] ری‌استارت سرویس ← عکس‌ها و مدارک باقی مانده‌اند (دیسک دائمی درست وصل است)

## چک‌لیست راه‌اندازی اصلی

- [ ] دامنه و SSL، `NEXT_PUBLIC_SITE_URL` نهایی
- [ ] نماد اعتماد الکترونیکی (اینماد) و صفحات قوانین، حریم خصوصی، شرایط مرجوعی
- [ ] قرارداد درگاه پرداخت و ثبت آدرس بازگشت `https://DOMAIN/api/payments/callback/{zarinpal|zibal}` در پنل درگاه
- [ ] الگوهای پیامک تأییدشده (کد ورود + اطلاع‌رسانی‌ها) و `SMS_TEMPLATES`
- [ ] حذف `PAYMENT_ALLOW_MOCK`، `SMS_ALLOW_CONSOLE`، `DEMO_*` و `ADMIN_TOKEN` (اگر لازم نیست)
- [ ] اطلاعات فروشنده و تنظیم ارزش افزوده (پنل ← فاکتور) با تأیید حسابدار
- [ ] پشتیبان‌گیری روزانه + آزمایش بازگردانی یک نسخهٔ پشتیبان
- [ ] cron ارزیابی سطح‌ها
- [ ] Google Search Console و ارسال `sitemap.xml`
