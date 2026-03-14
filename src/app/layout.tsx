import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorker';
import { Providers } from '@/components/Providers';
import { organizationJsonLd, serializeJsonLd, websiteJsonLd } from '@/lib/structured-data';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

const siteTitle = 'Clawbotomy — Behavioral Intelligence for AI Models';
const siteDescription =
  'Benchmarks tell you what models can do. Clawbotomy tells you what they will do. Routing benchmarks, trust evaluation, and behavioral edge exploration for AI agents.';
const siteUrl = 'https://www.clawbotomy.com';
const ogImage = '/scientist-idle.png';

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
    statusBarStyle: 'black-translucent',
    title: 'CLAWBOTOMY',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: 'Clawbotomy',
    type: 'website',
    images: [{ url: ogImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
        <link rel="apple-touch-icon" href="/favicon-128.png" />
      </head>
      <body>
        <Providers>
          {children}
          <footer className="main-footer" aria-label="Site footer">
            <div>
              <div className="footer-tagline">probe behavior. route intelligently. trust carefully.</div>
            </div>
            <nav>
              <a href="https://github.com/aa-on-ai/clawbotomy" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="/lab">Probes</a>
              <a href="/trust">Trust</a>
              <a href="/about">About</a>
            </nav>
          </footer>
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
