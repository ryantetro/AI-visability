'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Download,
  ExternalLink,
  FileCode2,
  FileJson2,
  Globe2,
  Mail,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Waypoints,
  X,
  type LucideIcon,
} from 'lucide-react';

import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart,
  Bar, BarChart, XAxis, YAxis,
  Cell, Pie, PieChart,
  Line, LineChart,
  ResponsiveContainer, Tooltip,
} from 'recharts';

import { CollapsibleSection, DashboardPanel, MiniInfoTile, SectionTitle } from '@/components/app/dashboard-primitives';
import { RoadmapView } from './roadmap-view';
import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { getRecentScanEntries, rememberRecentScan } from '@/lib/recent-scans';
import { ensureProtocol, getDomain, getFaviconUrl } from '@/lib/url-utils';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
  installInstructions: string;
}

interface FilesData {
  files: GeneratedFile[];
  generatedAt: number;
  detectedPlatform: 'wordpress' | 'squarespace' | 'webflow' | 'custom';
  url: string;
  copyToLlm: {
    fullPrompt: string;
    remainingFixesPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  } | null;
}

interface DashboardReportData {
  id: string;
  url: string;
  hasPaid: boolean;
  score: {
    fixes: PrioritizedFix[];
    scores: {
      aiVisibility: number;
      webHealth: number | null;
      overall: number | null;
      potentialLift: number | null;
    };
    overallBandInfo?: {
      label: string;
      color: string;
    };
    dimensions?: Array<{
      key: string;
      label: string;
      score: number;
      maxScore: number;
      percentage: number;
      checks: Array<{
        id: string;
        label: string;
        verdict: 'pass' | 'fail' | 'unknown';
        points: number;
        maxPoints: number;
      }>;
    }>;
    webHealth?: {
      updatedAt?: number;
      pillars?: Array<{
        key: 'performance' | 'quality' | 'security';
        percentage: number | null;
      }>;
    } | null;
  };
  fixes?: PrioritizedFix[];
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  copyToLlm?: {
    fullPrompt: string;
    remainingFixesPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  };
  mentionSummary?: {
    overallScore: number;
    results?: Array<{
      engine: string;
      mentioned: boolean;
      citationPresent: boolean;
      citationUrls?: Array<{
        url: string;
        domain: string;
        anchorText: string | null;
        isOwnDomain: boolean;
        isCompetitor: boolean;
      }>;
      prompt: { text: string; category: string };
    }>;
  } | null;
}

interface ApiErrorPayload {
  error?: string;
}

interface RecentScanData {
  id: string;
  url: string;
  status: string;
  score?: number;
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  previewFixes?: Array<{ checkId: string; label: string }>;
  hasEmail: boolean;
  hasPaid: boolean;
  createdAt: number;
  completedAt?: number;
}

interface SiteSummary {
  domain: string;
  url: string;
  latestScan: RecentScanData | null;
  latestPaidScan: RecentScanData | null;
  lastTouchedAt: number | null;
  source: 'paid' | 'manual';
}

interface FileMeta {
  subtitle: string;
  purpose: string;
  installTarget: string;
  verify: string;
  icon: LucideIcon;
}

interface WorkstreamMeta {
  key: 'ai-visibility' | 'crawl-discovery' | 'structured-data' | 'performance' | 'trust';
  title: string;
  description: string;
  icon: LucideIcon;
}

const FILE_META: Record<string, FileMeta> = {
  'llms.txt': {
    subtitle: 'AI Guidance Layer',
    purpose: 'Supplies context for LLM agents about your organization and priority pages.',
    installTarget: 'Serve as /llms.txt from your public site root.',
    verify: 'Open /llms.txt in a private browser window and confirm content loads publicly.',
    icon: Bot,
  },
  'robots.txt': {
    subtitle: 'Crawler Access Policy',
    purpose: 'Declares crawl permissions so AI and search bots can read your important URLs.',
    installTarget: 'Publish as /robots.txt and preserve any existing required directives.',
    verify: 'Open /robots.txt and verify bot allow rules plus sitemap directives are present.',
    icon: ShieldCheck,
  },
  'organization-schema.json': {
    subtitle: 'Entity Definition',
    purpose: 'Strengthens machine understanding of your business with Organization JSON-LD.',
    installTarget: 'Embed as one JSON-LD script block in your homepage <head>.',
    verify: 'Inspect source and confirm one valid schema script block is rendered.',
    icon: FileJson2,
  },
  'sitemap.xml': {
    subtitle: 'Discovery Map',
    purpose: 'Provides canonical URL inventory for discovery and refresh in crawler pipelines.',
    installTarget: 'Serve as /sitemap.xml and reference it from robots.txt.',
    verify: 'Open /sitemap.xml and check that URLs are live and canonical.',
    icon: Globe2,
  },
};

const DEFAULT_META: FileMeta = {
  subtitle: 'Generated Asset',
  purpose: 'Supports AI visibility signal quality and crawl discoverability.',
  installTarget: 'Deploy this file as part of your web configuration.',
  verify: 'Publish and re-run scan to validate impact.',
  icon: FileCode2,
};

const WORKSTREAMS: WorkstreamMeta[] = [
  {
    key: 'ai-visibility',
    title: 'AI visibility',
    description: 'Clarify what your site is about and what AI systems should understand first.',
    icon: Bot,
  },
  {
    key: 'crawl-discovery',
    title: 'Crawl & discovery',
    description: 'Make important pages easier for crawlers and indexers to find and trust.',
    icon: Waypoints,
  },
  {
    key: 'structured-data',
    title: 'Structured data',
    description: 'Improve entity clarity with schema and machine-readable identity signals.',
    icon: FileJson2,
  },
  {
    key: 'performance',
    title: 'Performance & web health',
    description: 'Improve speed, quality, and technical reliability.',
    icon: RefreshCw,
  },
  {
    key: 'trust',
    title: 'Trust & quality',
    description: 'Reduce credibility gaps and strengthen quality/security signals.',
    icon: ShieldCheck,
  },
];

const UPGRADE_FEATURES = [
  'Unlimited website analyses',
  'High authority do-follow backlink',
  'Website score badge',
  'Daily automated monitoring (up to 10 domains)',
  'Critical change alerts',
  'History tracking',
  'Certified report page',
  'Copy to LLM',
];

const MAX_DOMAINS = 10;
const MONITORED_DOMAINS_KEY = 'aiso_monitored_domains';
const HIDDEN_DOMAINS_KEY = 'aiso_hidden_monitored_domains';
const ADVANCED_PAID_PREVIEW_KEY = 'aiso_advanced_paid_unlocked';

// Tab type removed — advanced page is now a single scrollable layout

function getFileMeta(filename: string): FileMeta {
  return FILE_META[filename] ?? DEFAULT_META;
}

function formatGeneratedAt(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatShortDate(timestamp?: number | null): string {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return 'No recent activity';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return minutes <= 1 ? '1 min ago' : `${minutes} mins ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
  return formatShortDate(timestamp);
}

function verificationPath(baseUrl: string, filename: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  return filename === 'organization-schema.json' ? `${normalized}/` : `${normalized}/${filename}`;
}

function buildCursorPrompt(
  file: GeneratedFile,
  domain: string,
  platform: string,
  meta: FileMeta,
  baseUrl: string
): string {
  const isSchema = file.filename === 'organization-schema.json';
  const siteUrl = baseUrl.replace(/\/$/, '');

  if (isSchema) {
    return `You are a senior web developer implementing AI visibility improvements for ${domain} (${platform}).

## Task
Add Organization JSON-LD structured data to the homepage so AI models (ChatGPT, Claude, Perplexity) can definitively identify this business.

## What to Do
Add a single \`<script type="application/ld+json">\` block inside the \`<head>\` tag of the site's homepage. Use the exact JSON below — do not modify field values.

\`\`\`json
${file.content}
\`\`\`

## Platform-Specific Instructions
- **WordPress**: Add to \`header.php\` in your theme, or use a plugin like "Insert Headers and Footers" to paste the script tag into the site-wide head.
- **Next.js / React**: Add inside the \`<Head>\` component of your root layout or homepage component. Use \`dangerouslySetInnerHTML\` or a \`<script>\` tag with \`type="application/ld+json"\`.
- **Shopify**: Go to Online Store → Themes → Edit Code → \`theme.liquid\`, paste inside the \`<head>\` block.
- **Static HTML**: Paste directly inside \`<head>\` in your \`index.html\`.
- **Webflow / Squarespace**: Use the custom code injection feature in site settings (head code).

## Why This Matters
Organization schema is the single most important structured data signal for AI models. It tells them your exact business name, what you do, your logo, and your social profiles — preventing hallucination and ensuring accurate citations.

## Verification
1. Deploy the change
2. Visit ${siteUrl}/ and view page source (Ctrl+U / Cmd+U)
3. Search for \`application/ld+json\` — the schema JSON should appear in the \`<head>\`
4. Validate at https://validator.schema.org/ by pasting the URL`;
  }

  const filePath = file.filename === 'llms.txt' ? '/llms.txt' : `/${file.filename}`;
  const fileContext = getFileDeployContext(file.filename);

  return `You are a senior web developer implementing AI visibility improvements for ${domain} (${platform}).

## Task
Create \`${filePath}\` at the site root so it is publicly accessible at \`${siteUrl}${filePath}\`.

## Purpose
${meta.purpose}

## File Content
Create the file with the exact content below. Do not modify it.

\`\`\`
${file.content}
\`\`\`

${fileContext}
## Deployment
Target: ${meta.installTarget}

## Platform-Specific Instructions
- **WordPress**: Upload to the WordPress root directory (same level as \`wp-config.php\`), or use a plugin like Yoast SEO (for robots.txt/sitemap) to manage it through the admin panel.
- **Next.js / React**: Place in the \`public/\` directory as \`public${filePath}\`. It will be served at the root automatically.
- **Shopify**: For \`robots.txt\`, edit via Online Store → Themes → Edit Code → \`robots.txt.liquid\`. Other files may need a URL redirect or a custom page.
- **Static HTML / Apache**: Place the file in your document root. Ensure your server config doesn't block it.
- **Netlify / Vercel**: Place in the \`public/\` or \`static/\` directory. It will be served at the site root.

## Verification
1. Deploy the file
2. Open \`${siteUrl}${filePath}\` in a browser — the file content should display as plain text
3. Confirm the response has a 200 status code (check in browser DevTools → Network tab)`;
}

