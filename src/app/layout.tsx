import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { ErrorBoundary } from '@/components/error-boundary';

const bodyFont = Manrope({
  variable: '--font-body',
  subsets: ['latin'],
});

const displayFont = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});

const monoFont = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.ai-radr.com'),
  title: 'airadr — AI Search Optimization',
  description:
    'Check how visible your website is to AI search engines. Get a free AI visibility score and fix files to boost your presence in ChatGPT, Perplexity, and Claude.',
  openGraph: {
    title: 'airadr — AI Search Optimization',
    description:
      'Check how visible your website is to AI search engines. Get a free AI visibility score and fix files for ChatGPT, Perplexity, and Claude.',
    siteName: 'airadr',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'airadr — AI Search Optimization',
    description:
      'Check how visible your website is to AI search engines. Get a free AI visibility score and fix files for ChatGPT, Perplexity, and Claude.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased`}
      >
        <ConditionalLayout>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ConditionalLayout>
        <Analytics />
      </body>
    </html>
  );
}
