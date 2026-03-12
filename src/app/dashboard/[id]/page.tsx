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
  RefreshCw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { formatPlatformLabel } from '@/lib/platform-detection';
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
}

interface FileMeta {
  subtitle: string;
  purpose: string;
  installTarget: string;
  verify: string;
  icon: LucideIcon;
  chipClass: string;
}

const FILE_META: Record<string, FileMeta> = {
  'llms.txt': {
    subtitle: 'AI Guidance Layer',
    purpose: 'Supplies context for LLM agents about your organization and priority pages.',
    installTarget: 'Serve as /llms.txt from your public site root.',
    verify: 'Open /llms.txt in a private browser window and confirm content loads publicly.',
    icon: Bot,
    chipClass: 'border-emerald-400/35 bg-emerald-500/14 text-emerald-200',
  },
  'robots.txt': {
    subtitle: 'Crawler Access Policy',
    purpose: 'Declares crawl permissions so AI and search bots can read your important URLs.',
    installTarget: 'Publish as /robots.txt and preserve any existing required directives.',
    verify: 'Open /robots.txt and verify bot allow rules plus sitemap directives are present.',
    icon: ShieldCheck,
    chipClass: 'border-amber-400/35 bg-amber-500/14 text-amber-200',
  },
  'organization-schema.json': {
    subtitle: 'Entity Definition',
    purpose: 'Strengthens machine understanding of your business with Organization JSON-LD.',
    installTarget: 'Embed as one JSON-LD script block in your homepage <head>.',
    verify: 'Inspect source and confirm one valid schema script block is rendered.',
    icon: FileJson2,
    chipClass: 'border-cyan-400/35 bg-cyan-500/14 text-cyan-200',
  },
  'sitemap.xml': {
    subtitle: 'Discovery Map',
    purpose: 'Provides canonical URL inventory for discovery and refresh in crawler pipelines.',
    installTarget: 'Serve as /sitemap.xml and reference it from robots.txt.',
    verify: 'Open /sitemap.xml and check that URLs are live and canonical.',
    icon: Globe2,
    chipClass: 'border-indigo-400/35 bg-indigo-500/14 text-indigo-200',
  },
};

