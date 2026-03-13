'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Crown,
  Download,
  FileCode2,
  FileJson2,
  Globe2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Terminal,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShellNav } from '@/components/app/app-shell-nav';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { ScoreSummaryHero } from '@/components/app/score-summary-hero';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { rememberRecentScan } from '@/lib/recent-scans';
import { ensureProtocol, getDomain, getFaviconUrl } from '@/lib/url-utils';
import { cn } from '@/lib/utils';

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
  score: {
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
  };
  fixes?: { checkId: string }[];
  copyToLlm?: {
    fullPrompt: string;
    remainingFixesPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  };
}

interface FileMeta {
  subtitle: string;
  purpose: string;
  installTarget: string;
  verify: string;
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
    return `Implement this AI visibility improvement for ${domain} (${platform} site).

TASK: Add Organization JSON-LD schema to the homepage.

Add a single <script type="application/ld+json"> block to the <head> of the site's homepage. The schema should be the exact JSON below—do not modify it.

\`\`\`json
${file.content}
\`\`\`

After implementing, verify the schema appears in the page source at ${siteUrl}/`;
  }

  const filePath = file.filename === 'llms.txt' ? '/llms.txt' : `/${file.filename}`;

  return `Implement this AI visibility improvement for ${domain} (${platform} site).

TASK: Create the file ${filePath} at the site root (public directory).

This file improves AI discoverability. Create it with the exact content below—do not modify it.

\`\`\`
${file.content}
\`\`\`

File: ${file.filename}
Purpose: ${meta.purpose}
Install: ${meta.installTarget}

After implementing, verify the file is publicly accessible at ${siteUrl}${filePath}`;
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

