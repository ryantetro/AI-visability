'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Gauge,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  Linkedin,
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
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { ImpactBadge } from '@/components/ui/impact-badge';
import { EffortBadge } from '@/components/ui/effort-badge';
import { PromptCopyPanel } from '@/components/ui/prompt-copy-panel';
import { CheckRow } from '@/components/ui/check-row';
import { FilterBar } from '@/components/ui/filter-bar';
import { RangeBar } from '@/components/ui/range-bar';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';

import { ScoreSummaryHero } from '@/components/app/score-summary-hero';
import { UrlInput } from '@/components/ui/url-input';
import { YwsBreakdownSection, type CheckItem } from '@/components/ui/yws-breakdown-section';
import { EngineMentionCard } from '@/components/ui/engine-mention-card';
import { MentionPromptCheck } from '@/components/ui/mention-prompt-check';
import type { MentionSummary, AIEngine } from '@/types/ai-mentions';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';
import { getRecentScanEntries, rememberRecentScan } from '@/lib/recent-scans';
import { analysisExampleReport, analysisExampleScan } from '@/lib/analysis-example-report';
import { getCheckFixContent } from '@/lib/analysis-fix-content';
import { EffortBand } from '@/types/score';
import { useAuth } from '@/hooks/use-auth';
import { buildLoginHref, getCurrentAppPath } from '@/lib/app-paths';

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
    sectionPrompts: Partial<Record<'aiReadiness' | 'contentAuthority' | 'websiteQuality' | 'performanceSecurity', {
      key: 'aiReadiness' | 'contentAuthority' | 'websiteQuality' | 'performanceSecurity';
      label: string;
      prompt: string;
      actionableFixCount: number;
    }>>;
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

interface ExampleCheckSource {
  id?: string;
  label: string;
  verdict: string;
  detail: string;
  points: number;
  maxPoints: number;
}

interface ScanAssetPreview {
  faviconUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogUrl?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImageUrl?: string | null;
}

const premiumPanelClass =
  'rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(10,10,12,0.94)_0%,rgba(5,6,7,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.024),0_10px_22px_rgba(0,0,0,0.16)]';

const premiumInsetClass =
  'rounded-[1.25rem] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022)_0%,rgba(255,255,255,0.012)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';

/* Tab meta removed — now using single scrollable layout */

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

type CheckSource = ExampleCheckSource;

function toCheckItems(checks: CheckSource[]): CheckItem[] {
  return checks.map((c) => ({
    label: c.label,
    detail: c.detail,
    verdict: c.verdict as 'pass' | 'fail' | 'unknown',
    points: c.points,
    maxPoints: c.maxPoints,
    fixContent: getCheckFixContent(c.label),
  }));
}

function mergePreviewSummary(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join('\n');
}

function toRichCheckItem(check: CheckSource, assetPreview?: ScanAssetPreview): CheckItem {
  const baseFixContent = getCheckFixContent(check.label);
  const normalizedLabel = check.label.trim().toLowerCase();

  if ((normalizedLabel === 'favicon present' || normalizedLabel === 'favicon') && assetPreview?.faviconUrl) {
    return {
      label: check.label,
      detail: check.detail,
      verdict: check.verdict as 'pass' | 'fail' | 'unknown',
      points: check.points,
      maxPoints: check.maxPoints,
        fixContent: {
          ...baseFixContent,
          currentValue: `Detected asset: ${assetPreview.faviconUrl}`,
          recommendedValue:
            baseFixContent?.recommendedValue ||
            'Serve a square favicon at a stable public URL and link it from the page head.',
          media: {
            kind: 'image',
            presentation: 'icon',
            src: assetPreview.faviconUrl,
            alt: 'Detected favicon preview',
            caption: 'Detected favicon asset',
          },
        ctaLabel: 'Open asset',
        ctaHref: assetPreview.faviconUrl,
      },
    };
  }

  if ((normalizedLabel === 'open graph coverage' || normalizedLabel === 'open graph') &&
    (assetPreview?.ogImageUrl || assetPreview?.ogTitle || assetPreview?.ogDescription || assetPreview?.ogUrl)) {
    return {
      label: check.label,
      detail: check.detail,
      verdict: check.verdict as 'pass' | 'fail' | 'unknown',
      points: check.points,
      maxPoints: check.maxPoints,
      fixContent: {
        ...baseFixContent,
        currentValue:
          mergePreviewSummary([
            assetPreview.ogTitle ? `Title: ${assetPreview.ogTitle}` : undefined,
            assetPreview.ogDescription ? `Description: ${assetPreview.ogDescription}` : undefined,
            assetPreview.ogUrl ? `URL: ${assetPreview.ogUrl}` : undefined,
          ]) || baseFixContent?.currentValue,
        recommendedValue:
          'Ship a complete og:title, og:description, og:image, og:url, and og:type set that all point at the live page.',
        media: assetPreview.ogImageUrl
          ? {
              kind: 'image',
              src: assetPreview.ogImageUrl,
              alt: 'Detected Open Graph image preview',
              caption: 'Detected Open Graph image',
            }
          : baseFixContent?.media,
        ctaLabel: assetPreview.ogImageUrl ? 'Open OG image' : undefined,
        ctaHref: assetPreview.ogImageUrl || undefined,
      },
    };
  }

  if ((normalizedLabel === 'twitter card coverage' || normalizedLabel === 'twitter cards') &&
    (assetPreview?.twitterImageUrl || assetPreview?.twitterCard || assetPreview?.twitterTitle || assetPreview?.twitterDescription)) {
    return {
      label: check.label,
      detail: check.detail,
      verdict: check.verdict as 'pass' | 'fail' | 'unknown',
      points: check.points,
      maxPoints: check.maxPoints,
      fixContent: {
        ...baseFixContent,
        currentValue:
          mergePreviewSummary([
            assetPreview.twitterCard ? `Card: ${assetPreview.twitterCard}` : undefined,
            assetPreview.twitterTitle ? `Title: ${assetPreview.twitterTitle}` : undefined,
            assetPreview.twitterDescription ? `Description: ${assetPreview.twitterDescription}` : undefined,
          ]) || baseFixContent?.currentValue,
        recommendedValue:
          'Use a summary_large_image card with a matching title, description, and a reachable image asset.',
        media: assetPreview.twitterImageUrl
          ? {
              kind: 'image',
              src: assetPreview.twitterImageUrl,
              alt: 'Detected Twitter card image preview',
              caption: 'Detected Twitter card image',
            }
          : baseFixContent?.media,
        ctaLabel: assetPreview.twitterImageUrl ? 'Open card image' : undefined,
        ctaHref: assetPreview.twitterImageUrl || undefined,
      },
    };
  }

  return {
    label: check.label,
    detail: check.detail,
    verdict: check.verdict as 'pass' | 'fail' | 'unknown',
    points: check.points,
    maxPoints: check.maxPoints,
    fixContent: baseFixContent,
  };
}