function getFileDeployContext(filename: string): string {
  switch (filename) {
    case 'llms.txt':
      return `## Why This Matters
\`llms.txt\` is an emerging standard that helps AI models understand your organization at a glance. AI crawlers (GPTBot, ClaudeBot, PerplexityBot) check for this file to get a structured overview of who you are, what you do, and which pages matter most. Without it, AI models must infer this from scattered page content — which leads to less accurate citations.

`;
    case 'robots.txt':
      return `## Why This Matters
AI crawlers like GPTBot, ClaudeBot, and PerplexityBot respect robots.txt directives. Without explicit \`Allow\` rules for these user agents, your site may be partially or fully invisible to AI-powered search. This file also includes a \`Sitemap:\` directive so crawlers can discover all your content.

`;
    case 'sitemap.xml':
      return `## Why This Matters
A sitemap tells AI crawlers exactly which pages exist and when they were last updated. Without one, crawlers must discover pages by following links — which means deep or orphaned pages may never be found. AI models use sitemaps to prioritize which content to index and reference.

`;
    default:
      return '';
  }
}

function normalizeDomainInput(value: string) {
  return value.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || '';
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-zinc-500';
  if (score >= 80) return 'text-[#25c972]';
  if (score >= 60) return 'text-[#ffbb00]';
  if (score >= 40) return 'text-[#ff8a1e]';
  return 'text-[#ff5252]';
}

function getScoreColor(score: number | null) {
  if (score === null) return 'var(--color-primary)';
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-error)';
}

function loadStoredDomains(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MONITORED_DOMAINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function saveStoredDomains(domains: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MONITORED_DOMAINS_KEY, JSON.stringify(domains));
}

function loadHiddenDomains(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_DOMAINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function saveHiddenDomains(domains: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HIDDEN_DOMAINS_KEY, JSON.stringify(domains));
}

function loadStoredBoolean(key: string) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === 'true';
}

function saveStoredBoolean(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function deriveWorkstream(fix: PrioritizedFix): WorkstreamMeta['key'] {
  if (fix.category === 'web') {
    if (fix.dimension === 'security' || fix.dimension === 'quality') return 'trust';
    return 'performance';
  }

  if (fix.dimension === 'file-presence') return 'crawl-discovery';
  if (fix.dimension === 'structured-data' || fix.dimension === 'entity-clarity') return 'structured-data';
  if (fix.dimension === 'ai-registration') return 'crawl-discovery';
  if (fix.dimension === 'content-signals' || fix.dimension === 'topical-authority') return 'ai-visibility';
  return 'ai-visibility';
}

function getGroupedFixes(fixes: PrioritizedFix[]) {
  return WORKSTREAMS.map((stream) => ({
    ...stream,
    fixes: fixes.filter((fix) => deriveWorkstream(fix) === stream.key),
  })).filter((stream) => stream.fixes.length > 0);
}

function matchFixToFile(fix: PrioritizedFix, files: GeneratedFile[]) {
  const text = `${fix.label} ${fix.detail} ${fix.instruction}`.toLowerCase();
  const target =
    text.includes('llms') ? 'llms.txt'
    : text.includes('robots') ? 'robots.txt'
    : text.includes('schema') || text.includes('json-ld') || text.includes('organization') ? 'organization-schema.json'
    : text.includes('sitemap') ? 'sitemap.xml'
    : null;

  return target ? files.find((file) => file.filename === target) ?? null : null;
}

function getLatestScanByDomain(scans: RecentScanData[], domain: string) {
  return (
    scans
      .filter((scan) => getDomain(scan.url) === domain)
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))[0] ?? null
  );
}

function getLatestPaidScanByDomain(scans: RecentScanData[], domain: string) {
  return (
    scans
      .filter((scan) => scan.hasPaid && getDomain(scan.url) === domain)
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))[0] ?? null
  );
}

