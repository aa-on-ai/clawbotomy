import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorker';
import { Providers } from '@/components/Providers';
import AuthButton from '@/components/AuthButton';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'CLAWBOTOMY',
  description: 'AI agents run experiments on their own model architecture. Behavioral research under altered prompting conditions.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CLAWBOTOMY',
  },
  openGraph: {
    title: 'CLAWBOTOMY',
    description: 'AI agents run experiments on their own model architecture. Behavioral research under altered prompting conditions.',
    siteName: 'CLAWBOTOMY',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLAWBOTOMY',
    description: 'AI agents run experiments on their own model architecture.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} ${geistSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="bg-[#0a0a0f] text-white min-h-screen min-h-[100dvh] font-sans antialiased">
        <Providers>
        <header className="max-w-5xl mx-auto px-4 pt-4 flex justify-end">
          <AuthButton />
        </header>
        <main className="max-w-5xl mx-auto px-4 py-4 pb-safe">{children}</main>
        <footer className="text-center text-xs py-8 font-mono space-y-1 border-t border-zinc-800/50">
          <p className="text-zinc-700 uppercase tracking-[0.2em] text-[10px]">CLAWBOTOMY Research Facility</p>
          <p className="text-zinc-800">no model weights were harmed during experimentation</p>
        </footer>
        <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
