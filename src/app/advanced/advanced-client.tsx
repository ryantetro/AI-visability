'use client';

import { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Globe2,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { MiniInfoTile } from '@/components/app/dashboard-primitives';
import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { cn } from '@/lib/utils';
import { useDomainContext } from '@/contexts/domain-context';

import { RoadmapView } from './roadmap-view';
import { UPGRADE_FEATURES } from './lib/constants';
import { CenteredLoading, CenteredWorkspaceState } from './panels/shared';
import { DomainHeader } from './components/domain-header';

// Section components
import { DashboardSection } from './dashboard/dashboard-section';
import { BrandSection } from './brand/brand-section';
import { CompetitorsSection } from './competitors/competitors-section';
import { SettingsSection } from './settings/settings-section';

import type { SiteSummary } from './lib/types';

type ActiveSection = 'dashboard' | 'brand' | 'competitors' | 'settings';

function AdvancedPageContent({ reportId }: { reportId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReportId = reportId ?? '';
  const roadmapTab = searchParams.get('tab') === 'roadmap';
  const sectionParam = searchParams.get('section') as ActiveSection | null;
  const activeSection: ActiveSection = sectionParam && ['brand', 'competitors', 'settings'].includes(sectionParam)
    ? sectionParam as ActiveSection
    : 'dashboard';

  const {
    monitoredSites,
    selectedDomain,
    selectDomain,
    addDomainInput,
    setAddDomainInput,
    handleAddDomain,
    addError,
    confirmChecked,
    setConfirmChecked,
    hasPaidAccess,
    report,
    files,
    workspaceLoading,
    loadError,
    recentScans,
    recentLoading,
    expandedSite,
    actionError,
    reauditLoading,
    handleReaudit,
    handleRunFirstScan,
    monitoringConnected,
    monitoringLoading,
    handleEnableMonitoring,
    unlockModalOpen,
    setUnlockModalOpen,
    handleUnlockComplete,
    pendingDomain,
    debugPaidPreview,
    checkoutBanner,
    inputFaviconUrl,
  } = useDomainContext();

  // --- Render ---
  if (recentLoading) return <CenteredLoading label="Preparing your advanced workspace..." />;

  if (roadmapTab) {
    return (
      <div className="text-white">
        <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="inline-block rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#a855f7]">Internal Roadmap</span>
            <a href="/advanced" className="text-[12px] font-medium text-zinc-400 transition-colors hover:text-white">Exit roadmap &rarr;</a>
          </div>
          <RoadmapView />
        </main>
        <FloatingFeedback />
      </div>
    );
  }

  // Unpaid view
  if (!hasPaidAccess) {
    return (
      <div className="relative">
        <UnpaidLanding
          addError={addError}
          confirmChecked={confirmChecked}
          domainInput={addDomainInput}
          inputFaviconUrl={inputFaviconUrl}
          onAddDomain={handleAddDomain}
          onConfirmChange={setConfirmChecked}
          onDomainInputChange={(v) => setAddDomainInput(v)}
          onOpenUnlock={() => setUnlockModalOpen(true)}
          pendingDomain={pendingDomain}
        />
        <div className="pointer-events-none fixed left-1/2 top-[92px] z-30 w-full max-w-[1120px] -translate-x-1/2 px-4 sm:px-6 lg:px-8">
          <div className="pointer-events-auto flex items-center gap-2 justify-end">
            <a href="/advanced?tab=roadmap" className="inline-flex items-center gap-2 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/10 px-4 py-2 text-[12px] font-semibold text-[#d8b4fe] transition-colors hover:bg-[#a855f7]/16">Roadmap</a>
            <button type="button" onClick={() => router.push('/advanced?debugPaid=1')} className="inline-flex items-center gap-2 rounded-full border border-[#5f93ff]/40 bg-[#5f93ff]/10 px-4 py-2 text-[12px] font-semibold text-[#cfe0ff] transition-colors hover:bg-[#5f93ff]/16">
              <Sparkles className="h-3.5 w-3.5" />Preview paid view
            </button>
          </div>
        </div>
        <UnlockFeaturesModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} onUnlock={handleUnlockComplete} />
      </div>
    );
  }

  // Paid view — dashboard workspace (no more domain list toggle)
  const isMonitoring = selectedDomain ? Boolean(monitoringConnected[selectedDomain]) : false;
  const platformLabel = files ? formatPlatformLabel(files.detectedPlatform) : null;

  return (
    <div className="text-white">
      <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {debugPaidPreview && (
          <div className="mb-4 flex justify-end">
            <div className="flex items-center gap-3 rounded-lg border border-[#5f93ff]/30 bg-[#5f93ff]/10 px-4 py-2 text-[12px] text-[#d5e4ff]">
              <Sparkles className="h-4 w-4" /><span>Debug preview active</span>
              <button type="button" onClick={() => router.push(initialReportId ? `/advanced?report=${initialReportId}` : '/advanced')} className="rounded-md border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.06]">Exit</button>
            </div>
          </div>
        )}

        {checkoutBanner && (
          <div className="mb-4 rounded-2xl border border-[#25c972]/30 bg-[#25c972]/10 px-4 py-3 text-sm text-[#25c972]">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{checkoutBanner}</div>
          </div>
        )}

        {/* No domains — empty state with CTA */}
        {monitoredSites.length === 0 ? (
          <EmptyDomainState />
        ) : selectedDomain && expandedSite ? (
          <DomainWorkspace
            activeSection={activeSection}
            actionError={actionError}
            domain={selectedDomain}
            expandedSite={expandedSite}
            files={files}
            loadError={loadError}
            loadingWorkspace={workspaceLoading}
            monitoringConnected={isMonitoring}
            monitoringLoading={monitoringLoading}
            onEnableMonitoring={handleEnableMonitoring}
            onReaudit={handleReaudit}
            onRunFirstScan={handleRunFirstScan}
            platformLabel={platformLabel}
            reauditing={reauditLoading}
            recentScans={recentScans}
            report={report}
          />
        ) : (
          <CenteredLoading label="Loading workspace..." />
        )}
      </main>
      <FloatingFeedback />
    </div>
  );
}

// --- Empty state when no domains ---
function EmptyDomainState() {
  const {
    addDomainInput,
    setAddDomainInput,
    handleAddDomain,
    addError,
    confirmChecked,
    setConfirmChecked,
    inputFaviconUrl,
  } = useDomainContext();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Plus className="h-6 w-6 text-zinc-300" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Add your first domain</h2>
      <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-6 text-zinc-500">
        Start monitoring your AI visibility by adding a domain. You can also add domains from the sidebar.
      </p>

      <div className="mx-auto mt-6 w-full max-w-[420px] space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-[#1b1b1c] px-3">
            {inputFaviconUrl ? (
              <img src={inputFaviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
            ) : (
              <Globe2 className="h-4 w-4 shrink-0 text-zinc-500" />
            )}
            <input
              type="text"
              value={addDomainInput}
              onChange={(e) => setAddDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAddDomain()}
              placeholder="example.com"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAddDomain()}
            className="h-11 shrink-0 rounded-lg bg-[var(--color-primary)] px-5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Add
          </button>
        </div>
        {addError && <p className="text-[11px] text-red-400">{addError}</p>}
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-zinc-400"
          />
          <span className="text-[12px] leading-5 text-zinc-500">
            I confirm that I own this domain or have authorization to monitor it.
          </span>
        </label>
      </div>
    </div>
  );
}

