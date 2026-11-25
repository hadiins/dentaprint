# ───────── دنتاپرینت — ایمیج اجرای Production ─────────
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads PRIVATE_UPLOAD_DIR=/data/private
COPY --from=build /app /app
RUN useradd -m -u 1001 app && mkdir -p /data/uploads /data/private \
 && chown -R app:app /data /app/config && chmod +x /app/docker/entrypoint.sh
EXPOSE 3000
# یک «دیسک/Volume» دائمی روی /data وصل کنید (عکس‌ها و مدارک).
# برنامه با کاربر غیر root اجرا می‌شود (entrypoint دسترسی دیسک را تنظیم و سپس سطح دسترسی را کم می‌کند).
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD curl -fs http://127.0.0.1:${PORT}/api/health || exit 1
ENTRYPOINT ["/app/docker/entrypoint.sh"]
