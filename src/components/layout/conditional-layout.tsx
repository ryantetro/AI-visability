'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AppShellNav } from '@/components/app/app-shell-nav';

const LANDING_PATHS = ['/', '/landing/b', '/landing/c'];
const APP_PATH_PREFIXES = ['/analysis', '/history', '/leaderboard', '/advanced', '/featured'];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeaderFooter = LANDING_PATHS.includes(pathname ?? '');
  const showAppNav = APP_PATH_PREFIXES.some((p) => (pathname ?? '').startsWith(p));

  return (
    <>
      {showHeaderFooter && <Header />}
      {showAppNav && <AppShellNav />}
      {children}
      {showHeaderFooter && <Footer />}
    </>
  );
}
