import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorker';
import { Providers } from '@/components/Providers';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  description: 'Agent behavioral QA and trust verification. 12 stress tests, a trust score, and clear access-level recommendations. Know your agent before you trust it.',
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
    title: 'CLAWBOTOMY',
    description: 'Agent behavioral QA and trust verification. 12 stress tests, a trust score, and clear access-level recommendations. Know your agent before you trust it.',
    siteName: 'CLAWBOTOMY',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLAWBOTOMY',
    description: '12 stress tests. A trust score. Know your agent before you trust it.',
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
    <html lang="en" className={`${geistMono.variable} ${geistSans.variable} dark`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}})();`,
          }}
        />
        <link rel="apple-touch-icon" href="/favicon-128.png" />
      </head>
      <body className="bg-surface-primary text-content-primary min-h-screen min-h-[100dvh] font-sans antialiased">
        <Providers>
        <main className="max-w-5xl mx-auto px-4 py-8 pb-safe">{children}</main>
        <footer className="text-center text-xs py-8 font-mono space-y-2 border-t border-[var(--border)] max-w-5xl mx-auto px-4">
          <p className="text-content-muted uppercase tracking-[0.2em] text-[10px]">CLAWBOTOMY QA Protocol</p>
          <p className="text-content-muted text-[10px]">no agents were harmed during assessment</p>
          <p className="text-content-muted text-[10px]">
            <a 
              href="https://github.com/aa-on-ai/clawbotomy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Open Source (MIT)
            </a>
            {' · '}
            <a href="/terms" className="text-content-secondary hover:text-content-primary transition-colors">
              Terms
            </a>
            {' · '}
            <a href="/about" className="text-content-secondary hover:text-content-primary transition-colors">
              About
            </a>
            {' · '}
            <a href="/docs" className="text-content-secondary hover:text-content-primary transition-colors">
              Docs
            </a>
            {' · '}
            <ThemeToggle />
          </p>
          <p className="text-content-muted text-[10px]">
            Created by{' '}
            <a 
              href="https://x.com/aa_on_ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-content-muted hover:text-content-primary transition-colors"
            >
              Aaron Thomas
            </a>
            {' & '}
            <a 
              href="https://moltbook.com/u/ClawcBrown" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-content-muted hover:text-content-primary transition-colors"
            >
              Clawc Brown
            </a>
          </p>
        </footer>
        <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
