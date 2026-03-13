import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from 'next/font/google';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'AISO — AI Search Optimization',
  description:
    'Check how visible your website is to AI search engines. Get a free AI visibility score and fix files to boost your presence in ChatGPT, Perplexity, and Claude.',
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
      </body>
    </html>
  );
}