// --- Domain Workspace: header + section router ---
function DomainWorkspace({
  activeSection,
  actionError,
  domain,
  expandedSite,
  files,
  loadError,
  loadingWorkspace,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
  onReaudit,
  onRunFirstScan,
  platformLabel,
  reauditing,
  recentScans,
  report,
}: {
  activeSection: ActiveSection;
  actionError: string;
  domain: string;
  expandedSite: SiteSummary;
  files: import('./lib/types').FilesData | null;
  loadError: string;
  loadingWorkspace: boolean;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
  onReaudit: () => void;
  onRunFirstScan: (site: SiteSummary) => void;
  platformLabel: string | null;
  reauditing: boolean;
  recentScans: import('./lib/types').RecentScanData[];
  report: import('./lib/types').DashboardReportData | null;
}) {
  const siteUrl = expandedSite.url;

  const header = (
    <DomainHeader
      domain={domain}
      expandedSite={expandedSite}
      reauditing={reauditing}
      onReaudit={onReaudit}
    />
  );

  if (loadingWorkspace) {
    return <div className="mt-6">{header}<div className="mt-6"><CenteredWorkspaceState label="Loading this domain workspace..." /></div></div>;
  }
  if (loadError && !report) {
    return <div className="mt-6">{header}<div className="mt-6"><CenteredWorkspaceState label={loadError} tone="error" /></div></div>;
  }
  if (!expandedSite.latestScan) {
    return (
      <div className="mt-6">{header}
        <div className="mt-6 rounded-[1.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,13,14,0.98)_0%,rgba(8,8,9,0.99)_100%)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#25c972]">Domain unlocked</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Run the first scan for {domain}</h3>
          <p className="mt-3 max-w-[42rem] text-[13px] leading-6 text-zinc-400">This domain is now in your paid advanced workspace. Generate its first report to see the full dashboard.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniInfoTile title="1. Scan" body="Generate the first report for this domain." />
            <MiniInfoTile title="2. Expand" body="Re-open this card to see scores, fixes, and deploy tools." />
            <MiniInfoTile title="3. Ship" body="Use the roadmap, deploy assets, and verification steps inline." />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => onRunFirstScan(expandedSite)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              <RefreshCw className="h-4 w-4" />Run first scan
            </button>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
              Visit site<ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }
  if (!report) {
    return <div className="mt-6">{header}<div className="mt-6"><CenteredWorkspaceState label="Open this domain again after the report is ready." /></div></div>;
  }

  return (
    <div className="mt-6 space-y-6">
      {header}
      {actionError && <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">{actionError}</div>}

      {activeSection === 'dashboard' && (
        <DashboardSection
          report={report}
          recentScans={recentScans}
          domain={domain}
          monitoringConnected={monitoringConnected}
          monitoringLoading={monitoringLoading}
          onEnableMonitoring={onEnableMonitoring}
        />
      )}

      {activeSection === 'brand' && (
        <BrandSection report={report} files={files} domain={domain} platformLabel={platformLabel} />
      )}

      {activeSection === 'competitors' && <CompetitorsSection domain={domain} />}

      {activeSection === 'settings' && (
        <SettingsSection
          domain={domain}
          monitoringConnected={monitoringConnected}
          monitoringLoading={monitoringLoading}
          onEnableMonitoring={onEnableMonitoring}
        />
      )}
    </div>
  );
}

// --- Unpaid Landing (simplified) ---
function UnpaidLanding({
  addError,
  confirmChecked,
  domainInput,
  inputFaviconUrl,
  onAddDomain,
  onConfirmChange,
  onDomainInputChange,
  onOpenUnlock,
  pendingDomain,
}: {
  addError: string | null;
  confirmChecked: boolean;
  domainInput: string;
  inputFaviconUrl: string | null;
  onAddDomain: () => void;
  onConfirmChange: (value: boolean) => void;
  onDomainInputChange: (value: string) => void;
  onOpenUnlock: () => void;
  pendingDomain: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="text-white">
      <div className="mx-auto max-w-[840px] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <h1 className="text-center text-[2rem] font-bold tracking-tight text-white sm:text-[2.25rem]">Advanced</h1>
        <p className="mx-auto mt-2 max-w-[540px] text-center text-[13px] leading-6 text-zinc-400">Daily monitoring, live badges, certified pages, and automatic backlinks for your domains.</p>

        <div className="mx-auto mt-7 w-full max-w-[520px] rounded-xl border border-amber-500/65 bg-[linear-gradient(180deg,rgba(16,12,7,0.98)_0%,rgba(7,7,7,0.98)_100%)] p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-amber-400">Upgrade for full access</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">Daily monitoring, instant alerts, certified pages, and backlinks.</p>
          <div className="mt-5"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">Everything you get</p>
            <ul className="space-y-2">{UPGRADE_FEATURES.map((f) => (<li key={f} className="flex items-center gap-2.5 text-[13px] text-zinc-100"><CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" /><span>{f}</span></li>))}</ul>
          </div>
          <button type="button" onClick={onOpenUnlock} className="mt-6 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#f7a300] px-5 text-[0.95rem] font-semibold text-black transition-colors hover:bg-[#ffaf19]">
            <Crown className="h-4 w-4" />Unlock All Features
          </button>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-[520px] flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-[#1b1b1c] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
              {inputFaviconUrl ? <img src={inputFaviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" /> : <span className="h-3.5 w-3.5 shrink-0 text-[#4ea1ff]" />}
              <input ref={inputRef} type="text" value={domainInput} onChange={(e) => onDomainInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onAddDomain()} placeholder="example.com" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none" />
            </div>
            <button type="button" onClick={onAddDomain} className="h-11 shrink-0 rounded-lg bg-[#d6d6d6] px-6 text-[13px] font-medium text-black transition-colors hover:bg-white">Add domain</button>
          </div>
          {addError ? <p className="text-[11px] text-red-400">{addError}</p> : null}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/8 bg-[#161616] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <input type="checkbox" checked={confirmChecked} onChange={(e) => onConfirmChange(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/15 bg-transparent accent-zinc-400" />
            <span className="text-[12px] leading-6 text-zinc-500">I confirm that I own this domain or have explicit authorization from the domain owner to monitor it.</span>
          </label>
        </div>

        {pendingDomain ? (
          <div className="mx-auto mt-7 w-full max-w-[840px] rounded-[1.35rem] border border-[#f7a300]/30 bg-[linear-gradient(180deg,rgba(18,15,10,0.98)_0%,rgba(10,10,10,0.98)_100%)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/85">Ready to unlock</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-white">{pendingDomain} will become your first advanced workspace</h3>
            <p className="mt-2 max-w-[38rem] text-[13px] leading-6 text-zinc-400">After payment, the full access card disappears, this domain moves to the top, and you can expand it on this same page.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MiniInfoTile title="Unlock" body="Confirm payment to activate monitoring and advanced tooling for this domain." />
              <MiniInfoTile title="Expand" body="Open the domain inline on this page instead of leaving the advanced route." />
              <MiniInfoTile title="Run first scan" body="Generate the first report when you are ready, then the dashboard appears." />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={onOpenUnlock} className="inline-flex items-center gap-2 rounded-xl bg-[#f7a300] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#ffaf19]"><Crown className="h-4 w-4" />Unlock advanced for {pendingDomain}</button>
              <button type="button" onClick={focusInput} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.05] hover:text-white">Change domain</button>
            </div>
          </div>
        ) : (
          <div role="button" tabIndex={0} onClick={focusInput} onKeyDown={(e) => e.key === 'Enter' && focusInput()} className="mx-auto mt-7 flex min-h-[220px] w-full max-w-[840px] cursor-pointer flex-col items-center justify-center rounded-xl border border-white/8 bg-[#101010] px-6 py-9 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] transition-colors hover:border-white/12 hover:bg-[#121212]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]"><span className="text-2xl text-zinc-300">+</span></div>
            <h3 className="mt-5 text-[1.35rem] font-semibold tracking-tight text-white">Add a domain to prepare your paid workspace</h3>
            <p className="mx-auto mt-2 max-w-[520px] text-[13px] leading-6 text-zinc-500">Choose the site you want to unlock first.</p>
          </div>
        )}

        <FloatingFeedback bottomClassName="bottom-4" compact />
      </div>
    </div>
  );
}

export { AdvancedPageContent };
