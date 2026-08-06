import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Toaster } from '@/components/ui/toast';
import { cn } from "@/lib/utils";
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MeritView — AI Decision Support for Disputes',
  description: 'Get structured, impartial analysis of contract, small claims, and partnership disputes from multiple AI models. Standard analysis starts at $99. Decision support, not legal advice.',
  keywords: ['contract dispute', 'small claims', 'partnership dispute', 'AI analysis', 'legal tech', 'dispute resolution', 'decision support'],
  authors: [{ name: 'MeritView' }],
  creator: 'MeritView',
  publisher: 'MeritView',
  formatDetection: { telephone: false },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'MeritView',
    title: 'MeritView — AI Decision Support for Disputes',
    description: 'Get structured, impartial analysis of everyday disputes from multiple AI models. Standard analysis starts at $99. Decision support, not legal advice.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MeritView — AI Decision Support Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MeritView — AI Decision Support for Disputes',
    description: 'Get structured, impartial analysis of everyday disputes from multiple AI models. Standard analysis starts at $99. Decision support, not legal advice.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("antialiased", inter.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <Providers>
          <Toaster>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            {children}
          </Toaster>
        </Providers>
      </body>
    </html>
  );
}
