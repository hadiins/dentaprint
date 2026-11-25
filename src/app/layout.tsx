import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from '@/components/Providers';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Effects from '@/components/Effects';
import { THEME_BOOT_SCRIPT } from '@/lib/themes';
import { getCommerceSettings } from '@/lib/settings';
import { getViewer } from '@/lib/auth/server';
import { allowTierPreview } from '@/lib/server/site';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'دنتاپرینت | آیندهٔ دندانسازی دیجیتال', template: '%s | دنتاپرینت' },
  description: 'فروشگاه تخصصی رزین چاپگر سه‌بعدی، دندان مصنوعی و مواد پروتز، کامپوزیت و مواد پرکردن، و تجهیزات لابراتوار و کلینیک دندانپزشکی؛ فروش شخصی و همکاری (عمده).',
  openGraph: { type: 'website', locale: 'fa_IR', siteName: 'دنتاپرینت' },
};

export const viewport: Viewport = { themeColor: '#060d14', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [commerce, viewer] = await Promise.all([getCommerceSettings(), getViewer()]);
  return (
    <html lang="fa" dir="rtl" data-theme="teal" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* فونت وزیرمتن — در مرحلهٔ استقرار، فایل فونت روی سرور خودمان میزبانی می‌شود */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" />
      </head>
      <body>
        <div className="aurora" aria-hidden><i /><i /><i /></div>
        <div className="cursor-glow" id="glow" aria-hidden />
        {(process.env.PAYMENT_ALLOW_MOCK === 'true' || process.env.SMS_ALLOW_CONSOLE === 'true') && process.env.NODE_ENV === 'production' && (
          <div className="test-banner" role="note">🧪 نسخهٔ آزمایشی — پرداخت‌ها واقعی نیستند</div>
        )}
        <Providers commerce={commerce} viewer={viewer} allowTierPreview={allowTierPreview()}>
          <Nav />
          {children}
          <Footer />
        </Providers>
        <Effects />
      </body>
    </html>
  );
}