const DEFAULT_META: FileMeta = {
  subtitle: 'Generated Asset',
  purpose: 'Supports AI visibility signal quality and crawl discoverability.',
  installTarget: 'Deploy this file as part of your web configuration.',
  verify: 'Publish and re-run scan to validate impact.',
  icon: FileCode2,
  chipClass: 'border-stone-400/35 bg-stone-400/14 text-stone-200',
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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function verificationPath(baseUrl: string, filename: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  return filename === 'organization-schema.json' ? `${normalized}/` : `${normalized}/${filename}`;
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

  const secondaryActionClass =
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-stone-100 transition hover:-translate-y-0.5 hover:bg-white/[0.08]';
  const primaryActionClass =
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-[0_18px_36px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5 hover:from-emerald-400 hover:to-cyan-300';

  if (loading) {
    return (
      <div className="page-dark relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.2)_0%,transparent_45%),radial-gradient(circle_at_80%_10%,rgba(6,182,212,0.18)_0%,transparent_42%),linear-gradient(180deg,#070505_0%,#0c0a09_55%,#140f0c_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(250,250,249,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(250,250,249,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-45" />
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 backdrop-blur">
          <div className="aiso-spinner h-5 w-5 animate-spin rounded-full" />
          <p className="text-sm text-stone-200">Loading implementation studio...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-dark min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(220,38,38,0.24)_0%,transparent_40%),linear-gradient(180deg,#070505_0%,#0c0a09_60%,#140f0c_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-red-400/35 bg-red-500/10 p-8 text-center shadow-[0_26px_70px_rgba(127,29,29,0.3)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200">Dashboard Error</p>
          <h1 className="mt-3 text-2xl font-semibold text-red-50">Unable to load generated files</h1>
          <p className="mt-3 text-sm text-red-100/80">{loadError}</p>
          <Link href="/" className={cn(primaryActionClass, 'mt-6')}>
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
    <div className="page-dark relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.18)_0%,transparent_38%),radial-gradient(circle_at_100%_0%,rgba(20,184,166,0.2)_0%,transparent_42%),linear-gradient(180deg,#060504_0%,#0c0a09_55%,#181310_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(250,250,249,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(250,250,249,0.02)_1px,transparent_1px)] bg-[size:52px_52px] opacity-50" />
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.26)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute right-[-120px] top-8 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.24)_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1260px] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
        <header className="rounded-[30px] border border-white/15 bg-[linear-gradient(160deg,rgba(28,25,23,0.92),rgba(12,10,9,0.86))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Implementation Studio
                </span>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-200">
                  {files.files.length} Files Ready
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50 sm:text-[2.1rem]">
                Deploy-ready AI visibility files for {domain}
              </h1>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MetaPill label="Platform" value={formatPlatformLabel(files.detectedPlatform)} />
                <MetaPill label="Generated" value={formatGeneratedAt(files.generatedAt)} />
                <MetaPill label="Selected file" value={activeFile.filename} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className={secondaryActionClass}>
                <ArrowLeft className="h-3.5 w-3.5" />
                New scan
              </Link>

              <button
                type="button"
                onClick={handleReaudit}
                disabled={reauditLoading}
                className={secondaryActionClass}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', reauditLoading && 'animate-spin')} />
                {reauditLoading ? 'Re-auditing...' : 'Re-audit'}
              </button>

              <a href={files.url} target="_blank" rel="noreferrer" className={secondaryActionClass}>
                Visit site
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>

              <a href={`/api/scan/${id}/files/archive`} className={primaryActionClass}>
                <Download className="h-3.5 w-3.5" />
                Download ZIP
              </a>
            </div>
          </div>
        </header>

        {actionError && (
          <div className="mt-4 rounded-xl border border-red-400/35 bg-red-500/12 px-4 py-2.5 text-xs font-medium text-red-100">
            {actionError}
          </div>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-[330px,minmax(0,1fr)]">
          <aside className="space-y-3">
            <section className="rounded-[24px] border border-white/15 bg-[linear-gradient(170deg,rgba(28,25,23,0.92),rgba(12,10,9,0.9))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Deployment Rail</p>

              <div className="mt-3 -mx-1 overflow-x-auto xl:hidden">
                <div className="flex gap-2 px-1 pb-1">
                  {files.files.map((file, index) => {
                    const active = file.filename === activeFile.filename;
                    return (
                      <button
                        key={file.filename}
                        type="button"
                        onClick={() => setSelectedFilename(file.filename)}
                        className={cn(
                          'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                          active
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                            : 'border-white/15 bg-white/[0.03] text-stone-300'
                        )}
                      >
                        {index + 1}. {file.filename}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 hidden space-y-2 xl:block">
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
                        'w-full rounded-xl border p-3 text-left transition',
                        active
                          ? 'border-emerald-400/35 bg-emerald-500/12 shadow-[0_18px_36px_rgba(16,185,129,0.18)]'
                          : 'border-white/12 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', active ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100' : meta.chipClass)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', active ? 'text-emerald-200' : 'text-stone-400')}>
                            Step {index + 1}
                          </p>
                          <p className={cn('mt-0.5 truncate text-sm font-semibold', active ? 'text-stone-50' : 'text-stone-100')}>
                            {file.filename}
                          </p>
                          <p className={cn('mt-0.5 text-xs', active ? 'text-emerald-100/80' : 'text-stone-300')}>
                            {meta.subtitle}
                          </p>
                        </div>
                        <ChevronRight className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-emerald-200' : 'text-stone-500')} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-400/35 bg-cyan-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Launch Checklist</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-cyan-100/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
                  Install each file in sequence from the rail.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
                  Validate endpoint availability after publishing.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
                  Re-audit to confirm score improvement.
                </li>
              </ul>
            </section>
          </aside>

          <main className="space-y-3">
            <section className="rounded-[24px] border border-white/15 bg-[linear-gradient(165deg,rgba(28,25,23,0.92),rgba(12,10,9,0.9))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.36)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', activeMeta.chipClass)}>
                    {activeMeta.subtitle}
                  </span>
                  <h2 className="mt-2 text-xl font-semibold text-stone-50">{activeFile.filename}</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{activeFile.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(activeFile)}
                    className={secondaryActionClass}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedFile === activeFile.filename ? 'Copied' : 'Copy file'}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTextFile(activeFile.filename, activeFile.content)}
                    className={secondaryActionClass}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download file
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <DetailCard title="What this does" body={activeMeta.purpose} />
                <DetailCard title="Where to install" body={activeMeta.installTarget} />
                <div className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Verify</p>
                  <p className="mt-1 text-xs leading-5 text-stone-300">{activeMeta.verify}</p>
                  <a href={verifyUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200 hover:text-emerald-100">
                    Open verification target
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </section>

            <details open className="overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(170deg,rgba(28,25,23,0.9),rgba(12,10,9,0.88))] shadow-[0_14px_40px_rgba(0,0,0,0.3)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-stone-100 hover:bg-white/[0.04]">
                Install instructions
              </summary>
              <div className="border-t border-white/10 px-4 py-3 text-sm leading-6 text-stone-300">
                {activeFile.installInstructions}
              </div>
            </details>

            <details className="overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(170deg,rgba(28,25,23,0.9),rgba(12,10,9,0.88))] shadow-[0_14px_40px_rgba(0,0,0,0.3)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-stone-100 hover:bg-white/[0.04]">
                Code preview
              </summary>
              <div className="border-t border-white/10 p-3">
                <div className="overflow-hidden rounded-xl border border-white/15 bg-[#090807] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#12100e] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    </div>
                    <p className="font-mono text-[11px] text-stone-300">{activeFile.filename}</p>
                  </div>
                  <div className="max-h-[460px] overflow-auto">
                    <ol className="font-mono text-[12px] leading-6 text-[#d1fae5]">
                      {fileLines.map((line, index) => (
                        <li key={`${activeFile.filename}-${index}`} className="grid grid-cols-[46px,minmax(0,1fr)] gap-3 border-b border-white/5 px-3 py-1 last:border-b-0">
                          <span className="select-none text-right text-[10px] text-stone-500">{index + 1}</span>
                          <code className="whitespace-pre-wrap break-words">{line.length > 0 ? line : ' '}</code>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </details>
          </main>
        </div>
      </div>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-stone-100">{value}</p>
    </div>
  );
}

function DetailCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-300">{body}</p>
    </div>
  );
}
