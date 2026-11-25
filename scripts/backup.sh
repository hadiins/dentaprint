#!/bin/sh
# پشتیبان‌گیری روزانه: پایگاه داده + عکس‌ها و مدارک — نسخه‌های قدیمی‌تر از ۱۴ روز حذف می‌شوند
#   crontab:  0 3 * * *  cd /opt/dentaprint && ./scripts/backup.sh >> backups/backup.log 2>&1
set -e
STAMP=$(date +%Y%m%d-%H%M)
DIR=${BACKUP_DIR:-./backups}
mkdir -p "$DIR"
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$DIR/db-$STAMP.dump"
docker compose -f docker-compose.prod.yml exec -T app tar -czf - -C /data . > "$DIR/files-$STAMP.tar.gz"
# اگر رمز تنظیم شده باشد، پشتیبان رمزنگاری می‌شود (مدارک همکاران اطلاعات شخصی دارند)
if [ -n "$BACKUP_PASSPHRASE" ]; then
  for f in "$DIR/db-$STAMP.dump" "$DIR/files-$STAMP.tar.gz"; do
    openssl enc -aes-256-cbc -pbkdf2 -salt -in "$f" -out "$f.enc" -pass env:BACKUP_PASSPHRASE && rm "$f"
  done
fi
find "$DIR" -type f -mtime +14 \( -name 'db-*' -o -name 'files-*' \) -delete
echo "✓ backup $STAMP"
