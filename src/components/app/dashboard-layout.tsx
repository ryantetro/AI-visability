'use client';

import { Suspense } from 'react';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeaderBar } from './dashboard-header-bar';
import { ActionChecklistProvider } from '@/contexts/action-checklist-context';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActionChecklistProvider>
      <div className="min-h-screen bg-[var(--surface-page)]">
        <Suspense>
          <DashboardSidebar />
        </Suspense>

        {/* Main area — offset by sidebar width on desktop */}
        <div className="flex flex-col md:ml-[var(--sidebar-current-width)] sidebar-main-transition">
          <Suspense>
            <DashboardHeaderBar />
          </Suspense>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ActionChecklistProvider>
  );
}
