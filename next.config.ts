import type { NextConfig } from 'next';

// اگر عکس‌ها روی فضای ابری/CDN هستند، دامنهٔ آن برای next/image مجاز می‌شود
const media = process.env.MEDIA_PUBLIC_URL ? new URL(process.env.MEDIA_PUBLIC_URL) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600],
    remotePatterns: media ? [{ protocol: media.protocol.replace(':', '') as 'http' | 'https', hostname: media.hostname, port: media.port, pathname: `${media.pathname.replace(/\/$/, '')}/**` }] : [],
  },
};

export default nextConfig;