function buildWebsiteQualityChecks(
  webHealth: { pillars: Array<{ key: string; checks: CheckSource[] }> } | null | undefined,
  dimensions: Array<{ key: string; checks: CheckSource[] }> | null | undefined,
  assetPreview?: ScanAssetPreview
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
  return all.map((check) => toRichCheckItem(check, assetPreview));
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

export function AnalysisPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillUrl = searchParams.get('prefill');
  const { user, loading: authLoading } = useAuth();
  const scanId = searchParams.get('scan');
  const reportId = searchParams.get('report');
  const exampleMode = searchParams.get('example') === '1';
  const id = reportId || scanId || (exampleMode ? analysisExampleReport.id : '');
  const scanProgress = useScanProgress(exampleMode ? null : (id || null));
  const data = exampleMode ? (analysisExampleScan as unknown as typeof scanProgress.data) : scanProgress.data;
  const loading = exampleMode ? false : scanProgress.loading;
  const error = exampleMode ? null : scanProgress.error;
  const revealRingTargetRef = useRef<HTMLDivElement | null>(null);

  const [emailSubmitted, setEmailSubmitted] = useState(Boolean(reportId));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [unlockingCheckout, setUnlockingCheckout] = useState(false);
  const [reauditLoading, setReauditLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [sharePostCopied, setSharePostCopied] = useState(false);
  const [reportPromptCopied, setReportPromptCopied] = useState(false);
  const [remainingFixesCopied, setRemainingFixesCopied] = useState(false);
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [usageData, setUsageData] = useState<{ used: number; limit: number; remaining: number; isPaid: boolean; plan: string } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationInstructions, setVerificationInstructions] = useState<VerificationInstructionsData | null>(null);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScanCardData[]>([]);

  const emptyState = !scanId && !reportId && !exampleMode;

  // Redirect report view to report page — analysis is for URL input + scan progress only
  useEffect(() => {
    if (reportId && !exampleMode && typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      router.replace(`/report?report=${reportId}${hash}`);
    }
  }, [reportId, exampleMode, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      if (exampleMode) {
        setShareUrl(`${window.location.origin}/analysis?example=1`);
        return;
      }
      setShareUrl(`${window.location.origin}/score/${id}`);
    }
  }, [exampleMode, id]);

  useEffect(() => {
    setReport(null);
    setLoadingReport(false);
  }, [exampleMode, id]);

  useEffect(() => {
    setEmailSubmitted(Boolean(reportId || report));
  }, [reportId, report]);

  useEffect(() => {
    if (!id || exampleMode) return;
    rememberRecentScan(id);
  }, [exampleMode, id]);

  // Fetch per-account usage data
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function fetchUsage() {
      try {
        const res = await fetch('/api/auth/usage');
        if (res.ok) {
          const data = await res.json();
          if (active) setUsageData(data);
        }
      } catch {
        // Silently fail — will show default UI
      }
    }
    fetchUsage();
    return () => { active = false; };
  }, [user]);

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

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'ai' | 'web'>('all');
  const [effortFilter, setEffortFilter] = useState<'all' | EffortBand>('all');
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'quick-wins'>('all');

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
  const progressLanes = (data?.progress?.lanes ?? []) as Array<{
    key: 'site_scan' | 'ai_mentions';
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    progressPct?: number;
    currentStep?: string;
    checks: Array<{
      label: string;
      status: 'pending' | 'running' | 'done' | 'error';
    }>;
  }>;

  const totalChecks = progressChecks.length;
  const doneChecks = progressChecks.filter((item) => item.status === 'done').length;
  const runningChecks = progressChecks.filter((item) => item.status === 'running').length;
  const errorChecks = progressChecks.filter((item) => item.status === 'error').length;

  const progressPercent = progressLanes.length > 0
    ? Math.round(
      progressLanes.reduce((sum, lane) => sum + (lane.progressPct ?? 0), 0) / progressLanes.length
    )
    : totalChecks > 0
      ? Math.round(((doneChecks + runningChecks * 0.5) / totalChecks) * 100)
      : 0;

  const currentStep =
    progressLanes.find((lane) => lane.status === 'running')?.currentStep ??
    data?.progress?.currentStep ??
    progressChecks.find((item) => item.status === 'running')?.label ??
    (progressChecks.length > 0 ? progressChecks[progressChecks.length - 1]?.label : 'Initializing');

  const revealDimensions = data?.dimensions ?? [];
  const reportDimensions = report?.score.dimensions ?? [];
  const reportFixes = report?.fixes ?? report?.score.fixes ?? [];
  const webHealth = report?.webHealth ?? report?.score.webHealth ?? null;
  const scoreSnapshot = report?.scores ?? report?.score.scores ?? null;
  const webChecks = webHealth?.pillars.flatMap((pillar) => pillar.checks) ?? [];
  const webHealthStatus = report?.enrichments?.webHealth?.status ?? webHealth?.status ?? 'pending';
  const canPreviewGatedChecks = exampleMode || Boolean(report?.hasPaid) || unlockingCheckout;

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

  const domain = getDomain(report?.url ?? data?.url ?? 'https://example.com');
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
    if (exampleMode) return;
    if (!id) return;
    if (!user) return;
    if (reportId) return; // Redirecting to report page, don't load here
    if (!isComplete) return;
    if (report) return;

    let active = true;
    setLoadingReport(true);

    async function doLoadReport() {
      try {
        const res = await fetch(`/api/scan/${id}/report`);
        if (!res.ok || !active) return;
        const payload = await res.json();
        if (!active) return;
        setReport(payload);

        if (!reportId && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          router.replace(`/report?report=${id}${hash}`);
        }
      } catch {
        // Silent fallback keeps the reveal route usable even if report load fails.
      } finally {
        if (active) {
          setLoadingReport(false);
        }
      }
    }

    void doLoadReport();

    return () => {
      active = false;
    };
  }, [exampleMode, id, isComplete, reportId, user, report, router, data]);

  useEffect(() => {
    if (exampleMode) return;
    if (report?.share?.publicUrl) {
      setShareUrl(report.share.publicUrl);
      return;
    }
    if (!id || !report || report.enrichments?.webHealth?.status !== 'running') {
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
  }, [
    exampleMode,
    id,
    report,
    report?.enrichments?.webHealth?.status ?? null,
    report?.share?.publicUrl ?? null,
  ]);

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

  const handleCheckout = async (plan?: string) => {
    setActionError('');
    setUnlockModalOpen(false);
    setCheckoutLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: id,
          plan: plan || 'starter_monthly',
          returnPath: getCurrentAppPath('/analysis'),
        }),
      });

      if (res.status === 401) {
        router.push(buildLoginHref(getCurrentAppPath('/analysis')));
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to start checkout');
      }

      const session = await res.json();
      if (typeof session.url !== 'string' || session.url.length === 0) {
        throw new Error('Checkout session did not include a redirect URL.');
      }
      if (/^https?:\/\//i.test(session.url)) {
        window.location.href = session.url;
        return;
      }
      router.push(session.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to start checkout right now. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleStartAnalysis = async (url: string) => {
    if (!user) {
      router.push(`/login?next=/analysis&scanUrl=${encodeURIComponent(url)}`);
      return;
    }

    // Block scan attempt if at limit
    if (usageData && usageData.remaining === 0 && !usageData.isPaid) {
      setUnlockModalOpen(true);
      return;
    }

    setActionError('');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const payload = await res.json();

      if (res.status === 403 && payload.upgradeRequired) {
        setUsageData((prev) => prev ? { ...prev, used: payload.used, remaining: 0 } : prev);
        setUnlockModalOpen(true);
        return;
      }

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to start scan');
      }

      // Update local usage after successful scan
      setUsageData((prev) => prev && !prev.isPaid ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) } : prev);

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

  useEffect(() => {
    if (exampleMode || !user || !id) return;
    if (searchParams.get('checkout') !== 'success') return;
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    let active = true;

    async function verifyCheckout() {
      setUnlockingCheckout(true);
      setLoadingReport(true);
      try {
        const verifyRes = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!verifyRes.ok) {
          const payload = await verifyRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to verify checkout.');
        }

        for (let attempt = 0; attempt < 6; attempt += 1) {
          const reportRes = await fetch(`/api/scan/${id}/report`);
          if (reportRes.ok) {
            const payload = await reportRes.json();
            if (!active) return;
            setReport(payload);
            setUnlockModalOpen(false);
            // Refresh usage data after upgrade
            fetch('/api/auth/usage').then((r) => r.ok ? r.json() : null).then((d) => { if (d && active) setUsageData(d); }).catch(() => {});
            const hash = window.location.hash || '';
            router.replace(`/report?report=${id}${hash}`);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        throw new Error('Your payment cleared, but the paid report is still warming up. Please refresh in a moment.');
      } catch (err) {
        if (!active) return;
        setActionError(err instanceof Error ? err.message : 'Failed to unlock your paid report.');
      } finally {
        if (active) {
          setUnlockingCheckout(false);
          setLoadingReport(false);
        }
      }
    }

    void verifyCheckout();

    return () => {
      active = false;
    };
  }, [exampleMode, id, router, searchParams, user]);

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
    <div className={cn(report && !report.hasPaid && 'pb-24')}>
      {/* Matte ambient background - subtle for YourWebsiteScore style */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
      </div>


      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ─── Unlock / Upgrade modal (always available) ──────────── */}
        <UnlockFeaturesModal
          open={unlockModalOpen}
          onOpenChange={setUnlockModalOpen}
          onUnlock={(plan) => void handleCheckout(plan)}
          loading={checkoutLoading}
        />

        {/* ─── Analysis Section (always visible) ─────────────────── */}
        <section className="mb-8">
          <h1 className="text-center text-2xl font-semibold text-white sm:text-3xl">Analysis</h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-400">
            Launch a crawl in under 30 seconds and get a ranked hit-list of fixes that lift speed, visibility, and trust.
          </p>

          <div className="mx-auto mt-10 max-w-xl space-y-4">
            {/* URL Input: dark gray bg, thin light gray border */}
            <UrlInput
              key={prefillUrl ?? 'analysis-url-input'}
              onSubmit={handleStartAnalysis}
              loading={loading}
              variant="minimal"
              placeholder="website.com"
              submitLabel="Analyze"
              loadingLabel="Analyzing..."
              showGlobeIcon
              initialValue={prefillUrl ?? undefined}
              autoFocus={Boolean(prefillUrl)}
            />

            {/* Example report card — only in empty state */}
            {emptyState && (
              <button
                type="button"
                onClick={() => router.push('/analysis?example=1')}
                className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-5 py-4 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                {/* Favicon */}
                <img
                  src={getFaviconUrl('stripe.com', 64)}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white">stripe.com</p>
                  <p className="mt-0.5 text-[12px] text-zinc-500">See what a full report looks like</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[12px] font-semibold text-emerald-400">
                    78
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
                </div>
              </button>
            )}

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
        {id && (loading || authLoading) && !data && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
            <p className="mt-4 text-sm text-zinc-400">Loading audit...</p>
          </div>
        )}

        {/* ─── Error state (when we have id but fetch failed) ─────── */}
        {id && !loading && !authLoading && error && !data && (
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
        {/* Scan header — only when still scanning (not when complete or report loaded) */}
        {!(isComplete && !report) && !report && (
          <div className="mb-6" />
        )}
        {report && (
          <header className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Full report
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Scores, AI mentions, repairs, and detailed breakdowns in one scrollable view.
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', reauditLoading && 'animate-spin')} />
                    {reauditLoading ? 'Re-running...' : 'Re-audit'}
                  </button>
                )}
                {report?.hasPaid && (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Open in Dashboard
                  </Link>
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
          <section className="mx-auto max-w-xl">
            {/* Domain + status */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-white">{domain}</span>
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  statusStyles.bg,
                  statusStyles.text
                )}>
                  <span className={cn('h-1 w-1 rounded-full', statusStyles.dot)} />
                  {statusLabel}
                </span>
              </div>
              <span className="text-xs tabular-nums text-zinc-500">{progressPercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-white/40 transition-[width] duration-500"
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>

            {/* Checklist */}
            <div className="mt-5">
              {progressLanes.length > 0 ? (
                <div className="space-y-4">
                  {progressLanes.map((lane) => (
                    <div
                      key={lane.key}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{lane.label}</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {lane.currentStep || currentStep}
                          </p>
                        </div>
                        <span className="text-xs tabular-nums text-zinc-500">
                          {lane.progressPct ?? 0}%
                        </span>
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-white/40 transition-[width] duration-500"
                          style={{ width: `${Math.max(0, Math.min(100, lane.progressPct ?? 0))}%` }}
                        />
                      </div>
                      <div className="mt-4">
                        <ProgressChecklist checks={lane.checks} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ProgressChecklist checks={progressChecks} />
              )}
            </div>
          </section>
        )}

        {/* ─── Failed State ─────────────────────────────────────── */}
        {isFailed && (
          <section className="mx-auto max-w-xl">
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Scan failed</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {data?.progress?.error || 'Something went wrong. Try again.'}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReaudit}
                    disabled={reauditLoading}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    {reauditLoading ? 'Retrying...' : 'Try again'}
                  </button>
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
                    {
                      label: 'AI Mentions',
                      score: (data as unknown as Record<string, unknown>)?.mentionSummary ? ((data as unknown as Record<string, unknown>).mentionSummary as MentionSummary).overallScore : null,
                      color: scoreColor((data as unknown as Record<string, unknown>)?.mentionSummary ? ((data as unknown as Record<string, unknown>).mentionSummary as MentionSummary).overallScore : null),
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
                {/* ─── AI Readiness (File Presence + Structured Data + AI Registration) ─── */}
                {(() => {
                  const readinessKeys = ['file-presence', 'structured-data', 'ai-registration'];
                  const readinessDims = revealDimensions.filter((d) => readinessKeys.includes(d.key));
                  if (readinessDims.length === 0) return null;
                  const allChecks = readinessDims.flatMap((d) => d.checks);
                  const avgScore = Math.round(readinessDims.reduce((s, d) => s + d.percentage, 0) / readinessDims.length);
                  return (
                    <YwsBreakdownSection
                      title="AI Readiness"
                      score={avgScore}
                      scoreColor={scoreColor(avgScore)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={allChecks.filter((c) => c.verdict === 'pass').length}
                      failCount={allChecks.filter((c) => c.verdict === 'fail').length}
                      unknownCount={allChecks.filter((c) => c.verdict === 'unknown').length}
                      checks={[]}
                      subSections={readinessDims.map((d) => ({
                        label: d.label,
                        checks: d.checks.map((check) => toRichCheckItem(check, data?.assetPreview)),
                      }))}
                      defaultExpanded={false}
                      showClickHint={true}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}

                {/* ─── Content & Authority (Content Signals + Topical Authority + Entity Clarity) ─── */}
                {(() => {
                  const contentKeys = ['content-signals', 'topical-authority', 'entity-clarity'];
                  const contentDims = revealDimensions.filter((d) => contentKeys.includes(d.key));
                  if (contentDims.length === 0) return null;
                  const allChecks = contentDims.flatMap((d) => d.checks);
                  const avgScore = Math.round(contentDims.reduce((s, d) => s + d.percentage, 0) / contentDims.length);
                  return (
                    <YwsBreakdownSection
                      title="Content & Authority"
                      score={avgScore}
                      scoreColor={scoreColor(avgScore)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={allChecks.filter((c) => c.verdict === 'pass').length}
                      failCount={allChecks.filter((c) => c.verdict === 'fail').length}
                      unknownCount={allChecks.filter((c) => c.verdict === 'unknown').length}
                      checks={[]}
                      subSections={contentDims.map((d) => ({
                        label: d.label,
                        checks: d.checks.map((check) => toRichCheckItem(check, data?.assetPreview)),
                      }))}
                      defaultExpanded={false}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}

                {/* ─── Website Quality (Site Quality + Open Graph + Twitter Cards) ─── */}
                {(() => {
                  const qualityPillar = data?.webHealth?.pillars?.find((p) => p.key === 'quality');
                  const qualityChecks = buildWebsiteQualityChecks(data?.webHealth, revealDimensions, data?.assetPreview);
                  const ogCheck = data?.webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Open Graph coverage' || c.id === 'whq-open-graph');
                  const twitterCheck = data?.webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Twitter card coverage' || c.id === 'whq-twitter');
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
                    ? [toRichCheckItem({ label: 'Open Graph coverage', detail: ogCheck.detail, verdict: ogCheck.verdict, points: ogCheck.points, maxPoints: ogCheck.maxPoints }, data?.assetPreview)]
                    : [
                        { label: 'Title', fixContent: getCheckFixContent('Title') },
                        { label: 'Description', fixContent: getCheckFixContent('Meta Description') },
                      ];
                  const twitterChecks = twitterCheck
                    ? [toRichCheckItem({ label: 'Twitter card coverage', detail: twitterCheck.detail, verdict: twitterCheck.verdict, points: twitterCheck.points, maxPoints: twitterCheck.maxPoints }, data?.assetPreview)]
                    : [
                        { label: 'Card Type', fixContent: getCheckFixContent('Twitter card coverage') },
                        { label: 'Description', fixContent: getCheckFixContent('Meta Description') },
                        { label: 'Title', fixContent: getCheckFixContent('Title') },
                        { label: 'Image', fixContent: getCheckFixContent('Open Graph coverage') },
                      ];
                  const allQualityChecks = [...(qualityPillar?.checks ?? [])];
                  const qualityPass = allQualityChecks.filter((c) => c.verdict === 'pass').length;
                  const qualityFail = allQualityChecks.filter((c) => c.verdict === 'fail').length;
                  const qualityUnknown = allQualityChecks.filter((c) => c.verdict === 'unknown').length;
                  return (
                    <YwsBreakdownSection
                      title="Website Quality"
                      score={qualityPillar?.percentage ?? data?.scores?.webHealth ?? null}
                      scoreColor={scoreColor(qualityPillar?.percentage ?? data?.scores?.webHealth ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={qualityPass}
                      failCount={qualityFail}
                      unknownCount={qualityUnknown}
                      checks={[]}
                      subSections={[
                        { label: 'Site Quality', checks: siteQualityChecks },
                        { label: 'Open Graph', checks: openGraphChecks },
                        { label: 'Twitter Cards', checks: twitterChecks },
                      ]}
                      defaultExpanded={false}
                      showClickHint={revealDimensions.length === 0}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}

                {/* ─── Performance & Security (Trust & Security + PageSpeed) ─── */}
                {(() => {
                  const securityPillar = data?.webHealth?.pillars?.find((p) => p.key === 'security');
                  const perfPillar = data?.webHealth?.pillars?.find((p) => p.key === 'performance');
                  const securityChecks = buildSecurityChecks(data?.webHealth);
                  const perfChecks = buildPerformanceChecks(data?.webHealth);
                  const secChecksArr = securityChecks.length > 0
                    ? securityChecks
                    : [
                        { label: 'HTTPS' },
                        { label: 'HTTP Strict Transport Security' },
                        { label: 'Content Security Policy' },
                        { label: 'Frame Protection' },
                        { label: 'MIME Type Protection' },
                      ];
                  const perfChecksArr = perfChecks.length > 0
                    ? perfChecks
                    : [
                        { label: 'Performance score' },
                        { label: 'Largest Contentful Paint' },
                        { label: 'Cumulative Layout Shift' },
                        { label: 'Total Blocking Time' },
                      ];
                  const allPillarChecks = [...(securityPillar?.checks ?? []), ...(perfPillar?.checks ?? [])];
                  const totalPass = allPillarChecks.filter((c) => c.verdict === 'pass').length;
                  const totalFail = allPillarChecks.filter((c) => c.verdict === 'fail').length;
                  const totalUnknown = allPillarChecks.filter((c) => c.verdict === 'unknown').length;
                  const secScore = securityPillar?.percentage ?? null;
                  const perfScore = perfPillar?.percentage ?? null;
                  const avgScore = secScore !== null && perfScore !== null
                    ? Math.round((secScore + perfScore) / 2)
                    : secScore ?? perfScore;
                  return (
                    <YwsBreakdownSection
                      title="Performance & Security"
                      score={avgScore}
                      scoreColor={scoreColor(avgScore)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={totalPass}
                      failCount={totalFail}
                      unknownCount={totalUnknown}
                      checks={[]}
                      subSections={[
                        { label: 'Trust & Security', checks: secChecksArr },
                        { label: 'PageSpeed', checks: perfChecksArr },
                      ]}
                      defaultExpanded={false}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}
              </div>
            </section>

          </>
        )}

        {/* ─── Loading Report ────────────────────────────────────── */}
        {reportId && !report && loadingReport && (
          <div className="aiso-card flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
              <p className="text-sm text-[var(--text-secondary)]">{unlockingCheckout ? 'Unlocking your paid report...' : 'Loading your intelligence report...'}</p>
            </div>
          </div>
        )}

        {reportId && !report && !loadingReport && (
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
                  {
                    label: 'AI Mentions',
                    score: (report as ReportData & { mentionSummary?: MentionSummary }).mentionSummary?.overallScore ?? null,
                    color: scoreColor((report as ReportData & { mentionSummary?: MentionSummary }).mentionSummary?.overallScore ?? null),
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
                      <Link href={`/dashboard?report=${report.id}`} className="aiso-button aiso-button-primary px-4 py-2.5 text-sm">
                        Open dashboard
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

            {/* Share + Copy buttons row */}
            <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
              {report.copyToLlm?.fullPrompt && (
                <button type="button" onClick={handleCopyReportPrompt} className="aiso-button aiso-button-secondary px-4 py-2.5 text-sm">
                  <Copy className="h-4 w-4" />
                  {reportPromptCopied ? 'Copied full prompt' : 'Copy to LLM'}
                </button>
              )}
              <button
                type="button"
                onClick={() => shareUrl && openXShareIntent(sharePostText)}
                className="aiso-button aiso-button-secondary px-4 py-2.5 text-sm"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>

            {/* Click to open/close hint */}
            <div className="mb-2 flex items-center justify-end gap-1.5 text-[11px] text-zinc-400">
              <span className="animate-bounce">👇</span>
              Click to open / close
            </div>

            {/* Scrollable sections */}
            <div className="space-y-4">
              {/* ─── AI Mentions Section (first, most prominent) ─── */}
              {(() => {
                const mentionData = (report as ReportData & { mentionSummary?: MentionSummary }).mentionSummary ?? (data as unknown as Record<string, unknown>)?.mentionSummary as MentionSummary | undefined;
                if (!mentionData) return null;
                const engines: AIEngine[] = AI_ENGINES;
                const mentionPass = engines.filter((e) => mentionData.engineStatus[e]?.status === 'complete' && mentionData.engineBreakdown[e]?.mentioned > 0).length;
                const mentionFail = engines.filter((e) => mentionData.engineStatus[e]?.status === 'complete' && mentionData.engineBreakdown[e]?.mentioned === 0 && mentionData.engineBreakdown[e]?.total > 0).length;
                return (
                  <YwsBreakdownSection
                    title="AI Mentions"
                    score={mentionData.overallScore}
                    scoreColor={scoreColor(mentionData.overallScore)}
                    passCount={mentionPass}
                    failCount={mentionFail}
                    unknownCount={engines.length - mentionPass - mentionFail}
                    checks={[]}
                    subSections={[
                      {
                        label: 'Engine Breakdown',
                        checks: engines.map((engine) => {
                          const eb = mentionData.engineBreakdown[engine];
                          const status = mentionData.engineStatus[engine];
                          const mentioned = eb?.mentioned ?? 0;
                          const total = eb?.total ?? 0;
                          return {
                            label: getAIEngineLabel(engine),
                            detail: status?.status === 'not_backfilled'
                              ? 'Not tested on this scan yet'
                              : status?.status === 'not_configured'
                                ? 'Not configured on this run'
                                : status?.status === 'error'
                                  ? `Testing error${status.errorMessage ? ` · ${status.errorMessage}` : ''}`
                                  : `${mentioned}/${total} prompts mentioned · ${eb?.sentiment ?? 'not-found'}`,
                            verdict: status?.status !== 'complete'
                              ? 'unknown' as const
                              : mentioned > 0 ? 'pass' as const : 'fail' as const,
                            engineKey: engine,
                          };
                        }),
                      },
                      {
                        label: 'Prompt Results',
                        checks: mentionData.promptsUsed.map((prompt) => {
                          const promptResults = mentionData.results.filter((r) => r.prompt.id === prompt.id);
                          const mentionedCount = promptResults.filter((r) => r.mentioned).length;
                          return {
                            label: `"${prompt.text}"`,
                            detail: `Mentioned by ${mentionedCount}/${promptResults.length} engines`,
                            verdict: mentionedCount > promptResults.length / 2 ? 'pass' as const : 'fail' as const,
                          };
                        }),
                      },
                      ...(mentionData.competitorsMentioned.length > 0
                        ? [{
                            label: 'Top Competitors',
                            checks: mentionData.competitorsMentioned.slice(0, 5).map((c) => ({
                              label: c.name,
                              detail: `Mentioned ${c.count} times across AI engines`,
                              verdict: 'unknown' as const,
                            })),
                          }]
                        : []),
                    ]}
                    defaultExpanded={false}
                    showClickHint={false}
                    hasPaid={canPreviewGatedChecks}
                  />
                );
              })()}

              {/* ─── Repair Queue Section (collapsible) ─── */}
              <YwsBreakdownSection
                title="Repair Queue"
                score={null}
                maxScore={reportFixes.length}
                scoreColor={scoreColor(null)}
                passCount={reportFixes.filter((f) => f.category === 'ai').length}
                failCount={reportFixes.filter((f) => f.category === 'web').length}
                unknownCount={0}
                checks={reportFixes.slice(0, 10).map((fix) => ({
                  label: fix.label,
                  detail: `${fix.instruction} (+${fix.estimatedLift} pts, ${fix.effortBand} effort)`,
                  verdict: 'fail' as const,
                }))}
                defaultExpanded={false}
                hasPaid={canPreviewGatedChecks}
              />
                {/* ─── AI Readiness (File Presence + Structured Data + AI Registration) ─── */}
                {(() => {
                  const readinessKeys = ['file-presence', 'structured-data', 'ai-registration'];
                  const readinessDims = reportDimensions.filter((d) => readinessKeys.includes(d.key));
                  if (readinessDims.length === 0) return null;
                  const allChecks = readinessDims.flatMap((d) => d.checks);
                  const avgScore = Math.round(readinessDims.reduce((s, d) => s + d.percentage, 0) / readinessDims.length);
                  return (
                    <YwsBreakdownSection
                      title="AI Readiness"
                      score={avgScore}
                      scoreColor={scoreColor(avgScore)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={allChecks.filter((c) => c.verdict === 'pass').length}
                      failCount={allChecks.filter((c) => c.verdict === 'fail').length}
                      unknownCount={allChecks.filter((c) => c.verdict === 'unknown').length}
                      checks={[]}
                      subSections={readinessDims.map((d) => ({
                        label: d.label,
                        checks: d.checks.map((check) => toRichCheckItem(check, data?.assetPreview)),
                      }))}
                      defaultExpanded={false}
                      showClickHint={true}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}

                {/* ─── Content & Authority (Content Signals + Topical Authority + Entity Clarity) ─── */}
                {(() => {
                  const contentKeys = ['content-signals', 'topical-authority', 'entity-clarity'];
                  const contentDims = reportDimensions.filter((d) => contentKeys.includes(d.key));
                  if (contentDims.length === 0) return null;
                  const allChecks = contentDims.flatMap((d) => d.checks);
                  const avgScore = Math.round(contentDims.reduce((s, d) => s + d.percentage, 0) / contentDims.length);
                  return (
                    <YwsBreakdownSection
                      title="Content & Authority"
                      score={avgScore}
                      scoreColor={scoreColor(avgScore)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={allChecks.filter((c) => c.verdict === 'pass').length}
                      failCount={allChecks.filter((c) => c.verdict === 'fail').length}
                      unknownCount={allChecks.filter((c) => c.verdict === 'unknown').length}
                      checks={[]}
                      subSections={contentDims.map((d) => ({
                        label: d.label,
                        checks: d.checks.map((check) => toRichCheckItem(check, data?.assetPreview)),
                      }))}
                      defaultExpanded={false}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}

                {/* ─── Website Quality (Site Quality + Open Graph + Twitter Cards) ─── */}
                {(() => {
                  const qualityPillar = webHealth?.pillars?.find((p) => p.key === 'quality');
                  const qualityChecks = buildWebsiteQualityChecks(webHealth, reportDimensions, data?.assetPreview);
                  const ogCheck = webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Open Graph coverage' || c.id === 'whq-open-graph');
                  const twitterCheck = webHealth?.pillars
                    ?.find((p) => p.key === 'quality')
                    ?.checks?.find((c) => c.label === 'Twitter card coverage' || c.id === 'whq-twitter');
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
                    ? [toRichCheckItem({ label: 'Open Graph coverage', detail: ogCheck.detail, verdict: ogCheck.verdict, points: ogCheck.points, maxPoints: ogCheck.maxPoints }, data?.assetPreview)]
                    : [
                        { label: 'Title', fixContent: getCheckFixContent('Title') },
                        { label: 'Description', fixContent: getCheckFixContent('Meta Description') },
                      ];
                  const twitterChecks = twitterCheck
                    ? [toRichCheckItem({ label: 'Twitter card coverage', detail: twitterCheck.detail, verdict: twitterCheck.verdict, points: twitterCheck.points, maxPoints: twitterCheck.maxPoints }, data?.assetPreview)]
                    : [
                        { label: 'Card Type', fixContent: getCheckFixContent('Twitter card coverage') },
                        { label: 'Description', fixContent: getCheckFixContent('Meta Description') },
                        { label: 'Title', fixContent: getCheckFixContent('Title') },
                        { label: 'Image', fixContent: getCheckFixContent('Open Graph coverage') },
                      ];
                  const allQualityChecks = [...(qualityPillar?.checks ?? [])];
                  const qualityPass = allQualityChecks.filter((c) => c.verdict === 'pass').length;
                  const qualityFail = allQualityChecks.filter((c) => c.verdict === 'fail').length;
                  const qualityUnknown = allQualityChecks.filter((c) => c.verdict === 'unknown').length;
                  return (
                    <YwsBreakdownSection
                      title="Website Quality"
                      score={qualityPillar?.percentage ?? webHealth?.percentage ?? null}
                      scoreColor={scoreColor(qualityPillar?.percentage ?? webHealth?.percentage ?? null)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={qualityPass}
                      failCount={qualityFail}
                      unknownCount={qualityUnknown}
                      checks={[]}
                      subSections={[
                        { label: 'Site Quality', checks: siteQualityChecks },
                        { label: 'Open Graph', checks: openGraphChecks },
                        { label: 'Twitter Cards', checks: twitterChecks },
                      ]}
                      defaultExpanded={false}
                      showClickHint={reportDimensions.length === 0}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}

                {/* ─── Performance & Security (Trust & Security + PageSpeed) ─── */}
                {(() => {
                  const securityPillar = webHealth?.pillars?.find((p) => p.key === 'security');
                  const perfPillar = webHealth?.pillars?.find((p) => p.key === 'performance');
                  const securityChecks = buildSecurityChecks(webHealth);
                  const perfChecks = buildPerformanceChecks(webHealth);
                  const secChecksArr = securityChecks.length > 0
                    ? securityChecks
                    : [
                        { label: 'HTTPS' },
                        { label: 'HTTP Strict Transport Security' },
                        { label: 'Content Security Policy' },
                        { label: 'Frame Protection' },
                        { label: 'MIME Type Protection' },
                      ];
                  const perfChecksArr = perfChecks.length > 0
                    ? perfChecks
                    : [
                        { label: 'Performance score' },
                        { label: 'Largest Contentful Paint' },
                        { label: 'Cumulative Layout Shift' },
                        { label: 'Total Blocking Time' },
                      ];
                  const allPillarChecks = [...(securityPillar?.checks ?? []), ...(perfPillar?.checks ?? [])];
                  const totalPass = allPillarChecks.filter((c) => c.verdict === 'pass').length;
                  const totalFail = allPillarChecks.filter((c) => c.verdict === 'fail').length;
                  const totalUnknown = allPillarChecks.filter((c) => c.verdict === 'unknown').length;
                  const secScore = securityPillar?.percentage ?? null;
                  const perfScore = perfPillar?.percentage ?? null;
                  const avgScore = secScore !== null && perfScore !== null
                    ? Math.round((secScore + perfScore) / 2)
                    : secScore ?? perfScore;
                  return (
                    <YwsBreakdownSection
                      title="Performance & Security"
                      score={avgScore}
                      scoreColor={scoreColor(avgScore)}
                      onCopyToLlm={handleCopyReportPrompt}
                      copied={reportPromptCopied}
                      passCount={totalPass}
                      failCount={totalFail}
                      unknownCount={totalUnknown}
                      checks={[]}
                      subSections={[
                        { label: 'Trust & Security', checks: secChecksArr },
                        { label: 'PageSpeed', checks: perfChecksArr },
                      ]}
                      defaultExpanded={false}
                      hasPaid={canPreviewGatedChecks}
                    />
                  );
                })()}
              </div>

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
              We found <span className="font-semibold text-[var(--text-primary)]">{failedCount}</span> issue{failedCount !== 1 ? 's' : ''} on <span className="font-semibold text-[var(--text-primary)]">{getDomain(report.url)}</span>. Unlock your fix plan.
            </p>
            <button onClick={() => setUnlockModalOpen(true)} disabled={checkoutLoading} className="aiso-button aiso-button-primary px-5 py-3 text-sm">
              {checkoutLoading ? 'Loading...' : 'Unlock Fix Plan — $35'}
            </button>
          </div>
        </div>
      )}

      {/* Feedback button - YourWebsiteScore style */}
      {(report || (isComplete && data?.score !== undefined)) && (
        <FloatingFeedback
          bottomClassName={report?.hasPaid ? 'bottom-6' : report ? 'bottom-24' : 'bottom-6'}
        />
      )}

    </div>
  );
}

/* TabButton removed — tabs replaced with scrollable layout */

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
