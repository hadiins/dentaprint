export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * تا پیش از راه‌اندازی ورود کاربران، اجازهٔ پیش‌نمایش قیمت همکار در پرداخت فقط در حالت نمایشی.
 * در production حتماً false باشد؛ بعد از ورود، سطح همکار از حساب کاربر خوانده می‌شود.
 */
export const allowTierPreview = () => process.env.DEMO_ALLOW_TIER_PREVIEW === 'true';
