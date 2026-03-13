'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  Gauge,
  Globe2,
  HelpCircle,
  Info,
  LayoutDashboard,
  Linkedin,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Twitter,
  X,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { getDomain, getFaviconUrl } from '@/lib/url-utils';
import { useScanProgress } from '@/hooks/use-scan-progress';
import { ProgressChecklist } from '@/components/ui/progress-checklist';
import { ScoreRing } from '@/components/ui/score-ring';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { ImpactBadge } from '@/components/ui/impact-badge';
import { EffortBadge } from '@/components/ui/effort-badge';
import { PromptCopyPanel } from '@/components/ui/prompt-copy-panel';
import { CheckRow } from '@/components/ui/check-row';
import { FilterBar } from '@/components/ui/filter-bar';
import { RangeBar } from '@/components/ui/range-bar';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { AppShellNav } from '@/components/app/app-shell-nav';
import { ScoreSummaryHero } from '@/components/app/score-summary-hero';
import { UrlInput } from '@/components/ui/url-input';
import { YwsBreakdownSection, type CheckItem } from '@/components/ui/yws-breakdown-section';
import { getRecentScanEntries, rememberRecentScan } from '@/lib/recent-scans';
import { EffortBand } from '@/types/score';

interface ReportData {
  id: string;
  url: string;
  enrichments?: {
    webHealth?: {
      status: 'pending' | 'running' | 'complete' | 'unavailable';
      startedAt?: number;
      completedAt?: number;
      error?: string;
    };
  };
  score: {
    total: number;
    maxTotal: number;
    percentage: number;
    band: string;
    bandInfo: { band: string; label: string; color: string };
    overallBand?: string;
    overallBandInfo?: { band: string; label: string; color: string };
    scores: {
      aiVisibility: number;
      webHealth: number | null;
      overall: number | null;
      potentialLift: number | null;
    };
    dimensions: {
      key: string;
      label: string;
      score: number;
      maxScore: number;
      percentage: number;
      checks: {
        id: string;
        category: 'ai';
        label: string;
        verdict: 'pass' | 'fail' | 'unknown';
        points: number;
        maxPoints: number;
        detail: string;
      }[];
    }[];
    fixes: FixData[];
    webHealth?: WebHealthSummaryData;
  };
  webHealth?: WebHealthSummaryData | null;
  fixes?: FixData[];
  copyToLlm?: {
    fullPrompt: string;
    remainingFixesPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  };
  share?: {
    publicUrl: string;
    badgeSvgUrl: string;
    opengraphImageUrl: string;
  };
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  hasPaid: boolean;
}

interface FixData {
  checkId: string;
  label: string;
  detail: string;
  category: 'ai' | 'web';
  instruction: string;
  pointsAvailable: number;
  estimatedLift: number;
  effort: number;
  effortBand: EffortBand;
  roi: number;
  copyPrompt: string;
  actualValue?: string;
  expectedValue?: string;
}

interface WebHealthMetricData {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  status: 'ok' | 'warn' | 'unavailable';
  detail: string;
}

interface WebHealthPillarCheckData {
  id: string;
  category: 'web';
  pillar: 'performance' | 'quality' | 'security';
  label: string;
  verdict: 'pass' | 'fail' | 'unknown';
  points: number;
  maxPoints: number;
  detail: string;
}

interface WebHealthPillarData {
  key: 'performance' | 'quality' | 'security';
  label: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  status: 'pending' | 'running' | 'complete' | 'unavailable';
  checks: WebHealthPillarCheckData[];
}

interface WebHealthSummaryData {
  status: 'pending' | 'running' | 'complete' | 'unavailable';
  percentage: number | null;
  source?: 'heuristic' | 'pagespeed';
  updatedAt?: number;
  error?: string;
  metrics: WebHealthMetricData[];
  pillars: WebHealthPillarData[];
}

interface VerificationInstructionsData {
  domain: string;
  token: string;
  metaTag: string;
  filePath: string;
  fileContents: string;
}

interface RecentScanCardData {
  id: string;
  url: string;
  status: string;
  hasEmail: boolean;
  score?: number;
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  createdAt: number;
  completedAt?: number;
}

const premiumPanelClass =
  'rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(10,10,12,0.94)_0%,rgba(5,6,7,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.024),0_10px_22px_rgba(0,0,0,0.16)]';

const premiumInsetClass =
  'rounded-[1.25rem] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022)_0%,rgba(255,255,255,0.012)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';

const fullReportTabMeta: Record<
  'overview' | 'repair-queue' | 'dimensions' | 'share',
  { title: string; description: string }
> = {
  overview: {
    title: 'Report overview',
    description: 'Scores, quick wins, and the implementation brief in one place.',
  },
  'repair-queue': {
    title: 'Repair queue',
    description: 'Start with the highest-impact fixes first.',
  },
  dimensions: {
    title: 'Breakdown',
    description: 'See exactly how AI Visibility and Web Health were scored.',
  },
  share: {
    title: 'Share report',
    description: 'Public link, verification, and badge setup.',
  },
};

function statusTheme(status: 'running' | 'complete' | 'failed' | 'queued') {
  if (status === 'failed') return { bg: 'bg-[color:rgba(255,82,82,0.10)]', text: 'text-[var(--color-error)]', dot: 'bg-[var(--color-error)]' };
  if (status === 'complete') return { bg: 'bg-[color:rgba(37,201,114,0.10)]', text: 'text-[var(--color-success)]', dot: 'bg-[var(--color-success)]' };
  if (status === 'running') return { bg: 'bg-[color:rgba(255,138,30,0.10)]', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)] animate-pulse' };
  return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' };
}

function formatDate(timestamp?: number) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(timestamp?: number) {
  if (!timestamp) return '--';
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--color-warning)';
  if (score >= 80) return '#25c972';
  if (score >= 60) return '#ff8a1e';
  return '#ff5252';
}

function getAnalysisHref(scan: Pick<RecentScanCardData, 'id' | 'hasEmail' | 'status'>) {
  const mode = scan.hasEmail && scan.status === 'complete' ? 'report' : 'scan';
  return `/analysis?${mode}=${scan.id}`;
}

function enrichmentLabel(status?: 'pending' | 'running' | 'complete' | 'unavailable') {
  if (status === 'complete') return 'Ready';
  if (status === 'running') return 'Updating';
  if (status === 'unavailable') return 'Unavailable';
  return 'Queued';
}

function buildSharePostText(domain: string, score: number, shareUrl: string) {
  return `My website scored ${score}/100 (${domain})\nCheck your score at ${shareUrl}`;
}

