'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { DashboardLayout } from '@/components/app/dashboard-layout';
import { DomainContextProvider } from '@/contexts/domain-context';

const LANDING_PATHS = ['/', '/landing/b', '/landing/c'];

/** Routes that need sidebar + domain context (workspace pages) */
const WORKSPACE_PREFIXES = ['/dashboard', '/report', '/brand', '/competitors', '/settings', '/advanced', '/history', '/analytics', '/leaderboard'];

/** Routes that need sidebar but NOT domain context */
const APP_PATH_PREFIXES = ['/featured', ...WORKSPACE_PREFIXES];

function WorkspaceDashboardLayout({ children }: { children: React.ReactNode }) {
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
  const isWorkspace = WORKSPACE_PREFIXES.some((p) => (pathname ?? '').startsWith(p));
  const showAppLayout = APP_PATH_PREFIXES.some((p) => (pathname ?? '').startsWith(p));

  if (isWorkspace) {
    return (
      <Suspense>
        <WorkspaceDashboardLayout>{children}</WorkspaceDashboardLayout>
      </Suspense>
    );
  }

  if (showAppLayout) {
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