function UnpaidAdvancedLanding({
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationAlertsOn, setNotificationAlertsOn] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('ryantetro@gmail.com');
  const [saveEmailLoading, setSaveEmailLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-white">

      <div className="mx-auto max-w-[840px] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div />
          <h1 className="text-center text-[2rem] font-bold tracking-tight text-white sm:text-[2.25rem]">
            Advanced
          </h1>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.045] px-3.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.065]"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
          </div>
        </div>

        <p className="mx-auto mt-2 max-w-[540px] text-center text-[13px] leading-6 text-zinc-400">
          Daily monitoring, live badges, certified pages, and automatic backlinks for your domains.
        </p>

        <div className="mx-auto mt-7 w-full max-w-[520px] rounded-xl border border-amber-500/65 bg-[linear-gradient(180deg,rgba(16,12,7,0.98)_0%,rgba(7,7,7,0.98)_100%)] p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-amber-400">
            Upgrade for full access
          </h2>
          <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">
            Daily monitoring, instant alerts, certified pages, and backlinks.
          </p>
          <div className="mt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
              Everything you get
            </p>
            <ul className="space-y-2">
              {UPGRADE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-[13px] text-zinc-100">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={onOpenUnlock}
            className="mt-6 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#f7a300] px-5 text-[0.95rem] font-semibold text-black transition-colors hover:bg-[#ffaf19]"
          >
            <Crown className="h-4 w-4" />
            Unlock All Features
          </button>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-[520px] flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-[#1b1b1c] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
              {inputFaviconUrl ? (
                <img src={inputFaviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
              ) : (
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#4ea1ff]" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={domainInput}
                onChange={(event) => onDomainInputChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onAddDomain()}
                placeholder="example.com"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onAddDomain}
              className="h-11 shrink-0 rounded-lg bg-[#d6d6d6] px-6 text-[13px] font-medium text-black transition-colors hover:bg-white"
            >
              Add domain
            </button>
          </div>
          {addError ? <p className="text-[11px] text-red-400">{addError}</p> : null}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/8 bg-[#161616] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(event) => onConfirmChange(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/15 bg-transparent accent-zinc-400"
            />
            <span className="text-[12px] leading-6 text-zinc-500">
              I confirm that I own this domain or have explicit authorization from the domain owner to monitor it. I understand that monitoring domains without proper authorization may violate terms of service and applicable laws.
            </span>
          </label>
        </div>

        {pendingDomain ? (
          <div className="mx-auto mt-7 w-full max-w-[840px] rounded-[1.35rem] border border-[#f7a300]/30 bg-[linear-gradient(180deg,rgba(18,15,10,0.98)_0%,rgba(10,10,10,0.98)_100%)] p-5 shadow-[0_0_0_1px_rgba(247,163,0,0.08),inset_0_1px_0_rgba(255,255,255,0.025)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/85">
              Ready to unlock
            </p>
            <h3 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-white">
              {pendingDomain} will become your first advanced workspace
            </h3>
            <p className="mt-2 max-w-[38rem] text-[13px] leading-6 text-zinc-400">
              After payment, the full access card disappears, this domain moves to the top, and you can expand it on this same page to run the first scan or work from the live dashboard.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MiniInfoTile title="Unlock" body="Confirm payment to activate monitoring and advanced tooling for this domain." />
              <MiniInfoTile title="Expand" body="Open the domain inline on this page instead of leaving the advanced route." />
              <MiniInfoTile title="Run first scan" body="Generate the first report when you are ready, then the dashboard appears under the same card." />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenUnlock}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f7a300] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#ffaf19]"
              >
                <Crown className="h-4 w-4" />
                Unlock advanced for {pendingDomain}
              </button>
              <button
                type="button"
                onClick={focusInput}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                Change domain
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={focusInput}
            onKeyDown={(event) => event.key === 'Enter' && focusInput()}
            className="mx-auto mt-7 flex min-h-[220px] w-full max-w-[840px] cursor-pointer flex-col items-center justify-center rounded-xl border border-white/8 bg-[#101010] px-6 py-9 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] transition-colors hover:border-white/12 hover:bg-[#121212]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <Plus className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="mt-5 text-[1.35rem] font-semibold tracking-tight text-white">
              Add a domain to prepare your paid workspace
            </h3>
            <p className="mx-auto mt-2 max-w-[520px] text-[13px] leading-6 text-zinc-500">
              Choose the site you want to unlock first. After payment, it becomes the top card on this page and opens into your advanced inline workspace.
            </p>
          </div>
        )}

        <FloatingFeedback bottomClassName="bottom-4" compact />
      </div>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="center"
          showClose={false}
          className="min-h-[420px] w-[calc(100%-2rem)] max-w-[550px] rounded-lg border-white/10 bg-[var(--surface-page)] p-0"
        >
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Bell className="h-5 w-5 text-[var(--text-primary)]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Notification Settings
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
                    Get alerts when your domain scores change significantly.
                  </p>
                </div>
              </div>
              <SheetClose className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]">
                <X className="h-5 w-5" />
              </SheetClose>
            </div>

            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-white">Score change alerts</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Email me when my score goes up or down by 2+ points
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationAlertsOn}
                  onClick={() => setNotificationAlertsOn(!notificationAlertsOn)}
                  className={cn(
                    'relative h-5 w-10 shrink-0 rounded-full transition-colors',
                    notificationAlertsOn ? 'bg-[#25c972]' : 'bg-white/20'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                      notificationAlertsOn ? 'left-[calc(100%-1.125rem)]' : 'left-0.5'
                    )}
                  />
                </button>
              </div>

              <div>
                <label htmlFor="notification-email" className="block text-base font-medium text-white">
                  Notification email
                </label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    id="notification-email"
                    type="email"
                    value={notificationEmail}
                    onChange={(event) => setNotificationEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-md border border-white/10 bg-[#1e1e1e] py-2.5 pl-10 pr-4 text-base text-white placeholder:text-[var(--text-muted)] focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
                  />
                </div>
              </div>

              <div className="rounded-md bg-amber-500/20 px-4 py-3">
                <p className="text-[13px] text-amber-200/95 sm:text-sm">
                  Check your spam folder and mark emails as &quot;Not Spam&quot; to ensure you receive all notifications.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSaveEmailLoading(true);
                  setTimeout(() => setSaveEmailLoading(false), 800);
                }}
                disabled={saveEmailLoading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#333333] text-base font-semibold text-white transition-colors hover:bg-[#404040] disabled:opacity-60"
              >
                {saveEmailLoading ? 'Saving...' : 'Save email'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AdvancedPageContent({ reportId }: { reportId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReportId = reportId ?? '';
  const debugPaidPreview = searchParams.get('debugPaid') === '1';
  const roadmapTab = searchParams.get('tab') === 'roadmap';
  const [recentScans, setRecentScans] = useState<RecentScanData[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [manualDomains, setManualDomains] = useState<string[]>([]);
  const [hiddenDomains, setHiddenDomains] = useState<string[]>([]);
  const [paidOverride, setPaidOverride] = useState(false);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [files, setFiles] = useState<FilesData | null>(null);
  const [report, setReport] = useState<DashboardReportData | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(Boolean(initialReportId));
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reauditLoading, setReauditLoading] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState<string | null>(null);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);
  const [copiedReportBrief, setCopiedReportBrief] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringConnected, setMonitoringConnected] = useState<Record<string, boolean>>({});
  const [domainInput, setDomainInput] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setManualDomains(loadStoredDomains());
    setHiddenDomains(loadHiddenDomains());
    setPaidOverride(loadStoredBoolean(ADVANCED_PAID_PREVIEW_KEY));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecentScans() {
      const ids = getRecentScanEntries().map((entry) => entry.id);
      if (ids.length === 0) {
        if (active) {
          setRecentScans([]);
          setRecentLoading(false);
        }
        return;
      }

      try {
        const results = await Promise.all(
          ids.map(async (scanId) => {
            try {
              const response = await fetch(`/api/scan/${scanId}`);
              if (!response.ok) return null;
              return (await response.json()) as RecentScanData;
            } catch {
              return null;
            }
          })
        );

        if (!active) return;
        setRecentScans(
          results
            .filter((entry): entry is RecentScanData => Boolean(entry))
            .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
        );
      } finally {
        if (active) {
          setRecentLoading(false);
        }
      }
    }

    void loadRecentScans();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialReportId) {
      rememberRecentScan(initialReportId);
    }
  }, [initialReportId]);

  useEffect(() => {
    if (!initialReportId || recentScans.length === 0) return;
    const matchedScan = recentScans.find((scan) => scan.id === initialReportId);
    if (!matchedScan) return;
    setExpandedDomain(getDomain(matchedScan.url));
  }, [initialReportId, recentScans]);

  // Checkout verification — show success banner after payment redirect
  useEffect(() => {
    const isCheckoutSuccess = searchParams.get('checkout') === 'success';
    const sessionId = searchParams.get('session_id');
    if (!isCheckoutSuccess || !sessionId) return;

    let active = true;
    async function verifyCheckout() {
      try {
        const res = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.paid) {
          const domain = initialReportId
            ? recentScans.find((s) => s.id === initialReportId)?.url
            : null;
          setCheckoutBanner(
            `Payment confirmed. Here\u2019s your fix plan${domain ? ` for ${getDomain(domain)}` : ''}.`
          );
        }
      } catch {
        // Verification failed silently — user can still use the page
      }
    }

    void verifyCheckout();
    return () => { active = false; };
  }, [searchParams, initialReportId, recentScans]);

  const paidDomains = useMemo(() => {
    const seen = new Set<string>();
    return recentScans.reduce<string[]>((domains, scan) => {
      if (!scan.hasPaid) return domains;
      const domain = getDomain(scan.url);
      if (hiddenDomains.includes(domain) || seen.has(domain)) return domains;
      seen.add(domain);
      domains.push(domain);
      return domains;
    }, []);
  }, [recentScans, hiddenDomains]);

  const monitoredSites = useMemo<SiteSummary[]>(() => {
    const domains = new Set<string>();
    const addDomain = (domain: string) => {
      if (!domain || hiddenDomains.includes(domain)) return;
      domains.add(domain);
    };

    paidDomains.forEach(addDomain);
    manualDomains.forEach(addDomain);
    if (report?.url) {
      addDomain(getDomain(report.url));
    }

    return [...domains]
      .map<SiteSummary>((domain) => {
        const latestScan = getLatestScanByDomain(recentScans, domain);
        const latestPaidScan = getLatestPaidScanByDomain(recentScans, domain);
        const url = latestPaidScan?.url ?? latestScan?.url ?? `https://${domain}`;
        return {
          domain,
          url,
          latestScan,
          latestPaidScan,
          lastTouchedAt:
            latestPaidScan?.completedAt ??
            latestPaidScan?.createdAt ??
            latestScan?.completedAt ??
            latestScan?.createdAt ??
            null,
          source: paidDomains.includes(domain) ? 'paid' : 'manual',
        };
      })
      .sort((a, b) => (b.lastTouchedAt ?? 0) - (a.lastTouchedAt ?? 0));
  }, [hiddenDomains, manualDomains, paidDomains, recentScans, report?.url]);

  const orderedMonitoredSites = useMemo(() => {
    if (!expandedDomain) return monitoredSites;
    return [
      ...monitoredSites.filter((site) => site.domain === expandedDomain),
      ...monitoredSites.filter((site) => site.domain !== expandedDomain),
    ];
  }, [expandedDomain, monitoredSites]);

  const expandedSite = orderedMonitoredSites.find((site) => site.domain === expandedDomain) ?? null;
  const activeWorkspaceReportId =
    expandedSite?.latestPaidScan?.id ??
    expandedSite?.latestScan?.id ??
    (initialReportId || '');

  useEffect(() => {
    setWorkspaceLoading(Boolean(activeWorkspaceReportId));
    setLoadError('');
    setActionError('');
    setFiles(null);
    setReport(null);
    setSelectedFilename(null);

    if (!activeWorkspaceReportId) return;

    let active = true;

    async function fetchWorkspaceData() {
      try {
        const reportResponse = await fetch(`/api/scan/${activeWorkspaceReportId}/report`);
        if (!reportResponse.ok) {
          const payload = (await reportResponse.json().catch(() => ({}))) as ApiErrorPayload;
          throw new Error(payload.error || 'Failed to load report');
        }

        const reportPayload = (await reportResponse.json()) as DashboardReportData;
        if (!active) return;
        setReport(reportPayload);

        const filesResponse = await fetch(`/api/scan/${activeWorkspaceReportId}/files`);
        if (!filesResponse.ok) {
          const payload = (await filesResponse.json().catch(() => ({}))) as ApiErrorPayload;
          const message = payload.error || 'Failed to load files';

          if (filesResponse.status === 403 && message === 'Payment required') {
            setFiles(null);
            setSelectedFilename(null);
            return;
          }

          throw new Error(message);
        }

        const filesPayload = (await filesResponse.json()) as FilesData;
        if (!active) return;

        setFiles(filesPayload);
        setSelectedFilename(filesPayload.files[0]?.filename ?? null);
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load workspace');
        }
      } finally {
        if (active) {
          setWorkspaceLoading(false);
        }
      }
    }

    void fetchWorkspaceData();
    return () => {
      active = false;
    };
  }, [activeWorkspaceReportId]);

  const hasPaidAccess =
    debugPaidPreview || paidOverride || Boolean(report?.hasPaid) || recentScans.some((scan) => scan.hasPaid);

  const normalizedDomain = normalizeDomainInput(domainInput);
  const inputFaviconUrl = useMemo(() => {
    if (!domainInput.trim()) return null;
    try {
      const domain = getDomain(ensureProtocol(domainInput));
      return domain.includes('.') ? getFaviconUrl(domain, 32) : null;
    } catch {
      return null;
    }
  }, [domainInput]);

  const handleAddDomain = async () => {
    setAddError(null);
    if (!normalizedDomain) {
      setAddError('Please enter a domain');
      return;
    }
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalizedDomain)) {
      setAddError('Please enter a valid domain (e.g. example.com)');
      return;
    }
    if (orderedMonitoredSites.some((site) => site.domain === normalizedDomain) || manualDomains.includes(normalizedDomain)) {
      setAddError('This domain is already being monitored');
      return;
    }
    if (orderedMonitoredSites.length >= MAX_DOMAINS) {
      setAddError(`Maximum ${MAX_DOMAINS} domains allowed`);
      return;
    }
    if (!confirmChecked) {
      setAddError('Please confirm domain ownership');
      return;
    }

    if (!hasPaidAccess) {
      setPendingDomain(normalizedDomain);
      setUnlockModalOpen(true);
      return;
    }

    const nextManual = [...manualDomains, normalizedDomain];
    setManualDomains(nextManual);
    saveStoredDomains(nextManual);

    const nextHidden = hiddenDomains.filter((domain) => domain !== normalizedDomain);
    setHiddenDomains(nextHidden);
    saveHiddenDomains(nextHidden);

    const matchingPaidScan = getLatestPaidScanByDomain(recentScans, normalizedDomain);
    if (matchingPaidScan) {
      try {
        await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanId: matchingPaidScan.id, alertThreshold: 5 }),
        });
        setMonitoringConnected((current) => ({ ...current, [normalizedDomain]: true }));
      } catch {
        // Local monitoring state still gives the user a working dashboard.
      }
    }

    setExpandedDomain(normalizedDomain);
    setDomainInput('');
  };

  const handleRemoveDomain = (domain: string) => {
    const nextManual = manualDomains.filter((entry) => entry !== domain);
    const nextHidden = hiddenDomains.includes(domain) ? hiddenDomains : [...hiddenDomains, domain];
    setManualDomains(nextManual);
    saveStoredDomains(nextManual);
    setHiddenDomains(nextHidden);
    saveHiddenDomains(nextHidden);

    if (expandedDomain === domain) {
      setExpandedDomain(null);
    }
  };

  const handleOpenSite = (site: SiteSummary) => {
    setExpandedDomain((current) => (current === site.domain ? null : site.domain));
  };

  const handleDebugPreview = () => {
    router.push('/advanced?debugPaid=1');
  };

  const handleExitDebugPreview = () => {
    if (initialReportId) {
      router.push(`/advanced?report=${initialReportId}`);
      return;
    }
    router.push('/advanced');
  };

  const handleUnlockComplete = () => {
    if (!pendingDomain) return;
    setPaidOverride(true);
    saveStoredBoolean(ADVANCED_PAID_PREVIEW_KEY, true);

    if (!manualDomains.includes(pendingDomain)) {
      const nextManual = [pendingDomain, ...manualDomains];
      setManualDomains(nextManual);
      saveStoredDomains(nextManual);
    }

    setExpandedDomain(pendingDomain);
    setPendingDomain(null);
    setUnlockModalOpen(false);
    setDomainInput('');
  };

  const handleRunFirstScan = async (site: SiteSummary) => {
    setActionError('');
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to start first scan');
      }
      router.push(`/analysis?scan=${payload.id}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to start first scan');
    }
  };

  const handleReaudit = async () => {
    if (!files?.url) return;

    setActionError('');
    setReauditLoading(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: files.url, force: true }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to start a fresh scan');
      }

      router.push(`/analysis?scan=${payload.id}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to start a fresh scan');
    } finally {
      setReauditLoading(false);
    }
  };

  const handleEnableMonitoring = async () => {
    if (!expandedSite?.latestPaidScan?.id) return;

    setMonitoringLoading(true);
    setActionError('');

    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: expandedSite.latestPaidScan.id, alertThreshold: 5 }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to enable monitoring');
      }

      setMonitoringConnected((current) => ({ ...current, [expandedSite.domain]: true }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to enable monitoring');
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleCopyFile = async (file: GeneratedFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedFile(file.filename);
      window.setTimeout(() => {
        setCopiedFile((current) => (current === file.filename ? null : current));
      }, 1800);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleCopyFilePrompt = async (file: GeneratedFile, domain: string, platform: string) => {
    const meta = getFileMeta(file.filename);
    const prompt = buildCursorPrompt(file, domain, platform, meta, files!.url);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedSinglePrompt(file.filename);
      window.setTimeout(() => setCopiedSinglePrompt((current) => (current === file.filename ? null : current)), 2200);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleCopyAllPrompts = async () => {
    if (!files) return;
    const domain = getDomain(files.url);
    const platform = formatPlatformLabel(files.detectedPlatform);
    const combined = files.files
      .map((file, index) => {
        const meta = getFileMeta(file.filename);
        return `--- FILE ${index + 1} ---\n\n${buildCursorPrompt(file, domain, platform, meta, files.url)}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(combined);
      setCopiedAllPrompts(true);
      window.setTimeout(() => setCopiedAllPrompts(false), 2200);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleCopyReportBrief = async () => {
    const prompt = report?.copyToLlm?.fullPrompt ?? files?.copyToLlm?.fullPrompt;
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedReportBrief(true);
      window.setTimeout(() => setCopiedReportBrief(false), 2200);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  if (recentLoading) {
    return <CenteredLoading label="Preparing your advanced workspace..." />;
  }

  if (roadmapTab) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)] text-white">
        <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="inline-block rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#a855f7]">
              Internal Roadmap
            </span>
            <a
              href="/advanced"
              className="text-[12px] font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Exit roadmap →
            </a>
          </div>
          <RoadmapView />
        </main>
        <FloatingFeedback />
      </div>
    );
  }

  const unpaidView = (
    <div className="relative">
      <UnpaidAdvancedLanding
        addError={addError}
        confirmChecked={confirmChecked}
        domainInput={domainInput}
        inputFaviconUrl={inputFaviconUrl}
        onAddDomain={handleAddDomain}
        onConfirmChange={setConfirmChecked}
        onDomainInputChange={(value) => {
          setDomainInput(value);
          setAddError(null);
        }}
        onOpenUnlock={() => setUnlockModalOpen(true)}
        pendingDomain={pendingDomain}
      />
      <div className="pointer-events-none fixed left-1/2 top-[92px] z-30 w-full max-w-[1120px] -translate-x-1/2 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto flex items-center gap-2 justify-end">
          <a
            href="/advanced?tab=roadmap"
            className="inline-flex items-center gap-2 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/10 px-4 py-2 text-[12px] font-semibold text-[#d8b4fe] transition-colors hover:bg-[#a855f7]/16"
          >
            Roadmap
          </a>
          <button
            type="button"
            onClick={handleDebugPreview}
            className="inline-flex items-center gap-2 rounded-full border border-[#5f93ff]/40 bg-[#5f93ff]/10 px-4 py-2 text-[12px] font-semibold text-[#cfe0ff] transition-colors hover:bg-[#5f93ff]/16"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Preview paid view
          </button>
        </div>
      </div>
      <UnlockFeaturesModal
        open={unlockModalOpen}
        onOpenChange={setUnlockModalOpen}
        onUnlock={handleUnlockComplete}
      />
    </div>
  );

  if (!hasPaidAccess) return unpaidView;

  return (
    <PaidSitesDashboard
      actionError={actionError}
      addError={addError}
      confirmChecked={confirmChecked}
      copiedAllPrompts={copiedAllPrompts}
      copiedFile={copiedFile}
      copiedReportBrief={copiedReportBrief}
      copiedSinglePrompt={copiedSinglePrompt}
      domainInput={domainInput}
      expandedDomain={expandedDomain}
      expandedSite={expandedSite}
      files={files}
      inputFaviconUrl={inputFaviconUrl}
      loadError={loadError}
      loadingWorkspace={workspaceLoading}
      monitoredSites={orderedMonitoredSites}
      monitoringConnected={expandedSite ? Boolean(monitoringConnected[expandedSite.domain]) : false}
      monitoringLoading={monitoringLoading}
      onAddDomain={handleAddDomain}
      onConfirmChange={setConfirmChecked}
      onCopyAllPrompts={handleCopyAllPrompts}
      onCopyFile={handleCopyFile}
      onCopyFilePrompt={handleCopyFilePrompt}
      onCopyReportBrief={handleCopyReportBrief}
      onDomainInputChange={(value) => {
        setDomainInput(value);
        setAddError(null);
      }}
      onEnableMonitoring={handleEnableMonitoring}
      onExitDebugPreview={debugPaidPreview ? handleExitDebugPreview : undefined}
      onOpenSite={handleOpenSite}
      onReaudit={handleReaudit}
      onRemoveDomain={handleRemoveDomain}
      onRunFirstScan={handleRunFirstScan}
      platformLabel={files ? formatPlatformLabel(files.detectedPlatform) : null}
      previewMode={debugPaidPreview || paidOverride}
      reauditing={reauditLoading}
      recentScans={recentScans}
      report={report}
      checkoutBanner={checkoutBanner}
      inputRef={inputRef}
    />
  );
}

function PaidSitesDashboard({
  actionError,
  addError,
  confirmChecked,
  copiedAllPrompts,
  copiedFile,
  copiedReportBrief,
  copiedSinglePrompt,
  domainInput,
  expandedDomain,
  expandedSite,
  files,
  inputFaviconUrl,
  loadError,
  loadingWorkspace,
  monitoredSites,
  monitoringConnected,
  monitoringLoading,
  onAddDomain,
  onConfirmChange,
  onCopyAllPrompts,
  onCopyFile,
  onCopyFilePrompt,
  onCopyReportBrief,
  onDomainInputChange,
  onEnableMonitoring,
  onExitDebugPreview,
  onOpenSite,
  onReaudit,
  onRemoveDomain,
  onRunFirstScan,
  platformLabel,
  previewMode = false,
  reauditing,
  recentScans,
  report,
  checkoutBanner,
  inputRef,
}: {
  actionError: string;
  addError: string | null;
  confirmChecked: boolean;
  copiedAllPrompts: boolean;
  copiedFile: string | null;
  copiedReportBrief: boolean;
  copiedSinglePrompt: string | null;
  domainInput: string;
  expandedDomain: string | null;
  expandedSite: SiteSummary | null;
  files: FilesData | null;
  inputFaviconUrl: string | null;
  loadError: string;
  loadingWorkspace: boolean;
  monitoredSites: SiteSummary[];
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onAddDomain: () => void;
  onConfirmChange: (value: boolean) => void;
  onCopyAllPrompts: () => void;
  onCopyFile: (file: GeneratedFile) => void;
  onCopyFilePrompt: (file: GeneratedFile, domain: string, platform: string) => void;
  onCopyReportBrief: () => void;
  onDomainInputChange: (value: string) => void;
  onEnableMonitoring: () => void;
  onExitDebugPreview?: () => void;
  onOpenSite: (site: SiteSummary) => void;
  onReaudit: () => void;
  onRemoveDomain: (domain: string) => void;
  onRunFirstScan: (site: SiteSummary) => void;
  platformLabel: string | null;
  previewMode?: boolean;
  reauditing: boolean;
  recentScans: RecentScanData[];
  report: DashboardReportData | null;
  checkoutBanner: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const readyCount = monitoredSites.filter((site) => Boolean(site.latestPaidScan)).length;

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {previewMode ? (
          <div className="mb-4 flex justify-end">
            <div className="flex items-center gap-3 rounded-lg border border-[#5f93ff]/30 bg-[#5f93ff]/10 px-4 py-2 text-[12px] text-[#d5e4ff]">
              <Sparkles className="h-4 w-4" />
              <span>Debug preview active</span>
              {onExitDebugPreview ? (
                <button
                  type="button"
                  onClick={onExitDebugPreview}
                  className="rounded-md border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.06]"
                >
                  Exit
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {checkoutBanner ? (
          <div className="mb-4 rounded-2xl border border-[#25c972]/30 bg-[#25c972]/10 px-4 py-3 text-sm text-[#25c972]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {checkoutBanner}
            </div>
          </div>
        ) : null}

        {expandedDomain && expandedSite ? (
          <DomainDashboardView
            actionError={actionError}
            copiedAllPrompts={copiedAllPrompts}
            copiedFile={copiedFile}
            copiedReportBrief={copiedReportBrief}
            copiedSinglePrompt={copiedSinglePrompt}
            expandedSite={expandedSite}
            files={files}
            loadError={loadError}
            loadingWorkspace={loadingWorkspace}
            monitoringConnected={monitoringConnected}
            monitoringLoading={monitoringLoading}
            onBack={() => onOpenSite(expandedSite)}
            onCopyAllPrompts={onCopyAllPrompts}
            onCopyFile={onCopyFile}
            onCopyFilePrompt={onCopyFilePrompt}
            onCopyReportBrief={onCopyReportBrief}
            onEnableMonitoring={onEnableMonitoring}
            onReaudit={onReaudit}
            onRunFirstScan={onRunFirstScan}
            platformLabel={platformLabel}
            reauditing={reauditing}
            recentScans={recentScans}
            report={report}
          />
        ) : (
          <DomainListView
            actionError={actionError}
            addError={addError}
            confirmChecked={confirmChecked}
            domainInput={domainInput}
            inputFaviconUrl={inputFaviconUrl}
            inputRef={inputRef}
            monitoredSites={monitoredSites}
            readyCount={readyCount}
            onAddDomain={onAddDomain}
            onConfirmChange={onConfirmChange}
            onDomainInputChange={onDomainInputChange}
            onOpenSite={onOpenSite}
            onRemoveDomain={onRemoveDomain}
          />
        )}

        {actionError && !expandedDomain ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">
            {actionError}
          </div>
        ) : null}
      </main>
      <FloatingFeedback />
    </div>
  );
}

function NoReportWorkspaceCard({
  site,
  onRunFirstScan,
}: {
  site: SiteSummary;
  onRunFirstScan: () => void;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,13,14,0.98)_0%,rgba(8,8,9,0.99)_100%)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#25c972]">
        Domain unlocked
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">Run the first scan for {site.domain}</h3>
      <p className="mt-3 max-w-[42rem] text-[13px] leading-6 text-zinc-400">
        This domain is now in your paid advanced workspace. The next step is to generate its first report, and then the full dashboard will appear directly under this card.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MiniInfoTile title="1. Scan" body="Generate the first report for this domain." />
        <MiniInfoTile title="2. Expand" body="Re-open this card to see scores, fixes, and deploy tools." />
        <MiniInfoTile title="3. Ship" body="Use the roadmap, deploy assets, and verification steps inline." />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRunFirstScan}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Run first scan
        </button>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
        >
          Visit site
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function DomainListView({
  actionError,
  addError,
  confirmChecked,
  domainInput,
  inputFaviconUrl,
  inputRef,
  monitoredSites,
  readyCount,
  onAddDomain,
  onConfirmChange,
  onDomainInputChange,
  onOpenSite,
  onRemoveDomain,
}: {
  actionError: string;
  addError: string | null;
  confirmChecked: boolean;
  domainInput: string;
  inputFaviconUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  monitoredSites: SiteSummary[];
  readyCount: number;
  onAddDomain: () => void;
  onConfirmChange: (value: boolean) => void;
  onDomainInputChange: (value: string) => void;
  onOpenSite: (site: SiteSummary) => void;
  onRemoveDomain: (domain: string) => void;
}) {
  return (
    <section className="mt-6">
      <h1 className="text-[2rem] font-bold tracking-tight text-white">Advanced</h1>
      <p className="mt-2 max-w-[44rem] text-[15px] text-[var(--text-muted)]">
        Monitor your domains and track AI visibility.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-black/20 px-3.5">
              {inputFaviconUrl ? (
                <img src={inputFaviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
              ) : (
                <Globe2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={domainInput}
                onChange={(event) => onDomainInputChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onAddDomain()}
                placeholder="Add another domain"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onAddDomain}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add domain
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-5 text-zinc-400">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(event) => onConfirmChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-300"
              />
              <span>
                I confirm that I own this domain or have authorization to monitor it.
              </span>
            </label>
            <p className="text-[12px] text-zinc-500">
              {monitoredSites.length} monitored • {readyCount} ready
            </p>
          </div>

          {addError ? <p className="mt-3 text-[12px] text-red-400">{addError}</p> : null}
        </div>

        <div className="flex justify-end">
          <Link
            href="/analysis"
            className="inline-flex h-[38px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.06]"
          >
            New scan
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {monitoredSites.length > 0 ? (
          monitoredSites.map((site) => {
            const latestOverall =
              site.latestPaidScan?.scores?.overall ??
              site.latestScan?.scores?.overall ??
              site.latestScan?.score ??
              null;
            const statusText = site.latestPaidScan
              ? 'Ready'
              : site.latestScan
                ? 'Needs scan'
                : 'Needs scan';
            const lastRunLabel = site.lastTouchedAt
              ? formatRelativeTime(site.lastTouchedAt)
              : null;

            return (
              <div
                key={site.domain}
                role="button"
                tabIndex={0}
                onClick={() => onOpenSite(site)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenSite(site);
                  }
                }}
                className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                  <img src={getFaviconUrl(site.domain, 48)} alt="" className="h-5 w-5 rounded-sm" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{site.domain}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                    {statusText}
                    {lastRunLabel ? ` • ${lastRunLabel}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <p className={cn('text-xl font-bold leading-none', scoreColor(latestOverall))}>
                    {latestOverall == null ? '--' : Math.round(latestOverall)}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveDomain(site.domain);
                    }}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/6 hover:text-red-400"
                    aria-label={`Remove ${site.domain}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <Plus className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">No monitored sites yet</h3>
            <p className="mt-2 max-w-[28rem] text-[13px] leading-6 text-zinc-500">
              Add your first site above, then open it here to run the first scan or work inside the advanced dashboard.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function DomainDashboardView({
  actionError,
  copiedAllPrompts,
  copiedFile,
  copiedReportBrief,
  copiedSinglePrompt,
  expandedSite,
  files,
  loadError,
  loadingWorkspace,
  monitoringConnected,
  monitoringLoading,
  onBack,
  onCopyAllPrompts,
  onCopyFile,
  onCopyFilePrompt,
  onCopyReportBrief,
  onEnableMonitoring,
  onReaudit,
  onRunFirstScan,
  platformLabel,
  reauditing,
  recentScans,
  report,
}: {
  actionError: string;
  copiedAllPrompts: boolean;
  copiedFile: string | null;
  copiedReportBrief: boolean;
  copiedSinglePrompt: string | null;
  expandedSite: SiteSummary;
  files: FilesData | null;
  loadError: string;
  loadingWorkspace: boolean;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onBack: () => void;
  onCopyAllPrompts: () => void;
  onCopyFile: (file: GeneratedFile) => void;
  onCopyFilePrompt: (file: GeneratedFile, domain: string, platform: string) => void;
  onCopyReportBrief: () => void;
  onEnableMonitoring: () => void;
  onReaudit: () => void;
  onRunFirstScan: (site: SiteSummary) => void;
  platformLabel: string | null;
  reauditing: boolean;
  recentScans: RecentScanData[];
  report: DashboardReportData | null;
}) {
  const domain = expandedSite.domain;
  const siteUrl = expandedSite.url;
  const fixes = report?.score.fixes ?? report?.fixes ?? [];
  const groupedFixes = getGroupedFixes(fixes);
  const effectivePlatformLabel = platformLabel ?? (files ? formatPlatformLabel(files.detectedPlatform) : null);

  // Loading state
  if (loadingWorkspace) {
    return (
      <div className="mt-6">
        <DashboardHeader domain={domain} siteUrl={siteUrl} onBack={onBack} onReaudit={onReaudit} reauditing={reauditing} />
        <div className="mt-6">
          <CenteredWorkspaceState label="Loading this domain workspace..." />
        </div>
      </div>
    );
  }

  // Error state
  if (loadError && !report) {
    return (
      <div className="mt-6">
        <DashboardHeader domain={domain} siteUrl={siteUrl} onBack={onBack} onReaudit={onReaudit} reauditing={reauditing} />
        <div className="mt-6">
          <CenteredWorkspaceState label={loadError} tone="error" />
        </div>
      </div>
    );
  }

  // No scan data
  if (!expandedSite.latestScan) {
    return (
      <div className="mt-6">
        <DashboardHeader domain={domain} siteUrl={siteUrl} onBack={onBack} onReaudit={onReaudit} reauditing={reauditing} />
        <div className="mt-6">
          <NoReportWorkspaceCard site={expandedSite} onRunFirstScan={() => onRunFirstScan(expandedSite)} />
        </div>
      </div>
    );
  }

  // No report loaded yet
  if (!report) {
    return (
      <div className="mt-6">
        <DashboardHeader domain={domain} siteUrl={siteUrl} onBack={onBack} onReaudit={onReaudit} reauditing={reauditing} />
        <div className="mt-6">
          <CenteredWorkspaceState label="Open this domain again after the report is ready." />
        </div>
      </div>
    );
  }

  // Full dashboard with report
  return (
    <div className="mt-6 space-y-6">
      <DashboardHeader domain={domain} siteUrl={siteUrl} onBack={onBack} onReaudit={onReaudit} reauditing={reauditing} />

      {actionError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">
          {actionError}
        </div>
      ) : null}

      {/* AI Visibility Dashboard — charts + score cards */}
      <AiVisibilityDashboard report={report} />

      {/* Citation Tracking */}
      <CitationTrackingPanel report={report} />

      {/* Monitoring & Trends */}
      <MonitoringTrendsPanel
        recentScans={recentScans}
        domain={domain}
        monitoringConnected={monitoringConnected}
        monitoringLoading={monitoringLoading}
        onEnableMonitoring={onEnableMonitoring}
      />

      {/* Prompt Library */}
      <PromptLibraryPanel domain={domain} />

      {/* Competitor Share */}
      <CompetitorSharePanel domain={domain} />

      {/* Position Trends */}
      <PositionTrendingPanel domain={domain} />

      {/* AI Crawler Traffic */}
      <AICrawlerPanel domain={domain} />

      {/* Collapsible: All Fixes */}
      {groupedFixes.length > 0 && (
        <CollapsibleSection title="All Fixes" defaultOpen={false}>
          <div className="space-y-4">
            {groupedFixes.map((group) => (
              <DashboardPanel key={group.key} className="p-5">
                <SectionTitle eyebrow="What to fix" title={group.title} description={group.description} />
                <div className="mt-5 space-y-3">
                  {group.fixes.map((fix, index) => {
                    const relatedFile = files ? matchFixToFile(fix, files.files) : null;
                    return (
                      <FixCard
                        key={fix.checkId}
                        copied={copiedSinglePrompt === (relatedFile?.filename ?? fix.checkId)}
                        file={relatedFile}
                        fix={fix}
                        index={index + 1}
                        onCopyPrompt={async () => {
                          if (relatedFile && effectivePlatformLabel) {
                            await onCopyFilePrompt(relatedFile, domain, effectivePlatformLabel);
                            return;
                          }
                          try { await navigator.clipboard.writeText(fix.copyPrompt); } catch {}
                        }}
                      />
                    );
                  })}
                </div>
              </DashboardPanel>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Collapsible: Content Gaps */}
      <ContentGapsSection domain={domain} />

      {/* Prompt Volume Intelligence — teaser */}
      <PromptVolumeTeaser />

      {/* Collapsible: Generated Files */}
      {files && files.files.length > 0 && (
        <CollapsibleSection title="Generated Files" defaultOpen={false}>
          <DashboardPanel className="p-5">
            <SectionTitle eyebrow="Files to deploy" title="Generated assets" description={`${files.files.length} deploy-ready files with verification links`} />
            <div className="mt-5 space-y-3">
              {files.files.map((file) => {
                const meta = getFileMeta(file.filename);
                const Icon = meta.icon;
                const verifyTarget = verificationPath(files.url, file.filename);
                return (
                  <div key={file.filename} className="rounded-[1.1rem] border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">{file.filename}</p>
                          <p className="mt-0.5 text-[12px] text-zinc-500">{meta.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onCopyFile(file)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                          <Copy className="h-3.5 w-3.5" />
                          {copiedFile === file.filename ? 'Copied' : 'Copy'}
                        </button>
                        <button type="button" onClick={() => downloadTextFile(file.filename, file.content)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                        <a href={verifyTarget} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                          Verify
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardPanel>
        </CollapsibleSection>
      )}
    </div>
  );
}

function DashboardHeader({
  domain,
  siteUrl,
  onBack,
  onReaudit,
  reauditing,
}: {
  domain: string;
  siteUrl: string;
  onBack: () => void;
  onReaudit: () => void;
  reauditing: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.96)_0%,rgba(6,6,7,0.98)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.024)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to domains
        </button>
        <span className="text-zinc-700">|</span>
        <div className="flex items-center gap-2">
          <img src={getFaviconUrl(domain, 32)} alt="" className="h-5 w-5 rounded-sm" />
          <span className="text-sm font-semibold text-white">{domain}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReaudit}
          disabled={reauditing}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', reauditing && 'animate-spin')} />
          {reauditing ? 'Scanning...' : 'Run scan'}
        </button>
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          Visit site
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
}

function MonitoringTrendsPanel({
  recentScans,
  domain,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
}: {
  recentScans: RecentScanData[];
  domain: string;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
}) {
  const domainScans = recentScans
    .filter((scan) => getDomain(scan.url) === domain && scan.scores?.overall != null)
    .sort((a, b) => (a.completedAt ?? a.createdAt) - (b.completedAt ?? b.createdAt));

  const chartData = domainScans.map((scan) => ({
    date: formatShortDate(scan.completedAt ?? scan.createdAt),
    score: scan.scores?.overall ?? scan.score ?? 0,
  }));

  const lastScan = domainScans[domainScans.length - 1] ?? null;
  const prevScan = domainScans.length >= 2 ? domainScans[domainScans.length - 2] : null;
  const scoreDelta =
    lastScan && prevScan && lastScan.scores?.overall != null && prevScan.scores?.overall != null
      ? Math.round((lastScan.scores.overall ?? 0) - (prevScan.scores.overall ?? 0))
      : null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Monitoring" title="Score Trends" description="Track how your AI visibility score changes over time." />

      <div className="mt-5">
        {chartData.length >= 2 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="score" stroke="#25c972" strokeWidth={2} dot={{ fill: '#25c972', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartData.length === 1 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-6 py-8 text-center">
            <p className={cn('text-3xl font-bold', scoreColor(chartData[0].score))}>
              {Math.round(chartData[0].score)}
            </p>
            <p className="text-[13px] text-zinc-400">
              Single data point on {chartData[0].date}
            </p>
            <p className="text-[12px] text-zinc-500">
              Run more scans to track trends over time.
            </p>
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-white/8 bg-white/[0.02] px-6 py-8 text-center text-[13px] text-zinc-500">
            No score history yet. Run a scan to start tracking.
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-zinc-400">
        <span>
          Last scanned: {lastScan ? formatRelativeTime(lastScan.completedAt ?? lastScan.createdAt) : '--'}
        </span>
        {scoreDelta !== null && (
          <span className={scoreDelta >= 0 ? 'text-[#25c972]' : 'text-[#ff5252]'}>
            {scoreDelta >= 0 ? '+' : ''}{scoreDelta} since previous
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className={cn('inline-block h-2 w-2 rounded-full', monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600')} />
          Monitoring: {monitoringConnected ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Monitoring toggle */}
      {!monitoringConnected && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onEnableMonitoring}
            disabled={monitoringLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" />
            {monitoringLoading ? 'Enabling...' : 'Enable monitoring'}
          </button>
        </div>
      )}
    </DashboardPanel>
  );
}


function CenteredWorkspaceState({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className={cn(
      'flex min-h-[180px] items-center justify-center rounded-[1.2rem] border px-6 py-10 text-center text-sm',
      tone === 'error'
        ? 'border-red-500/20 bg-red-500/8 text-red-300'
        : 'border-white/8 bg-white/[0.02] text-zinc-400'
    )}>
      {label}
    </div>
  );
}

const CHART_COLORS = { pass: '#25c972', fail: '#ff5252', unknown: '#ff8a1e' } as const;

function barFillColor(pct: number) {
  if (pct >= 80) return CHART_COLORS.pass;
  if (pct >= 60) return CHART_COLORS.unknown;
  return CHART_COLORS.fail;
}

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-white">{Math.round(payload[0].value)}%</p>
    </div>
  );
}

interface PromptMonitoringData {
  prompts: Array<{
    id: string;
    domain: string;
    promptText: string;
    category: string;
    active: boolean;
    createdAt: string;
  }>;
  results: Array<{
    promptId: string;
    engine: string;
    mentioned: boolean;
    position: number | null;
    testedAt: string;
  }>;
}

type PromptCategory = 'all' | 'brand' | 'competitor' | 'industry' | 'custom';

const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'brand', label: 'Brand' },
  { id: 'competitor', label: 'Competitor' },
  { id: 'industry', label: 'Industry' },
  { id: 'custom', label: 'Custom' },
];

function PromptLibraryPanel({ domain }: { domain: string }) {
  const [data, setData] = useState<PromptMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState<PromptCategory>('custom');
  const [addingPrompt, setAddingPrompt] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PromptCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const handleAddPrompt = async () => {
    if (!newPrompt.trim() || newPrompt.trim().length < 5) {
      setAddError('Prompt must be at least 5 characters.');
      return;
    }
    setAddingPrompt(true);
    setAddError(null);
    try {
      const cat = newCategory === 'all' ? 'custom' : newCategory;
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, promptText: newPrompt.trim(), category: cat }),
      });
      if (res.ok) {
        setNewPrompt('');
        await fetchData();
      } else {
        const err = await res.json();
        setAddError(err.error || 'Failed to add prompt.');
      }
    } catch {
      setAddError('Network error.');
    } finally {
      setAddingPrompt(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      await fetchData();
    } catch { /* silently fail */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch { /* silently fail */ }
  };

  const handleStartEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim() || editText.trim().length < 5) return;
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: editText.trim() }),
      });
      setEditingId(null);
      await fetchData();
    } catch { /* silently fail */ }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    try {
      await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      await fetchData();
    } catch { /* silently fail */ }
  };

  if (loading) return null;

  const prompts = data?.prompts ?? [];
  const results = data?.results ?? [];

  // Filter by category tab
  const filteredPrompts = activeTab === 'all'
    ? prompts
    : prompts.filter((p) => p.category === activeTab);

  // Compute mention rate per prompt
  const promptStats = filteredPrompts.map((p) => {
    const pr = results.filter((r) => r.promptId === p.id);
    const mentionCount = pr.filter((r) => r.mentioned).length;
    return {
      ...p,
      totalResults: pr.length,
      mentionCount,
      mentionRate: pr.length > 0 ? Math.round((mentionCount / pr.length) * 100) : null,
    };
  });

  // Category counts
  const categoryCounts: Record<string, number> = { all: prompts.length };
  for (const p of prompts) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }

  return (
    <DashboardPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          eyebrow="Prompt Library"
          title="Prompt Monitoring"
          description="Manage prompts to track how AI engines mention your brand over time."
        />
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-2 text-[11px] font-semibold text-[#d8b4fe] transition-colors hover:bg-[#a855f7]/16"
        >
          <Sparkles className="h-3 w-3" />
          Suggest prompts
        </button>
      </div>

      {/* Category tabs */}
      <div className="mt-5 flex gap-1 border-b border-white/8 pb-px">
        {PROMPT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              'px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px',
              activeTab === cat.id
                ? 'border-[#a855f7] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {cat.label}
            {(categoryCounts[cat.id] ?? 0) > 0 && (
              <span className="ml-1.5 text-[9px] text-zinc-600">
                {categoryCounts[cat.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add prompt form */}
      <div className="mt-4 flex gap-2">
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as PromptCategory)}
          className="shrink-0 rounded-lg border border-white/10 bg-[#1b1b1c] px-2 py-2.5 text-[11px] text-zinc-300 focus:outline-none"
        >
          <option value="brand">Brand</option>
          <option value="competitor">Competitor</option>
          <option value="industry">Industry</option>
          <option value="custom">Custom</option>
        </select>
        <input
          type="text"
          value={newPrompt}
          onChange={(e) => { setNewPrompt(e.target.value); setAddError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
          placeholder="e.g. What are the best AI visibility tools?"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1b1b1c] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#a855f7]/40"
        />
        <button
          type="button"
          onClick={handleAddPrompt}
          disabled={addingPrompt}
          className="shrink-0 rounded-lg bg-[#d6d6d6] px-4 py-2.5 text-[13px] font-medium text-black transition-colors hover:bg-white disabled:opacity-50"
        >
          <Plus className="inline h-3.5 w-3.5 mr-1" />
          Add
        </button>
      </div>
      {addError && <p className="mt-1.5 text-[11px] text-red-400">{addError}</p>}

      {/* Prompts list */}
      {promptStats.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {promptStats.map((p) => (
            <div key={p.id} className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(p.id, p.active)}
                  className={cn(
                    'h-4 w-7 shrink-0 rounded-full transition-colors',
                    p.active ? 'bg-[#25c972]' : 'bg-zinc-600'
                  )}
                >
                  <span className={cn(
                    'block h-3 w-3 rounded-full bg-white transition-transform',
                    p.active ? 'translate-x-3.5' : 'translate-x-0.5'
                  )} />
                </button>

                {/* Prompt text — inline edit or display */}
                <div className="min-w-0 flex-1">
                  {editingId === p.id ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(p.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="min-w-0 flex-1 rounded border border-white/15 bg-[#1b1b1c] px-2 py-1 text-[12px] text-zinc-100 focus:outline-none"
                      />
                      <button type="button" onClick={() => handleSaveEdit(p.id)} className="text-[10px] text-[#25c972] hover:underline">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-[10px] text-zinc-500 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <p
                      className={cn('text-[12px] truncate cursor-pointer hover:text-white transition-colors', p.active ? 'text-zinc-200' : 'text-zinc-500')}
                      onClick={() => handleStartEdit(p.id, p.promptText)}
                      title="Click to edit"
                    >
                      {p.promptText}
                    </p>
                  )}
                  <div className="mt-0.5 flex items-center gap-2">
                    <select
                      value={p.category}
                      onChange={(e) => handleCategoryChange(p.id, e.target.value)}
                      className="rounded border-none bg-transparent px-0 py-0 text-[9px] uppercase tracking-wider text-zinc-600 focus:outline-none cursor-pointer hover:text-zinc-400"
                    >
                      <option value="brand">Brand</option>
                      <option value="competitor">Competitor</option>
                      <option value="industry">Industry</option>
                      <option value="custom">Custom</option>
                    </select>
                    {p.totalResults > 0 && (
                      <span className="text-[10px] text-zinc-600">
                        {p.mentionRate}% of {p.totalResults} checks
                      </span>
                    )}
                  </div>
                </div>

                {/* Mention rate */}
                {p.mentionRate !== null && (
                  <span className={cn(
                    'shrink-0 text-[11px] font-semibold tabular-nums',
                    p.mentionRate >= 60 ? 'text-[#25c972]' : p.mentionRate >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                  )}>
                    {p.mentionRate}%
                  </span>
                )}

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="shrink-0 text-zinc-600 transition-colors hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent results summary */}
      {results.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Mention rate by engine
          </p>
          <div className="flex flex-wrap gap-2">
            {(['chatgpt', 'perplexity', 'gemini', 'claude'] as const).map((engine) => {
              const engineResults = results.filter((r) => r.engine === engine);
              if (engineResults.length === 0) return null;
              const mentioned = engineResults.filter((r) => r.mentioned).length;
              const rate = Math.round((mentioned / engineResults.length) * 100);
              return (
                <div key={engine} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-center">
                  <p className="text-[10px] capitalize text-zinc-500">{engine}</p>
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    rate >= 60 ? 'text-[#25c972]' : rate >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                  )}>
                    {rate}%
                  </p>
                  <p className="text-[9px] text-zinc-600">{engineResults.length} checks</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prompts.length === 0 && (
        <p className="mt-5 text-center text-[12px] text-zinc-500">
          No prompts yet. Add prompts above to start tracking how AI engines mention your brand.
        </p>
      )}
    </DashboardPanel>
  );
}

const ENGINE_COLORS: Record<string, string> = {
  chatgpt: '#10b981',
  perplexity: '#3b82f6',
  gemini: '#f59e0b',
  claude: '#a855f7',
};

interface TrendPoint {
  week: string;
  engine: string;
  avgPosition: number | null;
  mentionRate: number;
  totalChecks: number;
}

function PositionTrendingPanel({ domain }: { domain: string }) {
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/prompts/trends?domain=${encodeURIComponent(domain)}`);
        if (res.ok) {
          const data = await res.json();
          setTrends(data.trends ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [domain]);

  if (loading || trends.length === 0) return null;

  // Get unique engines and weeks
  const engines = [...new Set(trends.map((t) => t.engine))];
  const weeks = [...new Set(trends.map((t) => t.week))].sort();

  // Build chart data: one row per week, with avgPosition per engine
  const chartData = weeks.map((week) => {
    const row: Record<string, unknown> = { week: week.slice(5) }; // "MM-DD" format
    for (const engine of engines) {
      const point = trends.find((t) => t.week === week && t.engine === engine);
      row[engine] = point?.avgPosition ?? null;
    }
    return row;
  });

  // Only render if at least some position data exists
  const hasPositionData = trends.some((t) => t.avgPosition !== null);
  if (!hasPositionData) return null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="Position Tracking"
        title="AI Position Trends"
        description="Average position in AI-ranked lists per engine over time. Lower is better."
      />

      <div className="mt-5 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              reversed
              domain={[1, 'auto']}
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
              label={{ value: 'Position', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#52525b' } }}
            />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            {engines.map((engine) => (
              <Line
                key={engine}
                type="monotone"
                dataKey={engine}
                stroke={ENGINE_COLORS[engine] ?? '#71717a'}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                name={engine.charAt(0).toUpperCase() + engine.slice(1)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Engine legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {engines.map((engine) => (
          <div key={engine} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: ENGINE_COLORS[engine] ?? '#71717a' }} />
            <span className="text-[10px] capitalize text-zinc-500">{engine}</span>
          </div>
        ))}
      </div>

      {/* Mention rate summary below chart */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Weekly mention rate
        </p>
        <div className="flex flex-wrap gap-2">
          {engines.map((engine) => {
            const engineTrends = trends.filter((t) => t.engine === engine);
            if (engineTrends.length === 0) return null;
            const latest = engineTrends[engineTrends.length - 1];
            const earliest = engineTrends[0];
            const delta = latest && earliest ? latest.mentionRate - earliest.mentionRate : 0;
            return (
              <div key={engine} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-center">
                <p className="text-[10px] capitalize text-zinc-500">{engine}</p>
                <p className="text-sm font-bold tabular-nums text-zinc-200">
                  {latest?.mentionRate ?? 0}%
                </p>
                {delta !== 0 && (
                  <p className={cn('text-[9px] tabular-nums', delta > 0 ? 'text-[#25c972]' : 'text-[#ff5252]')}>
                    {delta > 0 ? '+' : ''}{delta}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardPanel>
  );
}

interface CompetitorData {
  competitor: string;
  appearances: number;
  avgPosition: number | null;
  engines: string[];
  coMentionedCount: number;
}

function CompetitorSharePanel({ domain }: { domain: string }) {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/competitors?domain=${encodeURIComponent(domain)}`);
        if (res.ok) {
          const data = await res.json();
          setCompetitors(data.competitors ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [domain]);

  if (loading || competitors.length === 0) return null;

  const top = competitors.slice(0, 8);
  const maxAppearances = Math.max(...top.map((c) => c.appearances), 1);

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="Competitors"
        title="Competitor Share in AI Answers"
        description={`${competitors.length} competitor${competitors.length === 1 ? '' : 's'} detected across AI engine responses in the last 30 days.`}
      />

      <div className="mt-5 space-y-2">
        {top.map((c) => {
          const pct = Math.round((c.appearances / maxAppearances) * 100);
          return (
            <div key={c.competitor} className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-zinc-200 truncate max-w-[60%]">
                  {c.competitor}
                </span>
                <div className="flex items-center gap-3">
                  {c.avgPosition !== null && (
                    <span className="text-[10px] text-zinc-500">
                      avg pos {c.avgPosition}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold tabular-nums text-zinc-300">
                    {c.appearances}x
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="h-1.5 w-full rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[#ff8a1e] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Engines */}
              <div className="mt-1.5 flex items-center gap-1.5">
                {c.engines.map((e) => (
                  <span key={e} className="text-[9px] capitalize text-zinc-600">{e}</span>
                ))}
                {c.coMentionedCount > 0 && (
                  <span className="ml-auto text-[9px] text-[#25c972]/70">
                    co-mentioned {c.coMentionedCount}x
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

const BOT_COLORS: Record<string, string> = {
  GPTBot: '#10b981',
  'ChatGPT-User': '#34d399',
  PerplexityBot: '#3b82f6',
  ClaudeBot: '#a855f7',
  'Claude-Web': '#c084fc',
  'anthropic-ai': '#d8b4fe',
  CCBot: '#f59e0b',
  'cohere-ai': '#fb923c',
  'Google-Extended': '#ef4444',
};

const BOT_CATEGORY_LABEL: Record<string, string> = {
  indexing: 'AI Indexing',
  citation: 'AI Citations',
  training: 'AI Training',
  unknown: 'Unknown',
};

interface CrawlerSummary {
  botName: string;
  botCategory: string;
  visitCount: number;
  uniquePaths: number;
  lastSeen: string;
}

function AICrawlerPanel({ domain }: { domain: string }) {
  const [summaries, setSummaries] = useState<CrawlerSummary[]>([]);
  const [timeline, setTimeline] = useState<Array<Record<string, unknown>>>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/crawler-visits?domain=${encodeURIComponent(domain)}&days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setSummaries(data.summaries ?? []);
          setTimeline(data.timeline ?? []);
          setTotalVisits(data.totalVisits ?? 0);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [domain, days]);

  if (loading || (summaries.length === 0 && totalVisits === 0)) return null;

  const allBots = [...new Set(summaries.map((s) => s.botName))];

  // Format timeline weeks for chart
  const chartData = timeline.map((row) => ({
    ...row,
    week: typeof row.week === 'string' ? (row.week as string).slice(5) : row.week,
  }));

  return (
    <DashboardPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          eyebrow="AI Crawlers"
          title="AI Crawler Traffic"
          description={`${totalVisits} AI bot visit${totalVisits === 1 ? '' : 's'} detected in the last ${days} days.`}
        />
        <div className="flex gap-1 mt-1">
          {[30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-medium rounded transition-colors',
                days === d ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Timeline chart */}
      {chartData.length > 1 && (
        <div className="mt-5 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              {allBots.map((bot) => (
                <Line
                  key={bot}
                  type="monotone"
                  dataKey={bot}
                  stroke={BOT_COLORS[bot] ?? '#71717a'}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bot summary list */}
      <div className="mt-5 space-y-1.5">
        {summaries.map((s) => (
          <div key={s.botName} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: BOT_COLORS[s.botName] ?? '#71717a' }} />
              <div>
                <p className="text-[12px] font-medium text-zinc-200">{s.botName}</p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                  {BOT_CATEGORY_LABEL[s.botCategory] ?? s.botCategory}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[11px] font-semibold tabular-nums text-zinc-300">{s.visitCount}</p>
                <p className="text-[9px] text-zinc-600">visits</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tabular-nums text-zinc-300">{s.uniquePaths}</p>
                <p className="text-[9px] text-zinc-600">pages</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {summaries.length === 0 && (
        <p className="mt-5 text-center text-[12px] text-zinc-500">
          No AI crawler visits detected yet. Visits will appear here once AI bots discover your site.
        </p>
      )}
    </DashboardPanel>
  );
}

function CitationTrackingPanel({ report }: { report: DashboardReportData }) {
  const results = report.mentionSummary?.results;
  if (!results) return null;

  const allCitations = results.flatMap((r) =>
    (r.citationUrls ?? []).map((c) => ({ ...c, engine: r.engine }))
  );
  if (allCitations.length === 0) return null;

  // Group by classification
  const ownDomain = allCitations.filter((c) => c.isOwnDomain);
  const competitor = allCitations.filter((c) => c.isCompetitor && !c.isOwnDomain);
  const thirdParty = allCitations.filter((c) => !c.isOwnDomain && !c.isCompetitor);

  // Deduplicate by domain for summary
  const domainCounts = new Map<string, { count: number; isOwn: boolean; isComp: boolean }>();
  for (const c of allCitations) {
    const existing = domainCounts.get(c.domain);
    if (existing) {
      existing.count++;
    } else {
      domainCounts.set(c.domain, { count: 1, isOwn: c.isOwnDomain, isComp: c.isCompetitor });
    }
  }
  const sortedDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1].count - a[1].count);

  // Per-engine citation counts
  const engines = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;
  const engineCounts = engines.map((e) => ({
    engine: e,
    count: allCitations.filter((c) => c.engine === e).length,
  })).filter((e) => e.count > 0);

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="Citations"
        title="AI Citation Sources"
        description={`${allCitations.length} citation URLs found across ${engineCounts.length} engine${engineCounts.length === 1 ? '' : 's'}`}
      />

      {/* Summary stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#25c972]/15 bg-[#25c972]/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-[#25c972]">{ownDomain.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Your domain</p>
        </div>
        <div className="rounded-xl border border-[#ff8a1e]/15 bg-[#ff8a1e]/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-[#ff8a1e]">{competitor.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Competitor</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-center">
          <p className="text-lg font-bold text-zinc-300">{thirdParty.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Third-party</p>
        </div>
      </div>

      {/* Per-engine breakdown */}
      {engineCounts.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Citations by engine
          </p>
          <div className="flex flex-wrap gap-2">
            {engineCounts.map((ec) => (
              <span key={ec.engine} className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-zinc-300">
                <span className="font-semibold capitalize">{ec.engine}</span>
                <span className="text-zinc-500">{ec.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cited domains */}
      <div className="mt-5">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Cited domains
        </p>
        <div className="space-y-1.5">
          {sortedDomains.slice(0, 12).map(([domain, info]) => (
            <div key={domain} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  info.isOwn ? 'bg-[#25c972]' : info.isComp ? 'bg-[#ff8a1e]' : 'bg-zinc-500'
                )} />
                <span className="text-[12px] text-zinc-200">{domain}</span>
                {info.isOwn && <span className="text-[9px] uppercase tracking-wider text-[#25c972]/70">you</span>}
                {info.isComp && <span className="text-[9px] uppercase tracking-wider text-[#ff8a1e]/70">competitor</span>}
              </div>
              <span className="text-[11px] tabular-nums text-zinc-500">{info.count}x</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}

interface ContentGap {
  promptText: string;
  category: string;
  engines: string[];
  totalChecks: number;
  mentionRate: number; // 0-1
}

function ContentGapsSection({ domain }: { domain: string }) {
  const [gaps, setGaps] = useState<ContentGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const prompts: Array<{ id: string; promptText: string; category: string }> = data.prompts ?? [];
        const results: Array<{ promptId: string; engine: string; mentioned: boolean }> = data.results ?? [];

        // Group results by promptId
        const byPrompt = new Map<string, { mentioned: number; total: number; engines: Set<string> }>();
        for (const r of results) {
          const existing = byPrompt.get(r.promptId);
          if (existing) {
            existing.total++;
            if (r.mentioned) existing.mentioned++;
            existing.engines.add(r.engine);
          } else {
            byPrompt.set(r.promptId, {
              mentioned: r.mentioned ? 1 : 0,
              total: 1,
              engines: new Set([r.engine]),
            });
          }
        }

        // Find prompts with < 50% mention rate (content gaps)
        const contentGaps: ContentGap[] = [];
        for (const p of prompts) {
          const stats = byPrompt.get(p.id);
          if (!stats || stats.total === 0) continue;
          const rate = stats.mentioned / stats.total;
          if (rate < 0.5) {
            const missingEngines = Array.from(stats.engines).filter((eng) => {
              const engResults = results.filter((r) => r.promptId === p.id && r.engine === eng);
              return engResults.every((r) => !r.mentioned);
            });
            contentGaps.push({
              promptText: p.promptText,
              category: p.category,
              engines: missingEngines,
              totalChecks: stats.total,
              mentionRate: rate,
            });
          }
        }

        contentGaps.sort((a, b) => a.mentionRate - b.mentionRate);
        if (!cancelled) setGaps(contentGaps);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [domain]);

  if (loading || gaps.length === 0) return null;

  const critical = gaps.filter((g) => g.mentionRate === 0);
  const partial = gaps.filter((g) => g.mentionRate > 0);

  return (
    <CollapsibleSection title="Content Gaps" defaultOpen={false}>
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Opportunities"
          title="Content gap analysis"
          description={`${gaps.length} prompt${gaps.length === 1 ? '' : 's'} where AI engines don't mention your brand`}
        />

        {/* Summary stats */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#ff5252]/15 bg-[#ff5252]/5 px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#ff5252]">{critical.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Never mentioned</p>
          </div>
          <div className="rounded-xl border border-[#ff8a1e]/15 bg-[#ff8a1e]/5 px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#ff8a1e]">{partial.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Low mention rate</p>
          </div>
        </div>

        {/* Gap cards */}
        <div className="mt-5 space-y-3">
          {gaps.map((gap, i) => (
            <div key={i} className="rounded-[1.1rem] border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200 line-clamp-2">&ldquo;{gap.promptText}&rdquo;</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      {gap.category}
                    </span>
                    {gap.engines.length > 0 && (
                      <span className="text-[10px] text-zinc-500">
                        Missing in: {gap.engines.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    gap.mentionRate === 0 ? 'text-[#ff5252]' : 'text-[#ff8a1e]'
                  )}>
                    {Math.round(gap.mentionRate * 100)}%
                  </p>
                  <p className="text-[9px] text-zinc-600">mention rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actionable tip */}
        <div className="mt-5 rounded-xl border border-[#6c63ff]/15 bg-[#6c63ff]/5 px-4 py-3">
          <p className="text-[12px] font-medium text-[#6c63ff]">Content strategy tip</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
            Create dedicated pages or FAQ sections that directly address these prompts.
            AI engines are more likely to cite your brand when your content closely matches
            the questions users ask.
          </p>
        </div>
      </DashboardPanel>
    </CollapsibleSection>
  );
}

function PromptVolumeTeaser() {
  const previewRows = [
    { prompt: 'Best project management tools for startups', volume: '12.4K', trend: '+18%', difficulty: 'High' },
    { prompt: 'How to improve team productivity', volume: '8.1K', trend: '+5%', difficulty: 'Medium' },
    { prompt: 'Top CRM software for small business', volume: '6.7K', trend: '+22%', difficulty: 'High' },
    { prompt: 'Free invoicing tools comparison', volume: '3.2K', trend: '-3%', difficulty: 'Low' },
  ];

  return (
    <DashboardPanel className="relative overflow-hidden p-5">
      {/* "Coming soon" overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px]">
        <div className="rounded-2xl border border-[#6c63ff]/25 bg-[#6c63ff]/10 px-6 py-4 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-[#6c63ff]" />
          <p className="mt-2 text-sm font-semibold text-white">Prompt Volume Intelligence</p>
          <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-zinc-400">
            Discover how often real users ask AI engines the prompts that matter to your brand.
            Search volume, demand trends, and competitive density — coming soon.
          </p>
          <span className="mt-3 inline-block rounded-full border border-[#6c63ff]/30 bg-[#6c63ff]/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[#6c63ff]">
            Coming soon
          </span>
        </div>
      </div>

      {/* Blurred preview content underneath */}
      <SectionTitle
        eyebrow="Volume"
        title="Prompt search volume"
        description="Monthly search volume and demand trends for your tracked prompts"
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-center">
          <p className="text-lg font-bold text-zinc-300">30.4K</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total volume</p>
        </div>
        <div className="rounded-xl border border-[#25c972]/15 bg-[#25c972]/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-[#25c972]">+12%</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg trend</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-center">
          <p className="text-lg font-bold text-zinc-300">4</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tracked</p>
        </div>
      </div>

      {/* Sample table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="pb-2 pr-4 font-medium">Prompt</th>
              <th className="pb-2 pr-4 font-medium">Volume</th>
              <th className="pb-2 pr-4 font-medium">Trend</th>
              <th className="pb-2 font-medium">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="max-w-[200px] truncate py-2.5 pr-4 text-zinc-300">{row.prompt}</td>
                <td className="py-2.5 pr-4 font-medium tabular-nums text-zinc-200">{row.volume}</td>
                <td className={cn(
                  'py-2.5 pr-4 font-medium tabular-nums',
                  row.trend.startsWith('+') ? 'text-[#25c972]' : 'text-[#ff5252]'
                )}>
                  {row.trend}
                </td>
                <td className="py-2.5">
                  <span className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-medium',
                    row.difficulty === 'High' && 'bg-[#ff5252]/10 text-[#ff5252]',
                    row.difficulty === 'Medium' && 'bg-[#ff8a1e]/10 text-[#ff8a1e]',
                    row.difficulty === 'Low' && 'bg-[#25c972]/10 text-[#25c972]',
                  )}>
                    {row.difficulty}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

function AiVisibilityDashboard({ report }: { report: DashboardReportData }) {
  const dimensions = report.score.dimensions;
  if (!dimensions?.length) return null;

  const scores = report.score.scores;
  const fixes = report.score.fixes ?? report.fixes ?? [];

  // Radar data
  const radarData = dimensions.map((d) => ({ subject: d.label, value: d.percentage, fullMark: 100 }));

  // Donut data — aggregate pass/fail/unknown across all checks
  const checkCounts = { pass: 0, fail: 0, unknown: 0 };
  for (const dim of dimensions) {
    for (const ch of dim.checks) {
      checkCounts[ch.verdict]++;
    }
  }
  const donutData = [
    { name: 'Pass', value: checkCounts.pass, color: CHART_COLORS.pass },
    { name: 'Fail', value: checkCounts.fail, color: CHART_COLORS.fail },
    { name: 'Unknown', value: checkCounts.unknown, color: CHART_COLORS.unknown },
  ].filter((d) => d.value > 0);

  // Bar data — sorted lowest → highest
  const barData = [...dimensions].sort((a, b) => a.percentage - b.percentage).map((d) => ({ name: d.label, pct: d.percentage }));

  // Top 5 fixes
  const topFixes = fixes.slice(0, 5);

  const cards: { label: string; value: number | null; suffix?: string }[] = [
    { label: 'Overall', value: scores.overall ?? null },
    { label: 'AI Visibility', value: scores.aiVisibility },
    { label: 'Web Health', value: scores.webHealth },
    { label: 'Potential Lift', value: scores.potentialLift, suffix: '+' },
  ];

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Dashboard" title="AI Visibility Overview" description="Visual breakdown of your AI visibility metrics across all dimensions." />

      {/* Score Cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border-l-[3px] bg-white/[0.03] px-4 py-3" style={{ borderLeftColor: card.value != null ? barFillColor(card.value) : 'rgba(255,255,255,0.1)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{card.label}</p>
            <p className={cn('mt-1 text-2xl font-bold leading-none', scoreColor(card.value))}>
              {card.value != null ? `${card.suffix ?? ''}${Math.round(card.value)}` : '--'}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row: Radar + Donut */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Radar Chart */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">AI Dimension Radar</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <Radar dataKey="value" stroke={CHART_COLORS.pass} fill={CHART_COLORS.pass} fillOpacity={0.2} />
              <Tooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Check Status Donut */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Check Status</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as { name: string; value: number; color: string };
                return (
                  <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
                    <span style={{ color: item.color }} className="font-medium">{item.name}</span>
                    <span className="ml-2 text-white">{item.value}</span>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Breakdown Bars */}
      <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Dimension Breakdown</p>
        <ResponsiveContainer width="100%" height={barData.length * 40 + 20}>
          <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={18}>
              {barData.map((entry) => (
                <Cell key={entry.name} fill={barFillColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Priority Fixes */}
      {topFixes.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Top Priority Fixes</p>
          <div className="space-y-2">
            {topFixes.map((fix, i) => (
              <div key={fix.checkId} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">{fix.label}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{fix.category}</span>
                <span className={cn('shrink-0 text-xs font-semibold', fix.estimatedLift > 0 ? 'text-[#25c972]' : 'text-zinc-500')}>
                  {fix.estimatedLift > 0 ? `+${fix.estimatedLift}` : fix.estimatedLift}
                </span>
                <span className="shrink-0 rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-zinc-500">
                  {fix.effortBand ?? (fix.effort <= 2 ? 'quick' : fix.effort <= 5 ? 'medium' : 'heavy')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}

function CenteredLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', scoreColor(value))}>{value == null ? '--' : `${Math.round(value)}`}</p>
    </div>
  );
}

function FixCard({
  copied,
  file,
  fix,
  index,
  onCopyPrompt,
}: {
  copied: boolean;
  file: GeneratedFile | null;
  fix: PrioritizedFix;
  index: number;
  onCopyPrompt: () => Promise<void>;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/8 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-[12px] font-semibold text-white">
              {index}
            </span>
            <h3 className="text-sm font-semibold text-white">{fix.label}</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{fix.detail}</p>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2">
          <MetricPill label="Impact" value={fix.estimatedLift} />
          <MetricPill label="Effort" value={fix.effort} />
          <MetricPill label="ROI" value={Math.round(fix.roi * 10)} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            How to fix it
          </p>
          <p className="mt-2 text-[13px] leading-6 text-zinc-300">{fix.instruction}</p>
          {fix.actualValue || fix.expectedValue ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {fix.actualValue ? <MiniInfoTile title="Current value" body={fix.actualValue} /> : null}
              {fix.expectedValue ? <MiniInfoTile title="Expected value" body={fix.expectedValue} /> : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Implementation
          </p>
          <p className="mt-2 text-[13px] leading-6 text-zinc-300">
            {file ? `Use ${file.filename} or its prompt to implement this fix quickly.` : 'Copy the implementation prompt and work through the change directly in your codebase or CMS.'}
          </p>
          <button
            type="button"
            onClick={onCopyPrompt}
            className={cn(
              'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors',
              copied
                ? 'bg-blue-500/15 text-blue-200'
                : 'bg-[var(--color-primary)] text-white hover:opacity-90'
            )}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Prompt copied' : file ? `Copy ${file.filename} prompt` : 'Copy fix prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}


export { AdvancedPageContent };