function openXShareIntent(text: string) {
  window.open(
    `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer,width=760,height=720'
  );
}

type CheckSource = { id?: string; label: string; verdict: string; detail: string; points: number; maxPoints: number };

function toCheckItems(checks: CheckSource[]): CheckItem[] {
  return checks.map((c) => ({
    label: c.label,
    detail: c.detail,
    verdict: c.verdict as 'pass' | 'fail' | 'unknown',
    points: c.points,
    maxPoints: c.maxPoints,
  }));
}

function buildWebsiteQualityChecks(
  webHealth: { pillars: Array<{ key: string; checks: CheckSource[] }> } | null | undefined,
  dimensions: Array<{ key: string; checks: CheckSource[] }> | null | undefined
): CheckItem[] {
  const qualityChecks =
    webHealth?.pillars
      ?.find((p) => p.key === 'quality')
      ?.checks?.filter((c) => c.id !== 'whq-open-graph' && c.id !== 'whq-twitter') ?? [];
  const fileChecks = dimensions?.find((d) => d.key === 'file-presence')?.checks ?? [];
  const labelMap: Record<string, string> = {
    'Title tag length': 'Title',
    'Meta description length': 'Meta Description',
    'Favicon present': 'Favicon',
    'Viewport meta configured': 'Viewport meta',
    'Heading hierarchy': 'Headings',
    'Canonical URL': 'Canonical URL',
    'HTML lang attribute': 'HTML lang',
    'Character encoding': 'Character encoding',
    'Open Graph coverage': 'Open Graph',
    'Twitter card coverage': 'Twitter Cards',
    'Structured data is parseable': 'Schema.org JSON-LD',
    'robots.txt exists': 'robots.txt',
    'llms.txt file exists': 'llms.txt',
    'sitemap.xml exists': 'Sitemap',
    'Sitemap referenced in robots.txt': 'Sitemap in robots.txt',
  };
  const all = [...qualityChecks, ...fileChecks].map((c) => ({
    ...c,
    label: labelMap[c.label] ?? c.label,
  }));
  return toCheckItems(all);
}

function buildSecurityChecks(
  webHealth: { pillars: Array<{ key: string; checks: CheckSource[] }> } | null | undefined
): CheckItem[] {
  const checks = webHealth?.pillars?.find((p) => p.key === 'security')?.checks ?? [];
  const labelMap: Record<string, string> = {
    'HTTPS enabled': 'HTTPS',
    'Strict-Transport-Security': 'HTTP Strict Transport Security',
    'Content-Security-Policy': 'Content Security Policy',
    'X-Frame-Options': 'Frame Protection',
    'X-Content-Type-Options': 'MIME Type Protection',
  };
  return toCheckItems(checks.map((c) => ({ ...c, label: labelMap[c.label] ?? c.label })));
}

function buildPerformanceChecks(
  webHealth: { pillars: Array<{ key: string; checks: CheckSource[] }> } | null | undefined
): CheckItem[] {
  const checks = webHealth?.pillars?.find((p) => p.key === 'performance')?.checks ?? [];
  return toCheckItems(checks);
}

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get('scan');
  const reportId = searchParams.get('report');
  const id = reportId || scanId || '';
  const { data, loading, error } = useScanProgress(id || null);
  const revealRingTargetRef = useRef<HTMLDivElement | null>(null);

  const [emailSubmitted, setEmailSubmitted] = useState(Boolean(reportId));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [reauditLoading, setReauditLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [sharePostCopied, setSharePostCopied] = useState(false);
  const [reportPromptCopied, setReportPromptCopied] = useState(false);
  const [remainingFixesCopied, setRemainingFixesCopied] = useState(false);
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationInstructions, setVerificationInstructions] = useState<VerificationInstructionsData | null>(null);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScanCardData[]>([]);

  const emptyState = !scanId && !reportId;

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      setShareUrl(`${window.location.origin}/score/${id}`);
    }
  }, [id]);

  useEffect(() => {
    setReport(null);
    setEmailSubmitted(Boolean(reportId));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    rememberRecentScan(id);
  }, [id]);

  useEffect(() => {
    if (!emptyState) return;

    let active = true;
    const recentIds = getRecentScanEntries().map((entry) => entry.id);

    if (recentIds.length === 0) {
      setRecentScans([]);
      return;
    }

    async function loadRecentScans() {
      const results = await Promise.all(
        recentIds.map(async (recentId) => {
          try {
            const res = await fetch(`/api/scan/${recentId}`);
            if (!res.ok) return null;
            return (await res.json()) as RecentScanCardData;
          } catch {
            return null;
          }
        })
      );

      if (!active) return;
      setRecentScans(
        results
          .filter((entry): entry is RecentScanCardData => Boolean(entry))
          .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
      );
    }

    void loadRecentScans();

    return () => {
      active = false;
    };
  }, [emptyState]);

  type TabId = 'overview' | 'repair-queue' | 'dimensions' | 'share';
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'ai' | 'web'>('all');
  const [effortFilter, setEffortFilter] = useState<'all' | EffortBand>('all');
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'quick-wins'>('all');
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.slice(1);
    return (hash === 'repair-queue' || hash === 'dimensions' || hash === 'share' || hash === 'overview')
      ? hash
      : 'overview';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'repair-queue' || hash === 'dimensions' || hash === 'share' || hash === 'overview') {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`);
    }
  };

  const isScanning =
    data?.status === 'crawling' ||
    data?.status === 'scoring' ||
    data?.status === 'pending';
  const isComplete = data?.status === 'complete';
  const isFailed = data?.status === 'failed';

  const statusKey: 'running' | 'complete' | 'failed' | 'queued' = isScanning
    ? 'running'
    : isComplete
      ? 'complete'
      : isFailed
        ? 'failed'
        : 'queued';

  const statusLabel =
    statusKey === 'running'
      ? 'Analyzing'
      : statusKey === 'complete'
        ? 'Complete'
        : statusKey === 'failed'
          ? 'Failed'
          : 'Queued';

  const statusStyles = statusTheme(statusKey);

  const progressChecks = (data?.progress?.checks ?? []) as {
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
  }[];

  const totalChecks = progressChecks.length;
  const doneChecks = progressChecks.filter((item) => item.status === 'done').length;
  const runningChecks = progressChecks.filter((item) => item.status === 'running').length;
  const errorChecks = progressChecks.filter((item) => item.status === 'error').length;

  const progressPercent =
    totalChecks > 0
      ? Math.round(((doneChecks + runningChecks * 0.5) / totalChecks) * 100)
      : 0;

  const currentStep =
    data?.progress?.currentStep ??
    progressChecks.find((item) => item.status === 'running')?.label ??
    (progressChecks.length > 0 ? progressChecks[progressChecks.length - 1]?.label : 'Initializing');

  const reportDimensions = report?.score.dimensions ?? [];
  const reportFixes = report?.fixes ?? report?.score.fixes ?? [];
  const webHealth = report?.webHealth ?? report?.score.webHealth ?? null;
  const scoreSnapshot = report?.scores ?? report?.score.scores ?? null;
  const webChecks = webHealth?.pillars.flatMap((pillar) => pillar.checks) ?? [];
  const webHealthStatus = report?.enrichments?.webHealth?.status ?? webHealth?.status ?? 'pending';

  const allChecks = [...reportDimensions.flatMap((dimension) => dimension.checks), ...webChecks];
  const failedCount = allChecks.filter((item) => item.verdict === 'fail').length;
  const passedCount = allChecks.filter((item) => item.verdict === 'pass').length;
  const unknownCount = allChecks.filter((item) => item.verdict === 'unknown').length;

  const topFixes = reportFixes.slice(0, 3);
  const teaserFixes = reportFixes.length > 0 ? topFixes : (data?.previewFixes ?? []);
  const totalLift = scoreSnapshot?.potentialLift ?? topFixes.reduce((sum, fix) => sum + fix.estimatedLift, 0);

  const weakestDimension =
    reportDimensions.length > 0
      ? reportDimensions.reduce((worst, current) =>
          current.percentage < worst.percentage ? current : worst
        )
      : null;
  const strongestDimension =
    reportDimensions.length > 0
      ? reportDimensions.reduce((best, current) =>
          current.percentage > best.percentage ? current : best
        )
      : null;

  const aiRadarData = reportDimensions.map((dimension) => ({
    label: shortDimensionLabel(dimension.label),
    fullLabel: dimension.label,
    score: Math.round(dimension.percentage),
  }));

  const aiStatusChartData = reportDimensions.map((dimension) => ({
    label: shortDimensionLabel(dimension.label),
    fullLabel: dimension.label,
    pass: dimension.checks.filter((check) => check.verdict === 'pass').length,
    fail: dimension.checks.filter((check) => check.verdict === 'fail').length,
    unknown: dimension.checks.filter((check) => check.verdict === 'unknown').length,
  }));

  const webPillarChartData =
    webHealth?.pillars?.map((pillar) => ({
      label: pillar.label,
      score: pillar.percentage ?? 0,
    })) ?? [];

  const issueMixData = [
    { name: 'Pass', value: passedCount, color: 'var(--color-success)' },
    { name: 'Fail', value: failedCount, color: 'var(--color-error)' },
    { name: 'Unknown', value: unknownCount, color: 'var(--color-warning)' },
  ].filter((item) => item.value > 0);

  const dimensionPressureData = [...reportDimensions]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 4)
    .map((dimension) => ({
      label: dimension.label,
      score: Math.round(dimension.percentage),
      misses: dimension.checks.filter((check) => check.verdict === 'fail').length,
    }));

  const domain = data?.url ? getDomain(data.url) : 'Unknown domain';
  const shareScore = scoreSnapshot?.overall ?? report?.score?.percentage ?? 0;
  const sharePostText = buildSharePostText(domain, shareScore, shareUrl);
  const filteredFixes = reportFixes.filter((fix) => {
    if (categoryFilter !== 'all' && fix.category !== categoryFilter) return false;
    if (effortFilter !== 'all' && fix.effortBand !== effortFilter) return false;
    if (impactFilter === 'high' && fix.estimatedLift < 6) return false;
    if (impactFilter === 'quick-wins' && (fix.effortBand !== 'quick' || fix.estimatedLift < 3)) return false;
    return true;
  });


  useEffect(() => {
    if (!id) return;
    if (!reportId && !data?.hasEmail) return;
    if (report || loadingReport) return;

    let active = true;

    async function loadReport() {
      setEmailSubmitted(true);
      setLoadingReport(true);

      try {
        const res = await fetch(`/api/scan/${id}/report`);
        if (!res.ok) return;
        const payload = await res.json();
        if (!active) return;
        setReport(payload);

        if (!reportId && typeof window !== 'undefined') {
          const hash = window.location.hash || '#overview';
          router.replace(`/analysis?report=${id}${hash}`);
        }
      } catch {
        // Silent fallback keeps the reveal route usable even if report load fails.
      } finally {
        if (active) {
          setLoadingReport(false);
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [id, reportId, data?.hasEmail, report, loadingReport, router]);

  useEffect(() => {
    if (report?.share?.publicUrl) {
      setShareUrl(report.share.publicUrl);
      return;
    }
    if (!id || !emailSubmitted || report?.enrichments?.webHealth?.status !== 'running') {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/${id}/report`);
        if (!res.ok) return;
        const payload = await res.json();
        setReport(payload);
      } catch {
        // Ignore silent refresh failures while enrichment finishes.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [id, emailSubmitted, report?.enrichments?.webHealth?.status, report?.share?.publicUrl]);

  const handleEmailSubmit = async (email: string) => {
    void email;
    setActionError('');
    setUnlockModalOpen(false);
    setEmailSubmitted(true);
    setLoadingReport(true);

    try {
      const res = await fetch(`/api/scan/${id}/report`);
      if (res.ok) {
        const payload = await res.json();
        setReport(payload);
        if (typeof window !== 'undefined') {
          const hash = window.location.hash || '#overview';
          router.replace(`/analysis?report=${id}${hash}`);
        }
      }
    } catch {
      // User can refresh and retry.
    } finally {
      setLoadingReport(false);
    }
  };

  const handleReaudit = async () => {
    if (!data?.url) return;

    setActionError('');
    setReauditLoading(true);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url, force: true }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to start a fresh scan');
      }

      router.push(`/analysis?scan=${payload.id}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to start a fresh scan'
      );
    } finally {
      setReauditLoading(false);
    }
  };

  const handleCheckout = async () => {
    setActionError('');
    setCheckoutLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: id }),
      });

      if (!res.ok) {
        throw new Error('Failed to start checkout');
      }

      const session = await res.json();
      router.push(session.url);
    } catch {
      setActionError('Unable to start checkout right now. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleStartAnalysis = async (url: string) => {
    setActionError('');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to start scan');
      }

      router.push(`/analysis?scan=${payload.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start scan');
    }
  };

  const handleCopyReportPrompt = async () => {
    if (!report?.hasPaid) {
      setUnlockModalOpen(true);
      return;
    }
    if (!report?.copyToLlm?.fullPrompt) return;
    try {
      await navigator.clipboard.writeText(report.copyToLlm.fullPrompt);
      setReportPromptCopied(true);
      window.setTimeout(() => setReportPromptCopied(false), 2200);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleCopyRemainingFixes = async () => {
    if (!report?.copyToLlm?.remainingFixesPrompt) return;
    try {
      await navigator.clipboard.writeText(report.copyToLlm.remainingFixesPrompt);
      setRemainingFixesCopied(true);
      window.setTimeout(() => setRemainingFixesCopied(false), 2200);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleCopyFixPrompt = async (checkId: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedFixId(checkId);
      window.setTimeout(() => {
        setCopiedFixId((current) => (current === checkId ? null : current));
      }, 2200);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleStartVerification = async () => {
    setActionError('');
    setVerificationMessage('');
    setVerificationLoading(true);

    try {
      const res = await fetch('/api/domain-verification/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: id,
          enablePublicScore: true,
          enableBadge: true,
          enableLeaderboard: false,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to start verification');
      }

      setVerificationInstructions(payload.instructions);
      setVerificationMessage('Verification started. Publish one of the tokens below, then confirm.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleConfirmVerification = async () => {
    setActionError('');
    setVerificationMessage('');
    setVerificationLoading(true);

    try {
      const res = await fetch('/api/domain-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: getDomain(report?.url ?? data?.url ?? ''),
          enablePublicScore: true,
          enableBadge: true,
          enableLeaderboard: false,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.reason || payload.error || 'Verification not found on the live site yet.');
      }

      setVerificationMessage(`Verification confirmed via ${payload.method}. Public proof is now enabled for this scan.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Verification not found on the live site yet.');
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className={cn('min-h-screen bg-[var(--surface-page)]', report && !report.hasPaid && 'pb-24')}>
      {/* Matte ambient background - subtle for YourWebsiteScore style */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
      </div>

      <AppShellNav
        active="analysis"
        showShare={Boolean(report)}
        onShare={() => {
          if (shareUrl) {
            openXShareIntent(sharePostText);
          }
        }}
        onClearView={() => router.push('/analysis')}
      />
      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ─── Unlock / Upgrade modal (always available) ──────────── */}
        <UnlockFeaturesModal
          open={unlockModalOpen}
          onOpenChange={setUnlockModalOpen}
          scanId={id || undefined}
          onEmailSubmit={handleEmailSubmit}
          loading={loadingReport}
        />

        {/* ─── Analysis Section (always visible) ─────────────────── */}
        <section className="mb-8">
          <h1 className="text-center text-2xl font-semibold text-white sm:text-3xl">Analysis</h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-400">
            Launch a crawl in under 30 seconds and get a ranked hit-list of fixes that lift speed, visibility, and trust.
          </p>

          <div className="mx-auto mt-10 max-w-xl space-y-4">
            {/* Analysis Limit: dark gray bg, thin orange border, progress line */}
            <div className="flex min-h-[60px] flex-col gap-3 rounded-xl border border-amber-500/40 bg-white/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">Analysis Limit</p>
                <div className="mt-1.5 h-1 w-20 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-1/3 rounded-full bg-amber-500/80" />
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">2 analyses left · 1/3 used</p>
              </div>
              <button
                type="button"
                onClick={() => setUnlockModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-zinc-700/90 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-600/90"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                Unlock All Features
              </button>
            </div>

            {/* Upgrade: muted orange accent */}
            <div className="flex min-h-[60px] flex-col gap-3 rounded-xl border border-orange-600/40 bg-orange-900/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 gap-3">
                <Info className="h-4 w-4 shrink-0 text-orange-500/80" />
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Upgrade to run website analyses. You can view an example report to see what you&apos;ll get.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-zinc-700/90 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-600/90"
                >
                  View example
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(true)}
                  className="rounded-lg bg-orange-700 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-orange-600"
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* URL Input: dark gray bg, thin light gray border */}
            <UrlInput
              onSubmit={handleStartAnalysis}
              loading={loading}
              variant="minimal"
              placeholder="website.com"
              submitLabel="Analyze"
              loadingLabel="Analyzing..."
              showGlobeIcon
            />

            {/* Share / Clear view (only when viewing a report) */}
            {!emptyState && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => shareUrl && openXShareIntent(sharePostText)}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-700/90 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-600/90"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/analysis')}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-700/90 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-600/90"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear view
                </button>
              </div>
            )}
          </div>
        </section>

        {actionError && (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/5 px-3.5 py-2.5 text-[13px] text-red-400">
            {actionError}
          </div>
        )}

        {/* ─── Loading state (when we have id but no data yet) ─────── */}
        {id && loading && !data && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
            <p className="mt-4 text-sm text-zinc-400">Loading audit...</p>
          </div>
        )}

        {/* ─── Error state (when we have id but fetch failed) ─────── */}
        {id && !loading && error && !data && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <TriangleAlert className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-white">Unable to load audit</h2>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/analysis')}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#00C853] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00E676]"
            >
              Start new scan
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}


        {/* ─── Main content (when we have data) ───────────────────── */}
        {data && !emptyState && (
          <>
        {/* ─── Header ───────────────────────────────────────────── */}
        {/* Hide header when showing YourWebsiteScore layout (pre-email complete or report) */}
        {!(isComplete && !emailSubmitted) && !report && (
          <header className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                    statusStyles.bg,
                    statusStyles.text
                  )}
                >
                  <span className={cn('h-1 w-1 rounded-full', statusStyles.dot)} />
                  {statusLabel}
                </span>
                <span className="text-[13px] text-zinc-500">{domain}</span>
                {data?.createdAt && (
                  <span className="text-[13px] text-zinc-500">{formatDate(data.createdAt)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {data?.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Visit site
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                {data?.url && (
                  <button
                    type="button"
                    onClick={handleReaudit}
                    disabled={reauditLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3 w-3', reauditLoading && 'animate-spin')} />
                    {reauditLoading ? 'Re-running...' : 'Re-audit'}
                  </button>
                )}
              </div>
            </div>
            <h1 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2rem]">
              {isScanning
                ? 'Building your AI visibility map'
                : isFailed
                  ? 'Audit stopped'
                  : 'Preparing audit'}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-zinc-400">
              {isScanning
                ? 'Analyzing crawl, structure, and entity signals in real time.'
                : isFailed
                  ? 'Something went wrong before we could finish.'
                  : 'Your audit will start shortly.'}
            </p>
          </header>
        )}
        {report && (
          <header className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {fullReportTabMeta[activeTab].title}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {fullReportTabMeta[activeTab].description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {data?.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Visit site
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {data?.url && (
                  <button
                    type="button"
                    onClick={handleReaudit}
                    disabled={reauditLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', reauditLoading && 'animate-spin')} />
                    {reauditLoading ? 'Re-running...' : 'Re-audit'}
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {actionError}
          </div>
        )}

        {/* ─── Scanning State ─────────────────────────────────────── */}
        {isScanning && data?.progress && (
          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Pipeline</p>
                  <h2 className="mt-2 text-[1.25rem] font-semibold tracking-tight text-white">
                    Building your audit in real time
                  </h2>
                </div>
                <div className="rounded-full border border-white/15 bg-[rgba(13,148,136,0.12)] px-3 py-1.5 text-[13px] font-semibold text-[#2dd4bf]">
                  {progressPercent}%
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#0d9488] transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                />
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-lg border border-white/8 bg-[#161616] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Current step
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-white">{currentStep}</p>
                  <p className="mt-3 text-[13px] leading-6 text-zinc-400">
                    We keep the AI score path moving first, then fold in Web Health enrichments without blocking the route transition.
                  </p>
                </div>
                <div className="relative pl-0 lg:pl-4">
                  <div className="absolute left-1.5 top-2 bottom-2 hidden w-px bg-[linear-gradient(180deg,rgba(13,148,136,0.32),transparent_100%)] lg:block" />
                  <ProgressChecklist checks={progressChecks} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                <span>Done {doneChecks}</span>
                <span>Running {runningChecks}</span>
                {errorChecks > 0 ? <span>Errors {errorChecks}</span> : null}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#101010] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Live Preview</p>
              <div className="mt-4 flex justify-center">
                <ScoreRing
                  score={data?.scores?.aiVisibility ?? null}
                  color="#0d9488"
                  size={160}
                  emphasis="hero"
                  label="AI Visibility"
                  loading={data?.scores?.aiVisibility == null}
                  loadingText="Live"
                  caption={
                    data?.scores?.aiVisibility == null
                      ? 'Score appears once the AI audit has enough signal'
                      : 'AI score locked from the completed audit'
                  }
                />
              </div>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-lg border border-white/8 bg-[#161616] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Robots + Sitemap</p>
                  <p className="mt-1.5 text-[13px] text-zinc-400">
                    {progressChecks[0]?.status === 'done' ? 'Mapped' : 'Inspecting crawler access'}
                  </p>
                </div>
                <div className="rounded-lg border border-white/8 bg-[#161616] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Web Health</p>
                  <p className="mt-1.5 text-[13px] text-zinc-400">
                    {data?.enrichments?.webHealth?.status === 'running' ? 'Measuring performance' : 'Queued behind core audit'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Failed State ─────────────────────────────────────── */}
        {isFailed && (
          <section>
            <div className="flex gap-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <TriangleAlert className="h-4 w-4 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.1rem] font-semibold text-white">Audit halted</h2>
                <p className="mt-1 text-[13px] text-zinc-400">
                  {data?.progress?.error || 'An error occurred while scanning the site.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleReaudit}
                    disabled={reauditLoading}
                    className="rounded-lg bg-[#0d9488] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#14b8a6] disabled:opacity-50"
                  >
                    {reauditLoading ? 'Restarting...' : 'Run scan again'}
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Back home
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Score Reveal (pre-email) — YourWebsiteScore layout ─── */}
        {isComplete && data?.score !== undefined && !emailSubmitted && (
          <>
            <section>
              <div className="mb-5">
                <ScoreSummaryHero
                  domain={domain}
                  url={data?.url}
                  dateLabel={data?.createdAt ? formatDateShort(data.createdAt) : undefined}
                  coreRef={revealRingTargetRef}
                  overall={{
                    score: data.scores?.overall ?? data.score,
                    color: scoreColor(data.scores?.overall ?? data.score),
                    label: 'Overall Score',
                    caption: data.bandInfo?.label,
                  }}
                  supporting={[
                    {
                      label: 'Website Quality',
                      score: data?.webHealth?.pillars?.find((p) => p.key === 'quality')?.percentage ?? data?.scores?.webHealth ?? null,
                      color: scoreColor(data?.webHealth?.pillars?.find((p) => p.key === 'quality')?.percentage ?? data?.scores?.webHealth ?? null),
                      caption: undefined,
                    },
                    {
                      label: 'Trust & Security',
                      score: data?.webHealth?.pillars?.find((p) => p.key === 'security')?.percentage ?? null,
                      color: scoreColor(data?.webHealth?.pillars?.find((p) => p.key === 'security')?.percentage ?? null),
                      caption: undefined,
                    },
                    {
                      label: 'PageSpeed',
                      score: data?.webHealth?.pillars?.find((p) => p.key === 'performance')?.percentage ?? null,
                      color: scoreColor(data?.webHealth?.pillars?.find((p) => p.key === 'performance')?.percentage ?? null),
                      caption: undefined,
                    },
                  ]}
                  actions={
                    <button
                      type="button"
                      onClick={() => setUnlockModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#25c972] px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2dd87d]"
                    >
                      Unlock report
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                />
              </div>

              <div className="space-y-4">
                {/* AI Visibility dimensions */}
                {(data?.dimensions ?? data?.score?.dimensions ?? []).map((dimension, i) => (
                  <YwsBreakdownSection
                    key={dimension.key}
                    title={dimension.label}
                    score={dimension.percentage}
                    scoreColor={scoreColor(dimension.percentage)}
                    onCopyToLlm={handleCopyReportPrompt}
                    copied={reportPromptCopied}
                    passCount={dimension.checks.filter((c) => c.verdict === 'pass').length}
                    failCount={dimension.checks.filter((c) => c.verdict === 'fail').length}
                    unknownCount={dimension.checks.filter((c) => c.verdict === 'unknown').length}
                    checks={dimension.checks.map((c) => ({
                      label: c.label,
                      detail: c.detail,
                      verdict: c.verdict,
                      points: c.points,
                      maxPoints: c.maxPoints,
                    }))}
                    defaultExpanded={false}
                    showClickHint={i === 0}
                    hasPaid={report?.hasPaid ?? false}
                  />
                ))}
                {/* Web Health sections */}
                {(() => {
                  const qualityPillar = data?.webHealth?.pillars?.find((p) => p.key === 'quality');
                  const qualityChecks = buildWebsiteQualityChecks(data?.webHealth, data?.dimensions);
                  const ogCheck = data?.webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Open Graph coverage' || c.id === 'whq-open-graph');
                  const siteQualityChecks =
                    qualityChecks.length > 0
                      ? qualityChecks
                      : [
                          { label: 'Title' },
                          { label: 'Meta Description' },
                          { label: 'Favicon' },
                          { label: 'Viewport meta' },
                          { label: 'robots.txt' },
                          { label: 'Sitemap' },
                          { label: 'llms.txt' },
                          { label: 'Headings' },
                          { label: 'Schema.org JSON-LD' },
                          { label: 'Canonical URL' },
                          { label: 'HTML lang' },
                          { label: 'Character encoding' },
                        ];
                  const openGraphChecks = ogCheck
                    ? [{ label: 'Open Graph coverage', detail: ogCheck.detail, verdict: ogCheck.verdict as 'pass' | 'fail' | 'unknown', points: ogCheck.points, maxPoints: ogCheck.maxPoints }]
                    : [{ label: 'Title' }, { label: 'Description' }];
                  const qualityPass = qualityPillar?.checks?.filter((c) => c.verdict === 'pass').length ?? 0;
                  const qualityFail = qualityPillar?.checks?.filter((c) => c.verdict === 'fail').length ?? 0;
                  const qualityUnknown = qualityPillar?.checks?.filter((c) => c.verdict === 'unknown').length ?? 0;
                  const ogPass = ogCheck?.verdict === 'pass' ? 1 : 0;
                  const ogFail = ogCheck?.verdict === 'fail' ? 1 : 0;
                  const ogUnknown = ogCheck?.verdict === 'unknown' ? 1 : 0;
                  const dimensions = data?.dimensions ?? data?.score?.dimensions ?? [];
                  return (
                    <YwsBreakdownSection
                      title="Website Quality"
                      score={qualityPillar?.percentage ?? data?.scores?.webHealth ?? null}
                      scoreColor={scoreColor(qualityPillar?.percentage ?? data?.scores?.webHealth ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={qualityPass + ogPass}
                      failCount={qualityFail + ogFail}
                      unknownCount={qualityUnknown + ogUnknown}
                      checks={[]}
                      subSections={[
                        { label: 'Site Quality', checks: siteQualityChecks },
                        { label: 'Open Graph', checks: openGraphChecks },
                      ]}
                      defaultExpanded={false}
                      showClickHint={dimensions.length === 0}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
                {(() => {
                  const twitterCheck = data?.webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Twitter card coverage' || c.id === 'whq-twitter');
                  return (
                    <YwsBreakdownSection
                      title="Twitter Cards"
                      score={twitterCheck ? (twitterCheck.verdict === 'pass' ? 100 : 0) : null}
                      scoreColor={twitterCheck ? scoreColor(twitterCheck.verdict === 'pass' ? 100 : 0) : 'var(--color-warning)'}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={twitterCheck?.verdict === 'pass' ? 1 : 0}
                      failCount={twitterCheck?.verdict === 'fail' ? 1 : 0}
                      unknownCount={twitterCheck?.verdict === 'unknown' ? 1 : 0}
                      checks={
                        twitterCheck
                          ? [{ label: 'Twitter card coverage', detail: twitterCheck.detail, verdict: twitterCheck.verdict as 'pass' | 'fail' | 'unknown', points: twitterCheck.points, maxPoints: twitterCheck.maxPoints }]
                          : [{ label: 'Card Type' }, { label: 'Description' }, { label: 'Title' }, { label: 'Image' }]
                      }
                      defaultExpanded={false}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
                {(() => {
                  const securityPillar = data?.webHealth?.pillars?.find((p) => p.key === 'security');
                  const securityChecks = buildSecurityChecks(data?.webHealth);
                  return (
                    <YwsBreakdownSection
                      title="Trust & Security"
                      score={securityPillar?.percentage ?? null}
                      scoreColor={scoreColor(securityPillar?.percentage ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={securityPillar?.checks?.filter((c) => c.verdict === 'pass').length ?? 0}
                      failCount={securityPillar?.checks?.filter((c) => c.verdict === 'fail').length ?? 0}
                      unknownCount={securityPillar?.checks?.filter((c) => c.verdict === 'unknown').length ?? 0}
                      checks={
                        securityChecks.length > 0
                          ? securityChecks
                          : [
                              { label: 'HTTPS' },
                              { label: 'HTTP Strict Transport Security' },
                              { label: 'Content Security Policy' },
                              { label: 'Frame Protection' },
                              { label: 'MIME Type Protection' },
                            ]
                      }
                      defaultExpanded={false}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
                {(() => {
                  const perfPillar = data?.webHealth?.pillars?.find((p) => p.key === 'performance');
                  const perfChecks = buildPerformanceChecks(data?.webHealth);
                  return (
                    <YwsBreakdownSection
                      title="PageSpeed"
                      score={perfPillar?.percentage ?? null}
                      scoreColor={scoreColor(perfPillar?.percentage ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={perfPillar?.checks?.filter((c) => c.verdict === 'pass').length ?? 0}
                      failCount={perfPillar?.checks?.filter((c) => c.verdict === 'fail').length ?? 0}
                      unknownCount={perfPillar?.checks?.filter((c) => c.verdict === 'unknown').length ?? 0}
                      checks={
                        perfChecks.length > 0
                          ? perfChecks
                          : [
                              { label: 'Performance score' },
                              { label: 'Largest Contentful Paint' },
                              { label: 'Cumulative Layout Shift' },
                              { label: 'Total Blocking Time' },
                            ]
                      }
                      defaultExpanded={false}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
              </div>
            </section>

          </>
        )}

        {/* ─── Loading Report ────────────────────────────────────── */}
        {emailSubmitted && !report && loadingReport && (
          <div className="aiso-card flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
              <p className="text-sm text-[var(--text-secondary)]">Loading your intelligence report...</p>
            </div>
          </div>
        )}

        {emailSubmitted && !report && !loadingReport && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            We couldn&apos;t load your report yet. Please refresh and retry.
          </div>
        )}

        {/* ─── Full Report ────────────────────────────────────────── */}
        {report && (
          <div>
            <div className="mb-5">
              <ScoreSummaryHero
                domain={getDomain(report.url)}
                url={report.url}
                dateLabel={data?.createdAt ? formatDateShort(data.createdAt) : undefined}
                overall={{
                  score: report.score.scores.overall ?? report.score.percentage,
                  color: scoreColor(report.score.scores.overall ?? report.score.percentage),
                  label: 'Overall Score',
                  caption: report.score.overallBandInfo?.label || report.score.bandInfo.label,
                }}
                supporting={[
                  {
                    label: 'Website Quality',
                    score: webHealth?.pillars?.find((p) => p.key === 'quality')?.percentage ?? webHealth?.percentage ?? null,
                    color: scoreColor(webHealth?.pillars?.find((p) => p.key === 'quality')?.percentage ?? webHealth?.percentage ?? null),
                    caption: undefined,
                  },
                  {
                    label: 'Trust & Security',
                    score: webHealth?.pillars?.find((p) => p.key === 'security')?.percentage ?? null,
                    color: scoreColor(webHealth?.pillars?.find((p) => p.key === 'security')?.percentage ?? null),
                    caption: undefined,
                  },
                  {
                    label: 'PageSpeed',
                    score: webHealth?.pillars?.find((p) => p.key === 'performance')?.percentage ?? null,
                    color: scoreColor(webHealth?.pillars?.find((p) => p.key === 'performance')?.percentage ?? null),
                    caption: undefined,
                  },
                ]}
                actions={
                  <>
                    {report.copyToLlm?.fullPrompt && (
                      <button type="button" onClick={handleCopyReportPrompt} className="aiso-button aiso-button-secondary px-4 py-2.5 text-sm">
                        <Copy className="h-4 w-4" />
                        {reportPromptCopied ? 'Copied full prompt' : 'Copy to LLM'}
                      </button>
                    )}
                    {report.hasPaid ? (
                      <Link href={`/advanced?report=${report.id}`} className="aiso-button aiso-button-primary px-4 py-2.5 text-sm">
                        Open advanced tools
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                    {data?.url ? (
                      <a
                        href={data.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aiso-button aiso-button-secondary px-4 py-2.5 text-sm"
                      >
                        Visit site
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </>
                }
              />
            </div>

            {/* Tab bar */}
            <div className="mb-5 flex justify-center">
              <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-[1.05rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.018)_0%,rgba(255,255,255,0.008)_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <TabButton active={activeTab === 'overview'} onClick={() => setTab('overview')} icon={LayoutDashboard}>
                  Overview
                </TabButton>
                <TabButton active={activeTab === 'repair-queue'} onClick={() => setTab('repair-queue')} icon={ListChecks}>
                  Repair Queue
                </TabButton>
                <TabButton active={activeTab === 'dimensions'} onClick={() => setTab('dimensions')} icon={BarChart3}>
                  Breakdown
                </TabButton>
                <TabButton active={activeTab === 'share'} onClick={() => setTab('share')} icon={Share2}>
                  Share
                </TabButton>
              </div>
            </div>

            {/* Tab content — only active tab shown */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* AI Visibility dimensions */}
                {reportDimensions.map((dimension, i) => (
                  <YwsBreakdownSection
                    key={dimension.key}
                    title={dimension.label}
                    score={dimension.percentage}
                    scoreColor={scoreColor(dimension.percentage)}
                    onCopyToLlm={handleCopyReportPrompt}
                    copied={reportPromptCopied}
                    passCount={dimension.checks.filter((c) => c.verdict === 'pass').length}
                    failCount={dimension.checks.filter((c) => c.verdict === 'fail').length}
                    unknownCount={dimension.checks.filter((c) => c.verdict === 'unknown').length}
                    checks={dimension.checks.map((c) => ({
                      label: c.label,
                      detail: c.detail,
                      verdict: c.verdict,
                      points: c.points,
                      maxPoints: c.maxPoints,
                    }))}
                    defaultExpanded={false}
                    showClickHint={i === 0}
                    hasPaid={report?.hasPaid ?? false}
                  />
                ))}
                {/* Web Health sections */}
                {(() => {
                  const qualityPillar = webHealth?.pillars?.find((p) => p.key === 'quality');
                  const qualityChecks = buildWebsiteQualityChecks(webHealth, reportDimensions);
                  const ogCheck = webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Open Graph coverage' || c.id === 'whq-open-graph');
                  const siteQualityChecks =
                    qualityChecks.length > 0
                      ? qualityChecks
                      : [
                          { label: 'Title' },
                          { label: 'Meta Description' },
                          { label: 'Favicon' },
                          { label: 'Viewport meta' },
                          { label: 'robots.txt' },
                          { label: 'Sitemap' },
                          { label: 'llms.txt' },
                          { label: 'Headings' },
                          { label: 'Schema.org JSON-LD' },
                          { label: 'Canonical URL' },
                          { label: 'HTML lang' },
                          { label: 'Character encoding' },
                        ];
                  const openGraphChecks = ogCheck
                    ? [{ label: 'Open Graph coverage', detail: ogCheck.detail, verdict: ogCheck.verdict as 'pass' | 'fail' | 'unknown', points: ogCheck.points, maxPoints: ogCheck.maxPoints }]
                    : [{ label: 'Title' }, { label: 'Description' }];
                  const qualityPass = qualityPillar?.checks?.filter((c) => c.verdict === 'pass').length ?? 0;
                  const qualityFail = qualityPillar?.checks?.filter((c) => c.verdict === 'fail').length ?? 0;
                  const qualityUnknown = qualityPillar?.checks?.filter((c) => c.verdict === 'unknown').length ?? 0;
                  const ogPass = ogCheck?.verdict === 'pass' ? 1 : 0;
                  const ogFail = ogCheck?.verdict === 'fail' ? 1 : 0;
                  const ogUnknown = ogCheck?.verdict === 'unknown' ? 1 : 0;
                  return (
                    <YwsBreakdownSection
                      title="Website Quality"
                      score={qualityPillar?.percentage ?? webHealth?.percentage ?? null}
                      scoreColor={scoreColor(qualityPillar?.percentage ?? webHealth?.percentage ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={qualityPass + ogPass}
                      failCount={qualityFail + ogFail}
                      unknownCount={qualityUnknown + ogUnknown}
                      checks={[]}
                      subSections={[
                        { label: 'Site Quality', checks: siteQualityChecks },
                        { label: 'Open Graph', checks: openGraphChecks },
                      ]}
                      defaultExpanded={false}
                      showClickHint={reportDimensions.length === 0}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
                {(() => {
                  const twitterCheck = webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Twitter card coverage' || c.id === 'whq-twitter');
                  return (
                    <YwsBreakdownSection
                      title="Twitter Cards"
                      score={twitterCheck ? (twitterCheck.verdict === 'pass' ? 100 : 0) : null}
                      scoreColor={twitterCheck ? scoreColor(twitterCheck.verdict === 'pass' ? 100 : 0) : 'var(--color-warning)'}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={twitterCheck?.verdict === 'pass' ? 1 : 0}
                      failCount={twitterCheck?.verdict === 'fail' ? 1 : 0}
                      unknownCount={twitterCheck?.verdict === 'unknown' ? 1 : 0}
                      checks={
                        twitterCheck
                          ? [{ label: 'Twitter card coverage', detail: twitterCheck.detail, verdict: twitterCheck.verdict as 'pass' | 'fail' | 'unknown', points: twitterCheck.points, maxPoints: twitterCheck.maxPoints }]
                          : [{ label: 'Card Type' }, { label: 'Description' }, { label: 'Title' }, { label: 'Image' }]
                      }
                      defaultExpanded={false}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
                {(() => {
                  const securityPillar = webHealth?.pillars?.find((p) => p.key === 'security');
                  const securityChecks = buildSecurityChecks(webHealth);
                  return (
                    <YwsBreakdownSection
                      title="Trust & Security"
                      score={securityPillar?.percentage ?? null}
                      scoreColor={scoreColor(securityPillar?.percentage ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={securityPillar?.checks?.filter((c) => c.verdict === 'pass').length ?? 0}
                      failCount={securityPillar?.checks?.filter((c) => c.verdict === 'fail').length ?? 0}
                      unknownCount={securityPillar?.checks?.filter((c) => c.verdict === 'unknown').length ?? 0}
                      checks={
                        securityChecks.length > 0
                          ? securityChecks
                          : [
                              { label: 'HTTPS' },
                              { label: 'HTTP Strict Transport Security' },
                              { label: 'Content Security Policy' },
                              { label: 'Frame Protection' },
                              { label: 'MIME Type Protection' },
                            ]
                      }
                      defaultExpanded={false}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
                {(() => {
                  const perfPillar = webHealth?.pillars?.find((p) => p.key === 'performance');
                  const perfChecks = buildPerformanceChecks(webHealth);
                  return (
                    <YwsBreakdownSection
                      title="PageSpeed"
                      score={perfPillar?.percentage ?? null}
                      scoreColor={scoreColor(perfPillar?.percentage ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={perfPillar?.checks?.filter((c) => c.verdict === 'pass').length ?? 0}
                      failCount={perfPillar?.checks?.filter((c) => c.verdict === 'fail').length ?? 0}
                      unknownCount={perfPillar?.checks?.filter((c) => c.verdict === 'unknown').length ?? 0}
                      checks={
                        perfChecks.length > 0
                          ? perfChecks
                          : [
                              { label: 'Performance score' },
                              { label: 'Largest Contentful Paint' },
                              { label: 'Cumulative Layout Shift' },
                              { label: 'Total Blocking Time' },
                            ]
                      }
                      defaultExpanded={false}
                      hasPaid={report?.hasPaid ?? false}
                    />
                  );
                })()}
              </div>
            )}

            {activeTab === 'repair-queue' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Highest-impact fixes first
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <FilterBar
                      label="Category"
                      value={categoryFilter}
                      onChange={(value) => setCategoryFilter(value as 'all' | 'ai' | 'web')}
                      options={[
                        { value: 'all', label: 'All fixes' },
                        { value: 'ai', label: 'AI' },
                        { value: 'web', label: 'Web' },
                      ]}
                    />
                    <FilterBar
                      label="Effort"
                      value={effortFilter}
                      onChange={(value) => setEffortFilter(value as 'all' | EffortBand)}
                      options={[
                        { value: 'all', label: 'Any effort' },
                        { value: 'quick', label: 'Quick wins' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'technical', label: 'Technical' },
                      ]}
                    />
                    <FilterBar
                      label="Impact"
                      value={impactFilter}
                      onChange={(value) => setImpactFilter(value as 'all' | 'high' | 'quick-wins')}
                      options={[
                        { value: 'all', label: 'All impact' },
                        { value: 'high', label: 'High impact' },
                        { value: 'quick-wins', label: 'Fastest wins' },
                      ]}
                    />
                  </div>
                  {report.copyToLlm?.remainingFixesPrompt ? (
                    <button
                      type="button"
                      onClick={handleCopyRemainingFixes}
                      className="aiso-button aiso-button-secondary px-4 py-2.5 text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      {remainingFixesCopied ? 'Copied remaining fixes' : 'Copy remaining fixes'}
                    </button>
                  ) : null}
                </div>
                {filteredFixes.length > 0 ? (
                  filteredFixes.map((fix, index) => (
                    <FixCard
                      key={fix.checkId}
                      index={index + 1}
                      checkId={fix.checkId}
                      label={fix.label}
                      detail={fix.detail}
                      category={fix.category}
                      instruction={fix.instruction}
                      effort={fix.effort}
                      effortBand={fix.effortBand}
                      pointsAvailable={fix.estimatedLift}
                      roi={fix.roi}
                      actualValue={fix.actualValue}
                      expectedValue={fix.expectedValue}
                      copied={copiedFixId === fix.checkId}
                      onCopy={() => handleCopyFixPrompt(fix.checkId, fix.copyPrompt)}
                    />
                  ))
                ) : (
                  <div className="aiso-card-soft p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(37,201,114,0.12)]">
                      <Sparkles className="h-6 w-6 text-[var(--color-success)]" />
                    </div>
                    <p className="font-medium text-[var(--text-primary)]">No blocking issues detected</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Your site is in good shape. Keep monitoring for changes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dimensions' && (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <BreakdownMetricCard
                    label="Strongest signal"
                    value={strongestDimension?.label ?? 'Pending'}
                    caption={strongestDimension ? `${Math.round(strongestDimension.percentage)}% strength` : 'Waiting on scan data'}
                    tone="success"
                  />
                  <BreakdownMetricCard
                    label="Weakest signal"
                    value={weakestDimension?.label ?? 'Pending'}
                    caption={weakestDimension ? `${Math.round(weakestDimension.percentage)}% strength` : 'Waiting on scan data'}
                    tone="warning"
                  />
                  <BreakdownMetricCard
                    label="Checks failing"
                    value={String(failedCount)}
                    caption={`${unknownCount} unknown · ${passedCount} passing`}
                    tone={failedCount > 0 ? 'danger' : 'neutral'}
                  />
                  <BreakdownMetricCard
                    label="Fix upside"
                    value={`+${totalLift}`}
                    caption={`${reportFixes.length} fixes available`}
                    tone="info"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
                  <ChartCard
                    kicker="AI map"
                    title="AI Visibility score shape"
                    description="Outer edge means stronger coverage. Look for the inward dents first."
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="h-[290px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={aiRadarData} outerRadius="72%">
                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                            <PolarAngleAxis
                              dataKey="label"
                              tick={{ fill: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.08em' }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tickCount={5}
                              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                              stroke="rgba(255,255,255,0.08)"
                            />
                            <Radar
                              name="AI visibility"
                              dataKey="score"
                              stroke="var(--color-band-needs-work)"
                              fill="rgba(255,138,30,0.18)"
                              fillOpacity={1}
                              strokeWidth={2.2}
                            />
                            <Tooltip content={<ChartTooltip suffix="%" />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {dimensionPressureData.map((dimension, index) => (
                          <div key={dimension.label} className={cn(premiumInsetClass, 'p-3.5')}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                  Pressure {index + 1}
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                                  {dimension.label}
                                </p>
                              </div>
                              <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                                {dimension.score}%
                              </span>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                              <div
                                className="h-full rounded-full bg-[var(--color-band-needs-work)]"
                                style={{ width: `${Math.max(8, dimension.score)}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-[var(--text-secondary)]">
                              {dimension.misses} failing checks are pulling this area down.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>

                  <div className="grid gap-4">
                    <ChartCard
                      kicker="Web"
                      title="Web Health pillars"
                      description="Performance, site quality, and trust in one quick glance."
                    >
                      {webPillarChartData.length > 0 ? (
                        <div className="h-[220px] min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={webPillarChartData} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}>
                              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                              <XAxis
                                dataKey="label"
                                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                domain={[0, 100]}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip content={<ChartTooltip suffix="%" />} />
                              <Bar dataKey="score" radius={[8, 8, 0, 0]} fill="rgba(255,255,255,0.18)">
                                {webPillarChartData.map((entry) => (
                                  <Cell
                                    key={entry.label}
                                    fill={
                                      entry.score >= 80
                                        ? 'rgba(37,201,114,0.85)'
                                        : entry.score >= 60
                                          ? 'rgba(255,138,30,0.9)'
                                          : 'rgba(255,82,82,0.9)'
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className={cn(premiumInsetClass, 'p-4 text-sm text-[var(--text-secondary)]')}>
                          Web Health is still being enriched.
                        </div>
                      )}
                    </ChartCard>

                    <ChartCard
                      kicker="Checks"
                      title="Pass / fail mix"
                      description="How the audit checks are resolving overall."
                    >
                      <div className="grid items-center gap-3 sm:grid-cols-[0.8fr_1fr]">
                        <div className="h-[180px] min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={issueMixData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={48}
                                outerRadius={72}
                                paddingAngle={4}
                                stroke="rgba(255,255,255,0.04)"
                              >
                                {issueMixData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                          {issueMixData.map((item) => (
                            <div key={item.name} className={cn(premiumInsetClass, 'flex items-center justify-between p-3')}>
                              <div className="flex items-center gap-3">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                              </div>
                              <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <ChartCard
                    kicker="Check map"
                    title="Dimension check balance"
                    description="Each bar shows how many checks pass, fail, or remain unknown for every AI dimension."
                  >
                    <div className="h-[260px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aiStatusChartData} layout="vertical" margin={{ top: 8, right: 0, left: 10, bottom: 8 }}>
                          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="label"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={84}
                          />
                          <Tooltip content={<StackedChartTooltip />} />
                          <Bar dataKey="pass" stackId="checks" fill="rgba(37,201,114,0.9)" radius={[4, 0, 0, 4]} />
                          <Bar dataKey="unknown" stackId="checks" fill="rgba(255,138,30,0.85)" />
                          <Bar dataKey="fail" stackId="checks" fill="rgba(255,82,82,0.9)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard
                    kicker="Read first"
                    title="What to act on"
                    description="Use this as your quick interpretation before drilling into the detailed checks below."
                  >
                    <div className="space-y-3">
                      <ActionInsightCard
                        label="Start here"
                        title={weakestDimension?.label ?? 'Waiting on signal'}
                        detail={
                          weakestDimension
                            ? `This is the weakest AI area right now at ${Math.round(weakestDimension.percentage)}%.`
                            : 'The weakest area will appear once the scan data is ready.'
                        }
                        tone="warning"
                      />
                      <ActionInsightCard
                        label="Best upside"
                        title={reportFixes[0]?.label ?? 'No priority fix yet'}
                        detail={
                          reportFixes[0]
                            ? `Top available lift is about +${reportFixes[0].estimatedLift} points.`
                            : 'Priority fixes will appear here when available.'
                        }
                        tone="info"
                      />
                      <ActionInsightCard
                        label="Web watch"
                        title={
                          webHealth?.pillars?.slice().sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))[0]?.label ??
                          'Web Health pending'
                        }
                        detail={
                          webHealth?.pillars?.length
                            ? 'This is the weakest supporting pillar inside Web Health.'
                            : 'Web Health is still processing in the background.'
                        }
                        tone="neutral"
                      />
                    </div>
                  </ChartCard>
                </div>

                <div className="space-y-8 pt-1">
                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-500)]/10">
                        <Target className="h-5 w-5 text-[var(--color-primary-600)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">AI Visibility details</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Drill into the six dimensions behind the AI score.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {reportDimensions.map((dimension) => {
                        const failed = dimension.checks.filter((c) => c.verdict === 'fail').length;
                        const passed = dimension.checks.filter((c) => c.verdict === 'pass').length;
                        const unknown = dimension.checks.filter((c) => c.verdict === 'unknown').length;

                        return (
                          <DimensionCard
                            key={dimension.key}
                            dimension={dimension}
                            passed={passed}
                            failed={failed}
                            unknown={unknown}
                          />
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.05)]">
                        <Gauge className="h-5 w-5 text-[var(--text-primary)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">Web Health details</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Performance, quality, and trust checks behind the support score.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {webHealth?.pillars?.map((pillar) => (
                        <WebHealthPillarCard key={pillar.key} pillar={pillar} />
                      ))}
                      {!webHealth && (
                        <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.016)] p-6 text-sm text-[var(--text-secondary)]">
                          Web Health is still processing in the background.
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="mx-auto max-w-4xl space-y-4">
                <section className={cn(premiumPanelClass, 'overflow-hidden p-5 sm:p-6')}>
                  <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                    <div className="space-y-4">
                      <div>
                        <p className="inline-flex rounded-full border border-[rgba(53,109,244,0.24)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-300)]">
                          Share
                        </p>
                        <h2 className="mt-3 font-display text-[clamp(1.55rem,3vw,2.3rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--text-primary)]">
                          Post your score
                        </h2>
                        <p className="mt-2 text-[12px] leading-6 text-[var(--text-secondary)]">
                          Open X with the score and preview ready to go.
                        </p>
                      </div>

                      <div className={cn(premiumInsetClass, 'overflow-hidden p-4')}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-sm font-semibold text-[var(--text-primary)]">
                            A
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">AISO</p>
                              <p className="text-[11px] text-[var(--text-muted)]">@aisoapp</p>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text-primary)]">
                              {sharePostText}
                            </p>
                          </div>
                        </div>

                        {report.share?.opengraphImageUrl && (
                          <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-[rgba(255,255,255,0.08)] bg-black/20">
                            <img
                              src={report.share.opengraphImageUrl}
                              alt={`${domain} public score preview`}
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            `https://x.com/intent/post?text=${encodeURIComponent(sharePostText)}`,
                            '_blank',
                            'noopener,noreferrer,width=760,height=720'
                          );
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Twitter className="h-4 w-4" />
                        Post to X
                      </button>

                      <div className={cn(premiumInsetClass, 'space-y-2.5 p-3.5')}>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(sharePostText);
                            setSharePostCopied(true);
                            setTimeout(() => setSharePostCopied(false), 2000);
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-left text-[12px] text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.035)]"
                        >
                          <span>{sharePostCopied ? 'Copied post text' : 'Copy post text'}</span>
                          <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        </button>
                        <button
                          type="button"
                          disabled={!shareUrl}
                          onClick={async () => {
                            if (shareUrl) {
                              await navigator.clipboard.writeText(shareUrl);
                              setShareLinkCopied(true);
                              setTimeout(() => setShareLinkCopied(false), 2000);
                            }
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-left text-[12px] text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.035)]"
                        >
                          <span>{shareLinkCopied ? 'Copied link' : 'Copy public link'}</span>
                          <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        </button>
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-[12px] text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.035)]"
                        >
                          <span>Open public page</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                              '_blank',
                              'noopener,noreferrer,width=760,height=720'
                            );
                          }}
                          className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-[12px] text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.035)]"
                        >
                          <span>Share on LinkedIn</span>
                          <Linkedin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Dashboard / CTA card */}
                {!report.hasPaid ? (
                  <div className="aiso-card p-6">
                    <div className="flex items-start gap-4 p-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-500)]/10">
                        <Globe2 className="h-5 w-5 text-[var(--color-primary-600)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">Done-for-you fixes</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Deploy-ready: llms.txt, robots.txt, schema, sitemap. Ship all fixes in one package.
                        </p>
                        <button onClick={handleCheckout} disabled={checkoutLoading} className="aiso-button aiso-button-primary mt-4 px-5 py-3 text-sm">
                          {checkoutLoading ? 'Loading...' : 'Get package — $99'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aiso-card p-6">
                    <div className="flex items-center justify-between gap-4 p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(37,201,114,0.12)]">
                          <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--text-primary)]">Full access unlocked</h3>
                          <p className="text-sm text-[var(--text-secondary)]">View and deploy your fixes</p>
                        </div>
                      </div>
                      <Link
                        href={`/advanced?report=${report.id}`}
                        className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)]"
                      >
                        Open advanced tools
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Sticky CTA bar */}
      {report && !report.hasPaid && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t py-4 backdrop-blur-xl" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(6, 6, 7, 0.9)' }}>
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-sm text-[var(--text-secondary)]">
              Ready to ship fixes for <span className="font-semibold text-[var(--text-primary)]">{getDomain(report.url)}</span>?
            </p>
            <button onClick={handleCheckout} disabled={checkoutLoading} className="aiso-button aiso-button-primary px-5 py-3 text-sm">
              {checkoutLoading ? 'Loading...' : 'Fix Everything — $99'}
            </button>
          </div>
        </div>
      )}

      {/* Feedback button - YourWebsiteScore style */}
      {(report || (isComplete && data?.score !== undefined)) && (
        <button
          type="button"
          className={cn(
            'fixed right-6 z-20 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#202020] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white',
            report?.hasPaid ? 'bottom-6' : report ? 'bottom-24' : 'bottom-6'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Feedback
        </button>
      )}

    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-[background-color,color,border-color,box-shadow]',
        active
          ? 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.045)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
          : 'border border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-primary)]'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function BreakdownMetricCard({
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  caption: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  const toneMap = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-error)',
    info: 'var(--color-accent-400)',
    neutral: 'rgba(255,255,255,0.72)',
  };

  return (
    <div className={cn(premiumInsetClass, 'p-4')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-[1rem] font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{caption}</p>
      <div className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.04)]">
        <div
          className="h-full rounded-full"
          style={{ width: '44%', backgroundColor: toneMap[tone] }}
        />
      </div>
    </div>
  );
}

function ChartCard({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(premiumPanelClass, 'p-5')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{kicker}</p>
      <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ActionInsightCard({
  label,
  title,
  detail,
  tone,
}: {
  label: string;
  title: string;
  detail: string;
  tone: 'warning' | 'info' | 'neutral';
}) {
  const toneColor =
    tone === 'warning'
      ? 'var(--color-warning)'
      : tone === 'info'
        ? 'var(--color-accent-400)'
        : 'rgba(255,255,255,0.7)';

  return (
    <div className={cn(premiumInsetClass, 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
        </div>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: toneColor }} />
      </div>
    </div>
  );
}

function MiniCertifiedScore({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const size = compact ? 42 : 58;
  const inner = compact ? 32 : 44;
  const fontSize = compact ? '0.95rem' : '1.15rem';

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background:
          'conic-gradient(var(--color-band-ai-ready) 0deg 112deg, var(--color-band-needs-work) 112deg 228deg, var(--color-band-not-visible) 228deg 360deg)',
      }}
    >
      <div
        className="absolute inset-0 m-auto rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(8,8,10,0.96)]"
        style={{ width: inner, height: inner }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-semibold leading-none text-[var(--text-primary)]" style={{ fontSize }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { fullLabel?: string; label?: string } }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const first = payload[0];
  const displayLabel = first?.payload?.fullLabel || label || first?.payload?.label;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(8,8,10,0.96)] px-3 py-2 shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
      {displayLabel ? <p className="text-[11px] font-semibold text-[var(--text-primary)]">{displayLabel}</p> : null}
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={entry.name} className="text-[11px] text-[var(--text-secondary)]">
            {entry.name}: <span className="font-semibold text-[var(--text-primary)]">{entry.value}{suffix}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function StackedChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { fullLabel?: string } }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(8,8,10,0.96)] px-3 py-2 shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
      <p className="text-[11px] font-semibold text-[var(--text-primary)]">
        {payload[0]?.payload?.fullLabel || label}
      </p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={entry.name} className="text-[11px] text-[var(--text-secondary)]">
            {entry.name}: <span className="font-semibold text-[var(--text-primary)]">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function shortDimensionLabel(label: string) {
  const map: Record<string, string> = {
    'File Presence': 'Files',
    'Structured Data': 'Schema',
    'Content Signals': 'Content',
    'Topical Authority': 'Authority',
    'Entity Clarity': 'Entity',
    'AI Registration': 'Registration',
  };

  return map[label] ?? label;
}

function DimensionCard({
  dimension,
  passed,
  failed,
  unknown,
}: {
  dimension: { key: string; label: string; score: number; maxScore: number; percentage: number; checks: { id: string; label: string; verdict: 'pass' | 'fail' | 'unknown'; points: number; maxPoints: number; detail: string }[] };
  passed: number;
  failed: number;
  unknown: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(dimension.percentage);
  const scoreColor =
    pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className={cn(premiumPanelClass, 'overflow-hidden')}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)] sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[1.4rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {dimension.label}
            </p>
            <span className="text-[1.6rem] font-semibold tracking-[-0.05em]" style={{ color: scoreColor }}>
              {pct}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span>{dimension.score} points</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
              {passed}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
              {unknown}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
              {failed}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ChevronDown
            className={cn('h-5 w-5 text-[var(--text-muted)] transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.012)]">
          <div className="divide-y divide-white/10">
            {dimension.checks.map((check) => (
              <div
                key={check.id}
                className="flex gap-4 px-5 py-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center pt-0.5">
                  {check.verdict === 'pass' ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                  ) : check.verdict === 'fail' ? (
                    <XCircle className="h-5 w-5 text-[var(--color-error)]" />
                  ) : (
                    <HelpCircle className="h-5 w-5 text-[var(--color-warning)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{check.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{check.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-2 py-1 text-xs font-medium tabular-nums text-[var(--text-muted)]">
                    {check.points}/{check.maxPoints}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  variant,
  domain,
  className,
}: {
  label: string;
  value: string;
  sublabel?: string;
  variant?: 'success' | 'error' | 'default';
  domain?: string;
  className?: string;
}) {
  const valueColor =
    variant === 'success'
      ? 'text-[var(--color-primary-600)]'
      : variant === 'error'
        ? 'text-red-600 dark:text-red-400'
        : 'text-[var(--text-primary)]';

  return (
    <div className={cn('aiso-card-soft p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={cn('mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums tracking-tight', valueColor)}>
        {domain && (
          <img
            src={getFaviconUrl(domain)}
            alt=""
            className="h-6 w-6 shrink-0 rounded"
          />
        )}
        <span className="truncate">{value}</span>
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sublabel}</p>}
    </div>
  );
}

function RevealMiniCard({ label, value }: { label: string; value: string }) {
  const isLongValue = value.length > 10 || /\s/.test(value);

  return (
    <div className="aiso-card-soft relative min-w-0 overflow-hidden rounded-[1.3rem] p-3.5 sm:p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(131,160,255,0.26),transparent)]" />
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          'mt-2.5 font-display font-semibold tracking-[-0.04em] text-[var(--text-primary)]',
          isLongValue ? 'text-base leading-tight sm:text-lg' : 'text-[clamp(1.45rem,2vw,2rem)] leading-none'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RevealIssueCard({
  category,
  label,
  detail,
  estimatedLift,
}: {
  category: 'ai' | 'web';
  label: string;
  detail: string;
  estimatedLift: number;
}) {
  const categoryLabel = category === 'ai' ? 'AI signal' : 'Web health';

  return (
    <div className="aiso-card-soft group relative flex h-full min-h-[9.75rem] min-w-0 flex-col overflow-hidden rounded-[1.35rem] p-4 transition-transform duration-300 ease-[var(--ease-default)] hover:-translate-y-0.5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(53,109,244,0.1),transparent_42%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {categoryLabel}
          </p>
        </div>
        <ImpactBadge value={estimatedLift} className="shrink-0 px-2.5 py-1 text-[10px] tracking-[0.16em]" />
      </div>
      <h3 className="relative mt-3 max-w-[18ch] font-display text-[1.02rem] font-semibold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)]">
        {label}
      </h3>
      <p
        className="relative mt-2.5 text-[0.84rem] leading-6 text-[var(--text-secondary)]"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
        }}
      >
        {detail}
      </p>
      <div className="relative mt-auto pt-3 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Unlock full repair queue
      </div>
    </div>
  );
}

function FixCard({
  index,
  checkId,
  label,
  detail,
  category,
  instruction,
  effort,
  effortBand,
  pointsAvailable,
  roi,
  actualValue,
  expectedValue,
  copied,
  onCopy,
}: {
  index: number;
  checkId: string;
  label: string;
  detail: string;
  category: 'ai' | 'web';
  instruction: string;
  effort: number;
  effortBand: EffortBand;
  pointsAvailable: number;
  roi: number;
  actualValue?: string;
  expectedValue?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn(premiumPanelClass, 'p-4 sm:p-5')}>
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs font-semibold tabular-nums text-[var(--text-muted)]">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[1rem] font-semibold text-[var(--text-primary)]">{label}</h3>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                    category === 'ai'
                      ? 'border border-[rgba(95,147,255,0.2)] bg-[rgba(95,147,255,0.08)] text-[var(--color-primary-200)]'
                      : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] text-[var(--text-secondary)]'
                  )}
                >
                  {category}
                </span>
                <ImpactBadge value={pointsAvailable} />
                <EffortBadge effortBand={effortBand} />
              </div>
              <p
                className="mt-2 max-w-[68ch] text-sm leading-6 text-[var(--text-secondary)]"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: open ? 'unset' : 2,
                  overflow: 'hidden',
                }}
              >
                {detail}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]"
              >
                {open ? 'Hide details' : 'Show details'}
              </button>
              <button
                type="button"
                onClick={onCopy}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                  copied
                    ? 'border-[var(--color-success)]/30 bg-[rgba(37,201,114,0.12)] text-[var(--color-success)]'
                    : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
                )}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy prompt'}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span className="text-xs text-[var(--text-muted)]">
              Effort score: {effort}/5
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              ROI: {roi.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Ref: {checkId}
            </span>
          </div>
          {open ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={cn(premiumInsetClass, 'p-4')}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Current value</p>
                <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">{actualValue || detail}</p>
              </div>
              <div className={cn(premiumInsetClass, 'p-4')}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Expected value</p>
                <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">{expectedValue || instruction}</p>
              </div>
              <div className={cn(premiumInsetClass, 'md:col-span-2 p-4')}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Fix guidance</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{instruction}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WebHealthOverviewCard({
  webHealth,
  status,
}: {
  webHealth: WebHealthSummaryData | null | undefined;
  status: 'pending' | 'running' | 'complete' | 'unavailable';
}) {
  return (
    <div className={cn(premiumPanelClass, 'p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Web Health</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Secondary signals that support AI discovery</h3>
        </div>
        <span className="aiso-pill">
          <Gauge className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
          {enrichmentLabel(status)}
        </span>
      </div>

      {status === 'running' && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Performance and technical quality are still being enriched in the background. This will update automatically.
        </p>
      )}

      {status === 'unavailable' && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Web Health could not be completed for this scan. The AI report is still valid, and a re-audit may recover the missing data.
        </p>
      )}

      {webHealth?.pillars && webHealth.pillars.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {webHealth.pillars.map((pillar) => (
            <div key={pillar.key} className={cn(premiumInsetClass, 'p-4')}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{pillar.label}</p>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {pillar.percentage !== null ? `${pillar.percentage}%` : 'Unavailable'}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                <div
                  className="h-full rounded-full bg-[rgba(255,255,255,0.22)]"
                  style={{ width: `${Math.max(8, pillar.percentage ?? 8)}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {pillar.score}/{pillar.maxScore} points
              </p>
            </div>
          ))}
        </div>
      )}

      {webHealth?.metrics && webHealth.metrics.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {webHealth.metrics.slice(0, 4).map((metric) => (
            <div key={metric.key} className="aiso-card-soft px-4 py-4">
              <RangeBar
                label={metric.label}
                value={metric.status === 'ok' ? 90 : metric.status === 'warn' ? 60 : 28}
                displayValue={metric.displayValue}
                max={100}
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">{metric.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebHealthPillarCard({
  pillar,
}: {
  pillar: WebHealthPillarData;
}) {
  const [open, setOpen] = useState(false);
  const pct = pillar.percentage ?? 0;
  const scoreColor =
    pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
  const passed = pillar.checks.filter((check) => check.verdict === 'pass').length;
  const unknown = pillar.checks.filter((check) => check.verdict === 'unknown').length;
  const failed = pillar.checks.filter((check) => check.verdict === 'fail').length;

  return (
    <div className={cn(premiumPanelClass, 'overflow-hidden')}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)] sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[1.4rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {pillar.label}
            </p>
            <span className="text-[1.6rem] font-semibold tracking-[-0.05em]" style={{ color: scoreColor }}>
              {pillar.percentage !== null ? pillar.percentage : '--'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span>{pillar.score} points</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
              {passed}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
              {unknown}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
              {failed}
            </span>
          </div>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-[var(--text-muted)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.012)]">
          <div className="space-y-3 p-4">
            {pillar.checks.map((check) => (
              <CheckRow
                key={check.id}
                title={check.label}
                points={`${check.points}/${check.maxPoints}`}
                status={check.verdict}
                actualValue={check.detail}
                detail={pillar.key === 'performance' ? 'Improve this metric to raise the Web Health performance pillar.' : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
