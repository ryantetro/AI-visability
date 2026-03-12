'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FileJson2,
  Globe2,
  Home,
  Info,
  RefreshCw,
  ShieldCheck,
  Target,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { getDomain, getFaviconUrl } from '@/lib/url-utils';
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
    reportPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  } | null;
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

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [files, setFiles] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reauditLoading, setReauditLoading] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState(false);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);
  const [copiedReportBrief, setCopiedReportBrief] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchFiles() {
      try {
        const res = await fetch(`/api/scan/${id}/files`);
        if (!res.ok) {
          const payload = await res.json();
          throw new Error(payload.error || 'Failed to load files');
        }

        const payload = (await res.json()) as FilesData;
        if (!active) return;

        setFiles(payload);
        setSelectedFilename((current) => current ?? payload.files[0]?.filename ?? null);
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchFiles();

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

      router.push(`/scan/${payload.id}`);
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
    if (!files?.copyToLlm?.reportPrompt) return;
    try {
      await navigator.clipboard.writeText(files.copyToLlm.reportPrompt);
      setCopiedReportBrief(true);
      window.setTimeout(() => setCopiedReportBrief(false), 2500);
    } catch {
      setActionError('Copy failed. Your browser blocked clipboard access.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
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
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
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

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Left sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <Target className="h-5 w-5 text-emerald-500" />
            AISO
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href={`/scan/${id}`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Target className="h-4 w-4" />
            Scan report
          </Link>
          <div className="mt-4 flex flex-col gap-1 border-t border-zinc-800 pt-4">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Implementation
            </p>
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2.5">
              <p className="text-xs font-semibold text-emerald-400">Deploy files</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">Current page</p>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href={`/scan/${id}`} className="hover:text-white">Audit</Link>
              <span>/</span>
              <span className="text-white">Deploy files</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReaudit}
              disabled={reauditLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', reauditLoading && 'animate-spin')} />
              Re-audit
            </button>
            <a
              href={files.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Visit site
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={handleCopyReportBrief}
              disabled={!files.copyToLlm?.reportPrompt}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                copiedReportBrief
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              )}
            >
              <Bot className="h-4 w-4" />
              {copiedReportBrief ? 'Brief copied' : 'Copy audit brief'}
            </button>
            <button
              type="button"
              onClick={handleCopyAllPrompts}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                copiedAllPrompts
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
            >
              <Terminal className="h-4 w-4" />
              {copiedAllPrompts ? 'Copied!' : 'Copy all prompts for Cursor'}
            </button>
            <a
              href={`/api/scan/${id}/files/archive`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </a>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Domain overview */}
          <div className="mb-6 flex items-center gap-3">
            <img src={getFaviconUrl(domain)} alt="" className="h-8 w-8 rounded" />
            <div>
              <h1 className="text-lg font-semibold text-white">{domain}</h1>
              <p className="text-sm text-zinc-400">Deploy-ready AI visibility files</p>
            </div>
          </div>

          {/* Metric cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Files ready"
              description="Generated for your site"
              value={String(files.files.length)}
            />
            <MetricCard
              title="Platform"
              description="Detected stack"
              value={formatPlatformLabel(files.detectedPlatform)}
            />
            <MetricCard
              title="Generated"
              description="When files were created"
              value={formatGeneratedAt(files.generatedAt)}
            />
            <MetricCard
              title="Status"
              description="Ready to deploy"
              value="Complete"
              valueColor="text-emerald-400"
            />
          </div>

          {actionError && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {actionError}
            </div>
          )}

          {files.copyToLlm?.reportPrompt && (
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Implementation brief</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Copy the full repair brief before you deploy</h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    This packages the full AI-first audit, Web Health findings, and prioritized fixes into one prompt for ChatGPT or Claude.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-zinc-400">
                    <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1">
                      {files.copyToLlm.fixPrompts.length} fix prompts included
                    </span>
                    <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1">
                      Works alongside the generated files
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReportBrief}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors',
                    copiedReportBrief
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  )}
                >
                  <Copy className="h-4 w-4" />
                  {copiedReportBrief ? 'Copied to clipboard' : 'Copy implementation brief'}
                </button>
              </div>
            </section>
          )}

          {/* Two-column: File list + File detail */}
          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            {/* Top providers style — file list */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Generated files
              </p>
              <div className="mt-4 space-y-1">
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
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        active ? 'bg-emerald-500/15 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-bold text-zinc-500">
                        {index + 1}
                      </span>
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.filename}</p>
                        <p className="truncate text-[11px] text-zinc-500">{meta.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* File detail + code */}
            <main className="space-y-6">
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                      {activeMeta.subtitle}
                    </span>
                    <h2 className="mt-2 text-xl font-semibold text-white">{activeFile.filename}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{activeFile.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(activeFile, domain, formatPlatformLabel(files.detectedPlatform))}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                        copiedSinglePrompt
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      )}
                    >
                      <Terminal className="h-4 w-4" />
                      {copiedSinglePrompt ? 'Copied!' : 'Copy prompt for Cursor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeFile)}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedFile === activeFile.filename ? 'Copied' : 'Copy file'}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTextFile(activeFile.filename, activeFile.content)}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>

                <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200/90">
                  <strong>Easiest path:</strong> Copy the prompt above, paste it into Cursor, and let the AI implement this fix for you.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <InfoCard title="What it does" body={activeMeta.purpose} />
                  <InfoCard title="Where to install" body={activeMeta.installTarget} />
                  <InfoCard
                    title="How to verify"
                    body={activeMeta.verify}
                    action={
                      <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        Open URL
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    }
                  />
                </div>
              </section>

              <details className="group rounded-xl border border-zinc-800 bg-zinc-900/50" open>
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-white hover:bg-zinc-800/50">
                  Cursor prompt — copy & paste to implement
                  <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-zinc-800 px-5 py-4">
                  <p className="mb-3 text-xs text-zinc-500">
                    Paste this into Cursor and let the AI implement the fix for you.
                  </p>
                  <pre className="max-h-[320px] overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
                    {buildCursorPrompt(
                      activeFile,
                      domain,
                      formatPlatformLabel(files.detectedPlatform),
                      activeMeta,
                      files.url
                    )}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(activeFile, domain, formatPlatformLabel(files.detectedPlatform))}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedSinglePrompt ? 'Copied!' : 'Copy prompt'}
                  </button>
                </div>
              </details>

              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
                  <p className="text-sm font-semibold text-white">Code preview</p>
                  <p className="font-mono text-xs text-zinc-500">{activeFile.filename}</p>
                </div>
                <div className="max-h-[420px] overflow-auto bg-[#0d1117]">
                  <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <pre className="p-4 font-mono text-xs leading-relaxed text-zinc-300">
                    {fileLines.map((line, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="w-8 shrink-0 select-none text-right text-zinc-600">{i + 1}</span>
                        <code className="flex-1 whitespace-pre-wrap break-words">{line || ' '}</code>
                      </div>
                    ))}
                  </pre>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  description,
  value,
  valueColor = 'text-white',
}: {
  title: string;
  description: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
        </div>
        <Info className="h-4 w-4 shrink-0 text-zinc-600" />
      </div>
      <p className={cn('mt-3 text-2xl font-bold tabular-nums', valueColor)}>{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
      {action}
    </div>
  );
}
