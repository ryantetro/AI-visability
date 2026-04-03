'use client';

import { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Crown,
  FileText,
  Globe2,
  Heart,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { MiniInfoTile } from '@/components/app/dashboard-primitives';
import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { LockedFeatureOverlay } from '@/components/ui/locked-feature-overlay';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { cn } from '@/lib/utils';
import { useDomainContext } from '@/contexts/domain-context';
import { usePlan } from '@/hooks/use-plan';
import { canAccess, NAV_GATES, type PlanTier } from '@/lib/pricing';

import { RoadmapView } from './roadmap-view';
import { CenteredLoading, CenteredWorkspaceState } from './panels/shared';

// Section components
import { DashboardSection } from './dashboard/dashboard-section';
import { ReportSection } from './report/report-section';
import { BrandSection } from './brand/brand-section';
import { CompetitorsSection } from './competitors/competitors-section';
import { SettingsSection } from './settings/settings-section';

import type { SiteSummary } from './lib/types';

type ActiveSection = 'dashboard' | 'report' | 'brand' | 'competitors' | 'settings';

function AdvancedPageContent({ reportId }: { reportId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReportId = reportId ?? '';
  const roadmapTab = searchParams.get('tab') === 'roadmap';
  const sectionParam = searchParams.get('section') as ActiveSection | null;
  const activeSection: ActiveSection = sectionParam && ['report', 'brand', 'competitors', 'settings'].includes(sectionParam)
    ? sectionParam as ActiveSection
    : 'dashboard';

  const { tier, loading: planLoading } = usePlan();

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
    handleDisableMonitoring,
    unlockModalOpen,
    setUnlockModalOpen,
    handleUnlockComplete,
    unlockLoading,
    pendingDomain,
    debugPaidPreview,
    checkoutBanner,
    dismissCheckoutBanner,
    inputFaviconUrl,
  } = useDomainContext();

  // --- Render ---
  if (recentLoading || planLoading) return <CenteredLoading label="Preparing your advanced workspace..." />;

  if (roadmapTab) {
    return (
      <div className="text-gray-900">
        <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="inline-block rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600">Internal Roadmap</span>
            <Link href="/dashboard" className="text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-900">Exit roadmap &rarr;</Link>
          </div>
          <RoadmapView />
        </main>
        <FloatingFeedback />
      </div>
    );
  }

  // Workspace — free users see Dashboard + Report with upgrade CTAs, paid users get everything
  const isFreeUser = !hasPaidAccess;
  const isMonitoring = selectedDomain ? Boolean(monitoringConnected[selectedDomain]) : false;
  const platformLabel = files ? formatPlatformLabel(files.detectedPlatform) : null;

  return (
    <div className="text-gray-900">
      <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {debugPaidPreview && (
          <div className="mb-4 flex justify-end">
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] text-blue-700">
              <Sparkles className="h-4 w-4" /><span>Debug preview active</span>
              <button type="button" onClick={() => router.push(initialReportId ? `/dashboard?report=${initialReportId}` : '/dashboard')} className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-100">Exit</button>
            </div>
          </div>
        )}

        {checkoutBanner && (
          <div className="mb-4 rounded-2xl border border-[#25c972]/30 bg-[#25c972]/10 px-4 py-3 text-sm text-[#25c972]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0">{checkoutBanner}</p>
              </div>
              <button
                type="button"
                onClick={dismissCheckoutBanner}
                aria-label="Dismiss message"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#25c972]/80 transition-colors hover:bg-[#25c972]/12 hover:text-[#9af1be]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* No domains — free users see onboarding dashboard, paid users see empty domain state */}
        {monitoredSites.length === 0 && isFreeUser ? (
          <FreeDashboard
            recentScans={recentScans}
            onOpenUnlock={() => setUnlockModalOpen(true)}
            tier={tier}
          />
        ) : monitoredSites.length === 0 ? (
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
            onDisableMonitoring={handleDisableMonitoring}
            onReaudit={handleReaudit}
            onRunFirstScan={handleRunFirstScan}
            platformLabel={platformLabel}
            reauditing={reauditLoading}
            recentScans={recentScans}
            report={report}
            tier={tier}
            onOpenUnlock={() => setUnlockModalOpen(true)}
          />
        ) : (
          <CenteredLoading label="Loading workspace..." />
        )}
      </main>
      <FloatingFeedback />
      <UnlockFeaturesModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} onUnlock={handleUnlockComplete} loading={unlockLoading} />
    </div>
  );
}

// --- Free User Dashboard Shell ---
function FreeDashboard({
  recentScans,
  onOpenUnlock,
  tier,
}: {
  recentScans: import('./lib/types').RecentScanData[];
  onOpenUnlock: () => void;
  tier: PlanTier;
}) {
  // Find most recent scan to show score
  const latestScan = recentScans.find((s) => s.status === 'complete' && s.score != null);
  const score = latestScan?.score ?? latestScan?.scores?.aiVisibility ?? null;

  return (
    <div className="text-gray-900">
      <div className="mx-auto max-w-[900px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* Upgrade banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Free Plan</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Upgrade to unlock your full dashboard</h2>
              <p className="mt-1 text-[13px] text-gray-500">Get monitoring, reports, fix tools, and more.</p>
            </div>
            <button
              type="button"
              onClick={onOpenUnlock}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Crown className="h-4 w-4" />
              Upgrade
            </button>
          </div>
        </div>

        {/* Score preview (if they've run a scan) */}
        {score != null ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Your Latest Score</p>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold"
                style={{
                  backgroundColor: score >= 80 ? 'rgba(37,201,114,0.15)' : score >= 60 ? 'rgba(255,138,30,0.15)' : 'rgba(255,82,82,0.15)',
                  color: score >= 80 ? '#25c972' : score >= 60 ? '#ff8a1e' : '#ff5252',
                }}
              >
                {Math.round(score)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">AI Visibility Score</p>
                <p className="text-[12px] text-gray-500">Run another scan or upgrade to see your full report.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Link href="/#scan" className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-200">
                <Search className="h-3.5 w-3.5" />
                Run New Scan
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Run your first scan</h3>
            <p className="mt-2 text-[13px] text-gray-500">See how AI search engines view your website.</p>
            <Link
              href="/#scan"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              Start Free Scan
            </Link>
          </div>
        )}

        {/* Locked feature preview cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <LockedPreviewCard
            icon={<FileText className="h-5 w-5 text-gray-400" />}
            title="Report"
            description="Full AI visibility report with check-by-check analysis and fix instructions."
            requiredTier="Starter"
            onUpgrade={onOpenUnlock}
          />
          <LockedPreviewCard
            icon={<Heart className="h-5 w-5 text-gray-400" />}
            title="Brand & Prompts"
            description="Track brand mentions and prompt performance across AI engines."
            requiredTier="Starter"
            onUpgrade={onOpenUnlock}
          />
          <LockedPreviewCard
            icon={<Users className="h-5 w-5 text-gray-400" />}
            title="Competitor Radar"
            description="Monitor competitor visibility and compare your AI presence."
            requiredTier="Pro"
            onUpgrade={onOpenUnlock}
          />
        </div>

        <FloatingFeedback bottomClassName="bottom-4" compact />
      </div>
    </div>
  );
}

function LockedPreviewCard({
  icon,
  title,
  description,
  requiredTier,
  onUpgrade,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  requiredTier: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white">
          {icon}
        </div>
        <Lock className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-[12px] leading-5 text-gray-500">{description}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600">
        {requiredTier} plan
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        Upgrade to unlock
        <ArrowRight className="h-3 w-3" />
      </button>
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
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
        <Plus className="h-6 w-6 text-gray-400" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900">Add your first domain</h2>
      <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-6 text-gray-500">
        Start monitoring your AI visibility by adding a domain. You can also add domains from the sidebar.
      </p>

      <div className="mx-auto mt-6 w-full max-w-[420px] space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3">
            {inputFaviconUrl ? (
              <img src={inputFaviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
            ) : (
              <Globe2 className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            <input
              type="text"
              value={addDomainInput}
              onChange={(e) => setAddDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAddDomain()}
              placeholder="example.com"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
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
        {addError && <p className="text-[11px] text-red-500">{addError}</p>}
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-gray-500"
          />
          <span className="text-[12px] leading-5 text-gray-500">
            I confirm that I own this domain or have authorization to monitor it.
          </span>
        </label>
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-[520px] gap-3 sm:grid-cols-3">
        <MiniInfoTile title="AI Visibility Score" body="See how ChatGPT, Perplexity, and Claude rank your site" />
        <MiniInfoTile title="Mention Tracking" body="Track which prompts trigger mentions of your business" />
        <MiniInfoTile title="Fix Roadmap" body="Get prioritized fixes to improve your visibility" />
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
  onDisableMonitoring,
  onReaudit,
  onRunFirstScan,
  platformLabel,
  reauditing,
  recentScans,
  report,
  tier,
  onOpenUnlock,
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
  onDisableMonitoring: () => void;
  onReaudit: () => void;
  onRunFirstScan: (site: SiteSummary) => void;
  platformLabel: string | null;
  reauditing: boolean;
  recentScans: import('./lib/types').RecentScanData[];
  report: import('./lib/types').DashboardReportData | null;
  tier: PlanTier;
  onOpenUnlock: () => void;
}) {
  const siteUrl = expandedSite.url;

  if (loadingWorkspace) {
    return <div className="mt-6"><div className="mt-6"><CenteredWorkspaceState label="Loading this domain workspace..." /></div></div>;
  }
  if (loadError === 'Scan not complete' && !report) {
    return <div className="mt-6"><div className="mt-6"><CenteredWorkspaceState label="Finishing the latest scan and AI mentions..." /></div></div>;
  }
  if (loadError && !report) {
    return <div className="mt-6"><div className="mt-6"><CenteredWorkspaceState label={loadError} tone="error" /></div></div>;
  }
  if (!expandedSite.latestScan) {
    return (
      <div className="mt-6">
        <div className="mt-6 rounded-[1.2rem] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">Domain unlocked</p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">Run the first scan for {domain}</h3>
          <p className="mt-3 max-w-[42rem] text-[13px] leading-6 text-gray-500">This domain is now in your advanced workspace. Generate its first report to see the full dashboard.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniInfoTile title="1. Scan" body="Generate the first report for this domain." />
            <MiniInfoTile title="2. Expand" body="Re-open this card to see scores, fixes, and deploy tools." />
            <MiniInfoTile title="3. Ship" body="Use the roadmap, deploy assets, and verification steps inline." />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => onRunFirstScan(expandedSite)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              <RefreshCw className="h-4 w-4" />Run first scan
            </button>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
              Visit site<ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }
  if (!report) {
    return <div className="mt-6"><div className="mt-6"><CenteredWorkspaceState label="Open this domain again after the report is ready." /></div></div>;
  }

  return (
    <div className="mt-6 space-y-6">
      {actionError && <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">{actionError}</div>}

      {activeSection === 'dashboard' && (
        canAccess(tier, NAV_GATES.dashboard as PlanTier) ? (
          <DashboardSection
            report={report}
            recentScans={recentScans}
            domain={domain}
            lastScannedAt={expandedSite.lastTouchedAt}
            monitoringConnected={monitoringConnected}
            monitoringLoading={monitoringLoading}
            onEnableMonitoring={onEnableMonitoring}
            onReaudit={onReaudit}
            reauditing={reauditing}
          />
        ) : (
          <LockedFeatureOverlay featureName="Dashboard" requiredTier="starter" onUpgrade={onOpenUnlock} />
        )
      )}

      {activeSection === 'report' && (
        canAccess(tier, NAV_GATES.report as PlanTier) ? (
          <ReportSection report={report} files={files} domain={domain} onReaudit={onReaudit} reauditing={reauditing} onOpenUnlock={onOpenUnlock} />
        ) : (
          <LockedFeatureOverlay featureName="Report" requiredTier="starter" onUpgrade={onOpenUnlock} />
        )
      )}

      {activeSection === 'brand' && (
        canAccess(tier, NAV_GATES.brand as PlanTier) ? (
          <BrandSection
            report={report}
            files={files}
            domain={domain}
            platformLabel={platformLabel}
            activeSection="presence"
          />
        ) : (
          <LockedFeatureOverlay featureName="Brand & Prompts" requiredTier="starter" onUpgrade={onOpenUnlock} />
        )
      )}

      {activeSection === 'competitors' && (
        canAccess(tier, NAV_GATES.competitors as PlanTier) ? (
          <CompetitorsSection domain={domain} />
        ) : (
          <LockedFeatureOverlay featureName="Competitor Radar" requiredTier="pro" onUpgrade={onOpenUnlock} />
        )
      )}

      {activeSection === 'settings' && (
        canAccess(tier, NAV_GATES.settings as PlanTier) ? (
          <SettingsSection
            domain={domain}
            monitoringConnected={monitoringConnected}
            monitoringLoading={monitoringLoading}
            onEnableMonitoring={onEnableMonitoring}
            onDisableMonitoring={onDisableMonitoring}
          />
        ) : (
          <LockedFeatureOverlay featureName="Settings" requiredTier="starter" onUpgrade={onOpenUnlock} />
        )
      )}
    </div>
  );
}

export { AdvancedPageContent };
