#!/bin/sh
# راه‌اندازی: ساخت/به‌روزرسانی جداول پایگاه داده، دادهٔ اولیه (اختیاری) و اجرای سایت
set -e
cd /app

# دیسک‌های پلتفرم‌ها معمولاً با مالکیت root وصل می‌شوند: تنظیم مالکیت و اجرای ادامه با کاربر app
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${UPLOAD_DIR:-/data/uploads}" "${PRIVATE_UPLOAD_DIR:-/data/private}"
  chown -R app:app /data /app/config 2>/dev/null || true
  chmod 700 "${PRIVATE_UPLOAD_DIR:-/data/private}" 2>/dev/null || true
  exec gosu app "$0" "$@"
fi

if [ -n "$DATABASE_URL" ]; then
  if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "▶ prisma migrate deploy"
    npx prisma migrate deploy
  else
    # برای نسخهٔ آزمایشی: بدون فایل‌های migration، ساختار مستقیم از schema ساخته می‌شود
    echo "▶ prisma db push (بدون migration — فقط برای نسخهٔ آزمایشی)"
    npx prisma db push --skip-generate
  fi
  if [ "$SEED_ON_START" = "true" ]; then
    echo "▶ seed"
    npm run db:seed || echo "⚠ seed ناموفق بود (ادامه می‌دهیم)"
  fi
else
  echo "⚠ DATABASE_URL تنظیم نشده — حالت نمایشی (داده در حافظه)"
fi

exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
