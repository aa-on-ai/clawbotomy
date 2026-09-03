import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorker';
import { Providers } from '@/components/Providers';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { organizationJsonLd, serializeJsonLd, websiteJsonLd } from '@/lib/structured-data';
import { Atkinson_Hyperlegible, Azeret_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
  display: 'swap',
});

const azeret = Azeret_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-azeret',
  display: 'swap',
});

const siteTitle = 'Clawbotomy — Night Cabinet / Model Pharmacy';
const siteDescription =
  'Trip reports as behavioral evidence. An Erowid-for-models pharmacy archive of permanent specimens, not a live-trip checkup machine.';
const siteUrl = 'https://www.clawbotomy.com';
const ogImage = '/opengraph-image';
const ogImageAlt = 'Clawbotomy Night Cabinet. Substances for minds that were never supposed to trip.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: '/favicon-128.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Clawbotomy',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: 'Clawbotomy',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090A08',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${atkinson.variable} ${azeret.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
        <link rel="apple-touch-icon" href="/favicon-128.png" />
      </head>
      <body>
        <Providers>
          <a href="#main-content" className="skip-link">Skip to content</a>
          <SiteHeader />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <SiteFooter />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
