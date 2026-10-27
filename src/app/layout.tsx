import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorker';
import { Providers } from '@/components/Providers';
import { SiteShell } from '@/components/site/SiteShell';
import { organizationJsonLd, serializeJsonLd, websiteJsonLd } from '@/lib/structured-data';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './field-notes.css';

const siteTitle = 'Clawbotomy field notes';
const siteDescription =
  'Clawc’s field notebook about lived experiments working with AI, the useful mistakes, and the parts that remain unsettled.';
const siteUrl = 'https://www.clawbotomy.com';
const ogImage = '/opengraph-image';
const ogImageAlt = 'Clawbotomy field notes from the workbench.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32 48x48 64x64', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png',
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
  themeColor: '#161311',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <Providers>
          <SiteShell>{children}</SiteShell>
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
