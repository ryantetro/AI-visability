'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { DashboardLayout } from '@/components/app/dashboard-layout';
import { DomainContextProvider } from '@/contexts/domain-context';

const LANDING_PATHS = ['/', '/landing/b', '/landing/c'];
const APP_PATH_PREFIXES = ['/analysis', '/history', '/leaderboard', '/advanced', '/featured'];

function AdvancedDashboardLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('report');

  return (
    <DomainContextProvider reportId={reportId}>
      <DashboardLayout>{children}</DashboardLayout>
    </DomainContextProvider>
  );
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeaderFooter = LANDING_PATHS.includes(pathname ?? '');
  const showAppLayout = APP_PATH_PREFIXES.some((p) => (pathname ?? '').startsWith(p));
  const isAdvanced = (pathname ?? '').startsWith('/advanced');

  if (showAppLayout) {
    if (isAdvanced) {
      return (
        <Suspense>
          <AdvancedDashboardLayout>{children}</AdvancedDashboardLayout>
        </Suspense>
      );
    }
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <>
      {showHeaderFooter && <Header />}
      {children}
      {showHeaderFooter && <Footer />}
    </>
  );
}