function AdvancedLanding() {
  const [domainInput, setDomainInput] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationAlertsOn, setNotificationAlertsOn] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('ryantetro@gmail.com');
  const [saveEmailLoading, setSaveEmailLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedDomain = domainInput.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || '';

  const inputFaviconUrl = useMemo(() => {
    if (!domainInput.trim()) return null;
    try {
      const domain = getDomain(ensureProtocol(domainInput));
      return domain.includes('.') ? getFaviconUrl(domain, 32) : null;
    } catch {
      return null;
    }
  }, [domainInput]);

  const handleAddDomain = () => {
    setAddError(null);
    if (!normalizedDomain) {
      setAddError('Please enter a domain');
      return;
    }
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalizedDomain)) {
      setAddError('Please enter a valid domain (e.g. example.com)');
      return;
    }
    if (domains.includes(normalizedDomain)) {
      setAddError('This domain is already added');
      return;
    }
    if (domains.length >= MAX_DOMAINS) {
      setAddError(`Maximum ${MAX_DOMAINS} domains allowed`);
      return;
    }
    if (!confirmChecked) {
      setAddError('Please confirm domain ownership');
      return;
    }
    setDomains((prev) => [...prev, normalizedDomain]);
    setDomainInput('');
  };

  const handleRemoveDomain = (d: string) => {
    setDomains((prev) => prev.filter((x) => x !== d));
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-white">
      <AppShellNav active="advanced" actionHref="/analysis" actionLabel="New scan" />
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
            onClick={() => setUnlockModalOpen(true)}
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
                onChange={(e) => {
                  setDomainInput(e.target.value);
                  setAddError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                placeholder="example.com"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
              <span className="shrink-0 text-[12px] tabular-nums text-zinc-500">
                {domains.length}/{MAX_DOMAINS}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddDomain}
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
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/15 bg-transparent accent-zinc-400"
            />
            <span className="text-[12px] leading-6 text-zinc-500">
              I confirm that I own this domain or have explicit authorization from the domain owner to monitor it. I understand that monitoring domains without proper authorization may violate terms of service and applicable laws.
            </span>
          </label>
        </div>

        {domains.length > 0 ? (
          <div className="mx-auto mt-7 w-full max-w-[840px] rounded-xl border border-white/8 bg-[#101010] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-medium text-white">Monitored domains</h3>
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Live list</p>
            </div>
            <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
              {domains.map((d) => (
                <div key={d} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <img src={getFaviconUrl(d)} alt="" className="h-4 w-4 rounded-sm" />
                    <span className="text-[13px] font-medium text-white">{d}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(d)}
                    className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/6 hover:text-red-400"
                    title="Remove domain"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={focusInput}
            onKeyDown={(e) => e.key === 'Enter' && focusInput()}
            className="mx-auto mt-7 flex min-h-[220px] w-full max-w-[840px] cursor-pointer flex-col items-center justify-center rounded-xl border border-white/8 bg-[#101010] px-6 py-9 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] transition-colors hover:border-white/12 hover:bg-[#121212]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <Plus className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="mt-5 text-[1.35rem] font-semibold tracking-tight text-white">
              No monitored domains yet
            </h3>
            <p className="mx-auto mt-2 max-w-[520px] text-[13px] leading-6 text-zinc-500">
              Add your first domain to enable daily monitoring, publish a certified page, get a do-follow backlink, and keep your Website Score Badge refreshed automatically.
            </p>
          </div>
        )}

        <button
          type="button"
          className="fixed bottom-4 right-4 z-20 inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-[#ececec] px-3 text-[12px] font-medium text-black transition-colors hover:bg-white"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Feedback
        </button>
      </div>

      <UnlockFeaturesModal
        open={unlockModalOpen}
        onOpenChange={setUnlockModalOpen}
      />

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
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-md border border-white/10 bg-[#1e1e1e] py-2.5 pl-10 pr-4 text-base text-white placeholder:text-[var(--text-muted)] focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
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
  const id = reportId ?? '';

  const [files, setFiles] = useState<FilesData | null>(null);
  const [report, setReport] = useState<DashboardReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reauditLoading, setReauditLoading] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState(false);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);
  const [copiedReportBrief, setCopiedReportBrief] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);

  useEffect(() => {
    if (id) {
      rememberRecentScan(id);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchDashboardData() {
      try {
        const [filesResult, reportResult] = await Promise.allSettled([
          fetch(`/api/scan/${id}/files`),
          fetch(`/api/scan/${id}/report`),
        ]);

        if (filesResult.status !== 'fulfilled') {
          throw new Error('Failed to load files');
        }

        const filesRes = filesResult.value;
        if (!filesRes.ok) {
          const payload = await filesRes.json();
          throw new Error(payload.error || 'Failed to load files');
        }

        const payload = (await filesRes.json()) as FilesData;
        if (!active) return;

        setFiles(payload);
        setSelectedFilename((current) => current ?? payload.files[0]?.filename ?? null);

        if (reportResult.status === 'fulfilled' && reportResult.value.ok) {
          const reportPayload = (await reportResult.value.json()) as DashboardReportData;
          if (active) {
            setReport(reportPayload);
          }
        }
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [id]);

  const handleReaudit = async () => {
    if (!files?.url) return;

    setActionError('');
    setReauditLoading(true);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: files.url, force: true }),
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

  const handleCopy = async (file: GeneratedFile) => {
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

  const handleCopyPrompt = async (file: GeneratedFile, domain: string, platform: string) => {
    const meta = getFileMeta(file.filename);
    const prompt = buildCursorPrompt(file, domain, platform, meta, files!.url);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedSinglePrompt(true);
      window.setTimeout(() => setCopiedSinglePrompt(false), 2500);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleCopyAllPrompts = async () => {
    if (!files) return;
    const platform = formatPlatformLabel(files.detectedPlatform);
    const prompts = files.files.map((file) => {
      const meta = getFileMeta(file.filename);
      return buildCursorPrompt(file, domain, platform, meta, files.url);
    });
    const combined = prompts.map((p, i) => `--- FILE ${i + 1} ---\n\n${p}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(combined);
      setCopiedAllPrompts(true);
      window.setTimeout(() => setCopiedAllPrompts(false), 2500);
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
      window.setTimeout(() => setCopiedReportBrief(false), 2500);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  const handleEnableMonitoring = async () => {
    setActionError('');
    setMonitoringLoading(true);

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: id, alertThreshold: 5 }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to enable monitoring');
      }

      setMonitoringEnabled(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to enable monitoring');
    } finally {
      setMonitoringLoading(false);
    }
  };

  if (!id) {
    return <AdvancedLanding />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
          <p className="text-sm text-zinc-400">Loading your files...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <span className="text-xl text-red-400">!</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Unable to load files</h1>
          <p className="mt-2 text-sm text-zinc-400">{loadError}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!files || files.files.length === 0) {
    return null;
  }

  const domain = getDomain(files.url);
  const activeFile = files.files.find((file) => file.filename === selectedFilename) ?? files.files[0];
  const activeMeta = getFileMeta(activeFile.filename);
  const verifyUrl = verificationPath(files.url, activeFile.filename);
  const fileLines = activeFile.content.split('\n');
  const platformLabel = formatPlatformLabel(files.detectedPlatform);
  const assetRows = files.files.map((file, index) => {
    const meta = getFileMeta(file.filename);
    const prompt = buildCursorPrompt(file, domain, platformLabel, meta, files.url);
    const lines = file.content.split('\n').length;

    return {
      filename: file.filename,
      description: file.description,
      subtitle: meta.subtitle,
      lines,
      chars: file.content.length,
      promptLines: prompt.split('\n').length,
      installSurface: file.filename === 'organization-schema.json' ? 'Homepage head' : 'Site root',
      order: index + 1,
      verifyUrl: verificationPath(files.url, file.filename),
      icon: meta.icon,
    };
  });
  const rootAssets = assetRows.filter((asset) => asset.installSurface === 'Site root').length;
  const embeddedAssets = assetRows.filter((asset) => asset.installSurface === 'Homepage head').length;
  const footprintData = assetRows.map((asset) => ({
    label: shortAssetLabel(asset.filename),
    lines: asset.lines,
    prompt: asset.promptLines,
  }));
  const installMixData = [
    { name: 'Site root', value: rootAssets, color: 'rgba(53,109,244,0.95)' },
    { name: 'Homepage head', value: embeddedAssets, color: 'rgba(22,183,202,0.9)' },
  ].filter((item) => item.value > 0);
  const scoreSummaryData = [
    {
      label: 'Overall',
      value: report?.score.scores.overall ?? 0,
      color: 'rgba(53,109,244,0.92)',
    },
    {
      label: 'AI',
      value: report?.score.scores.aiVisibility ?? 0,
      color: 'rgba(255,138,30,0.92)',
    },
    {
      label: 'Web',
      value: report?.score.scores.webHealth ?? 0,
      color: 'rgba(37,201,114,0.92)',
    },
  ].filter((item) => item.value > 0);
  const promptCount = report?.copyToLlm?.fixPrompts.length ?? files.copyToLlm?.fixPrompts.length ?? files.files.length;
  const issueCount = report?.fixes?.length ?? 0;
  const bandLabel = report?.score.overallBandInfo?.label ?? 'Deploy-ready';
  const overallScore = report?.score.scores.overall ?? null;
  const aiScore = report?.score.scores.aiVisibility ?? null;
  const webScore = report?.score.scores.webHealth ?? null;

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <AppShellNav active="advanced" />
      <div className="mx-auto flex max-w-[1360px] gap-4 px-3 py-3 sm:px-4 lg:px-5">
        <div className="min-w-0 flex-1 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.96)_0%,rgba(6,6,7,0.98)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            <div className="min-w-0">
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <img src={getFaviconUrl(domain)} alt="" className="h-4 w-4 rounded-sm" />
                {domain}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Advanced implementation workspace</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReaudit}
                disabled={reauditLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', reauditLoading && 'animate-spin')} />
                Re-audit
              </button>
              <a
                href={files.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                Visit site
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href={`/api/scan/${id}/files/archive`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                ZIP
              </a>
            </div>
          </header>

          {actionError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">
              {actionError}
            </div>
          )}

          <section id="overview" className="space-y-4">
            <ScoreSummaryHero
              domain={domain}
              url={files.url}
              dateLabel={formatGeneratedAt(files.generatedAt)}
              overall={{
                score: overallScore,
                color: getScoreColor(overallScore),
                label: 'Overall score',
                caption: bandLabel,
              }}
              supporting={[
                {
                  label: 'AI Visibility',
                  score: aiScore,
                  color: 'var(--color-warning)',
                  caption: `${issueCount} fixes`,
                },
                {
                  label: 'Web Health',
                  score: webScore,
                  color: 'var(--color-success)',
                  caption: `${rootAssets}/${files.files.length} root assets`,
                },
              ]}
              note="This page is for shipping fixes. Copy the files, prompt your editor, and deploy the highest-value assets first."
              actions={
                <>
                  <button
                    type="button"
                    onClick={handleCopyReportBrief}
                    disabled={!(report?.copyToLlm?.fullPrompt ?? files.copyToLlm?.fullPrompt)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      copiedReportBrief
                        ? 'border-blue-500/30 bg-blue-500/12 text-blue-200'
                        : 'border-white/10 bg-white/[0.025] text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {copiedReportBrief ? 'Brief copied' : 'Copy brief'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAllPrompts}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                      copiedAllPrompts
                        ? 'bg-blue-500/15 text-blue-200'
                        : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                    )}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    {copiedAllPrompts ? 'Copied' : 'Copy prompts'}
                  </button>
                </>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Files" value={String(files.files.length)} hint={platformLabel} />
              <KpiCard title="Prompts" value={String(promptCount)} hint="Ready to paste" />
              <KpiCard title="Root assets" value={String(rootAssets)} hint="Deploy first" />
              <KpiCard
                title="Monitoring"
                value={monitoringEnabled ? 'On' : 'Off'}
                hint={monitoringEnabled ? 'Watching score changes' : 'Optional add-on'}
              />
            </div>
          </section>

          <details id="analytics" className="group">
            <summary className="list-none">
              <DashboardPanel className="cursor-pointer px-4 py-3 transition-colors group-open:bg-[linear-gradient(180deg,rgba(10,10,12,0.98)_0%,rgba(8,8,9,0.99)_100%)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Optional analytics
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-white">Open delivery details</h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" />
                </div>
              </DashboardPanel>
            </summary>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <DashboardPanel className="p-4">
                <PanelHeader eyebrow="Analytics" title="Asset footprint" meta={`${files.files.length} generated assets`} />
                <div className="mt-4 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={footprintData} barCategoryGap={14}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'rgba(161,161,170,0.82)', fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={30}
                        tick={{ fill: 'rgba(113,113,122,0.9)', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 14,
                          background: 'rgba(11,11,13,0.96)',
                          color: '#fff',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="lines" name="File lines" radius={[7, 7, 0, 0]} fill="rgba(53,109,244,0.92)" />
                      <Bar dataKey="prompt" name="Prompt lines" radius={[7, 7, 0, 0]} fill="rgba(255,138,30,0.9)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </DashboardPanel>

              <div className="space-y-4">
                <DashboardPanel className="p-4">
                  <PanelHeader eyebrow="Scores" title="Score mix" meta={bandLabel} />
                  <div className="mt-3 h-[145px]">
                    {scoreSummaryData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreSummaryData} layout="vertical" margin={{ left: 0, right: 4, top: 0, bottom: 0 }}>
                          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'rgba(113,113,122,0.9)', fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="label"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            width={44}
                            tick={{ fill: 'rgba(212,212,216,0.95)', fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            contentStyle={{
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 14,
                              background: 'rgba(11,11,13,0.96)',
                              color: '#fff',
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="value" radius={[7, 7, 7, 7]}>
                            {scoreSummaryData.map((entry) => (
                              <Cell key={entry.label} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                        Score data will appear after report sync.
                      </div>
                    )}
                  </div>
                </DashboardPanel>

                <DashboardPanel className="p-4">
                  <PanelHeader eyebrow="Install mix" title="Deploy surfaces" meta={`${rootAssets}/${embeddedAssets}`} />
                  <div className="mt-3 grid grid-cols-[108px,1fr] items-center gap-3">
                    <div className="h-[96px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={installMixData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={24}
                            outerRadius={40}
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth={1}
                          >
                            {installMixData.map((item) => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 14,
                              background: 'rgba(11,11,13,0.96)',
                              color: '#fff',
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2.5">
                      {installMixData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-medium text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </DashboardPanel>
              </div>
            </div>
          </details>

          <section id="workspace" className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
            <DashboardPanel className="p-3.5">
              <PanelHeader eyebrow="Assets" title="Generated files" meta={`${files.files.length} total`} />
              <div className="mt-3 space-y-1.5">
                {files.files.map((file, index) => {
                  const meta = getFileMeta(file.filename);
                  const Icon = meta.icon;
                  const active = file.filename === activeFile.filename;

                  return (
                    <button
                      key={file.filename}
                      type="button"
                      onClick={() => setSelectedFilename(file.filename)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'border-blue-500/25 bg-blue-500/10 text-white'
                          : 'border-white/6 bg-white/[0.018] text-zinc-400 hover:bg-white/[0.035] hover:text-white'
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-black/20 text-[10px] font-semibold text-zinc-500">
                        {index + 1}
                      </span>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{file.filename}</p>
                        <p className="truncate text-[10px] text-zinc-500">{meta.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </DashboardPanel>

            <DashboardPanel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {activeMeta.subtitle}
                  </p>
                  <h2 className="mt-1 truncate text-sm font-semibold text-white">{activeFile.filename}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(activeFile, domain, platformLabel)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                      copiedSinglePrompt
                        ? 'bg-blue-500/15 text-blue-200'
                        : 'border border-white/10 bg-white/[0.025] text-zinc-200 hover:bg-white/[0.05]'
                    )}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    {copiedSinglePrompt ? 'Prompt copied' : 'Copy prompt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeFile)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedFile === activeFile.filename ? 'Copied' : 'Copy file'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTextFile(activeFile.filename, activeFile.content)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>

              <div className="grid gap-3 border-b border-white/8 px-4 py-3 sm:grid-cols-3">
                <MiniInfoTile title="Purpose" body={activeMeta.purpose} />
                <MiniInfoTile title="Install" body={activeMeta.installTarget} />
                <MiniInfoTile title="Verify" body={activeMeta.verify} />
              </div>

              <div className="max-h-[480px] overflow-auto bg-[#080808]">
                <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                    Code preview
                  </span>
                </div>
                <pre className="p-4 font-mono text-[11px] leading-5 text-zinc-300">
                  {fileLines.map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-7 shrink-0 select-none text-right text-zinc-600">{i + 1}</span>
                      <code className="flex-1 whitespace-pre-wrap break-words">{line || ' '}</code>
                    </div>
                  ))}
                </pre>
              </div>
            </DashboardPanel>

            <div className="space-y-4">
              <DashboardPanel className="p-4">
                <PanelHeader eyebrow="Active asset" title={activeFile.filename} meta={activeMeta.subtitle} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <KpiCard title="Lines" value={String(fileLines.length)} hint="Code rows" />
                  <KpiCard title="Characters" value={String(activeFile.content.length)} hint="File size" />
                  <KpiCard title="Verify URL" value={activeFile.filename === 'organization-schema.json' ? 'Homepage' : `/${activeFile.filename}`} hint="Public check" />
                </div>
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:opacity-85"
                >
                  Open verification URL
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <PanelHeader eyebrow="Prompt" title="Cursor snippet" meta="Copy and implement" />
                <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/8 bg-black/30 p-3 font-mono text-[10px] leading-5 text-zinc-300 whitespace-pre-wrap">
                  {`${buildCursorPrompt(activeFile, domain, platformLabel, activeMeta, files.url)
                    .split('\n')
                    .slice(0, 10)
                    .join('\n')}\n...`}
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(activeFile, domain, platformLabel)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedSinglePrompt ? 'Prompt copied' : 'Copy full prompt'}
                </button>
              </DashboardPanel>

              <DashboardPanel id="monitoring" className="p-4">
                <PanelHeader eyebrow="Monitoring" title="Rescan status" meta={monitoringEnabled ? 'Active' : 'Optional'} />
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.018] px-3 py-3">
                  <p className="text-xs font-medium text-white">
                    {monitoringEnabled ? 'Monitoring is active' : 'Monitoring is off'}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Alerts trigger on score swings over 5 points.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableMonitoring}
                  disabled={monitoringLoading || monitoringEnabled}
                  className={cn(
                    'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    monitoringEnabled
                      ? 'bg-[rgba(37,201,114,0.15)] text-[var(--color-success)]'
                      : 'bg-white/[0.04] text-zinc-200 hover:bg-white/[0.07]'
                  )}
                >
                  <BellRing className="h-3.5 w-3.5" />
                  {monitoringEnabled
                    ? 'Monitoring active'
                    : monitoringLoading
                      ? 'Enabling...'
                      : 'Enable monitoring'}
                </button>
              </DashboardPanel>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export { AdvancedPageContent };

function DashboardPanel({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.96)_0%,rgba(6,6,7,0.985)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.022),0_10px_24px_rgba(0,0,0,0.16)]',
        className
      )}
    >
      {children}
    </section>
  );
}

function PanelHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {meta ? <span className="text-[11px] text-zinc-500">{meta}</span> : null}
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-3">
      <p className="text-[11px] font-medium text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold leading-none tracking-[-0.03em] text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function MiniInfoTile({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <p className="mt-2 text-[11px] leading-5 text-zinc-300">{body}</p>
    </div>
  );
}

function shortAssetLabel(filename: string) {
  if (filename === 'organization-schema.json') return 'Schema';
  if (filename === 'robots.txt') return 'Robots';
  if (filename === 'sitemap.xml') return 'Sitemap';
  if (filename === 'llms.txt') return 'LLMs';
  return filename.replace(/\..+$/, '');
}

function getScoreColor(score: number | null) {
  if (score === null) return 'var(--color-primary)';
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}
