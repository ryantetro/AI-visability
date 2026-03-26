'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Copy, Download, ExternalLink, Zap, Wrench, Sparkles } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import type { PrioritizedFix } from '@/types/score';
import { cn } from '@/lib/utils';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { AiPresenceTab } from '../panels/ai-presence-tab';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { ContentGeneratorPanel } from '../panels/content-generator-panel';
import { FixMySitePanel } from '../panels/fix-my-site-panel';
import { CitationTrackingPanel } from '../panels/citation-tracking-panel';
import { ContentGapsSection } from '../panels/content-gaps-section';
import { FixCard } from '../panels/fix-card';
import { getFileMeta, getGroupedFixes, matchFixToFile, verificationPath, downloadTextFile, buildCursorPrompt, buildAllFilesPrompt } from '../lib/utils';
import type { DashboardReportData, FilesData, GeneratedFile } from '../lib/types';

type BrandTab = 'presence' | 'improve' | 'citations' | 'files' | 'traffic' | 'content' | 'services';

interface BrandSectionProps {
  report: DashboardReportData;
  files: FilesData | null;
  domain: string;
  platformLabel: string | null;
}

const VALID_TABS: BrandTab[] = ['presence', 'improve', 'citations', 'files', 'traffic', 'content', 'services'];

export function BrandSection({ report, files, domain, platformLabel }: BrandSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') as BrandTab | null;
  const activeTab: BrandTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'presence';

  const setActiveTab = useCallback((tab: BrandTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'presence') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState<string | null>(null);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);

  const tabs: { id: BrandTab; label: string }[] = [
    { id: 'presence', label: 'AI Presence' },
    { id: 'improve', label: 'Improve' },
    { id: 'citations', label: 'Citations' },
    { id: 'files', label: 'Files' },
    { id: 'traffic', label: 'Traffic' },
    { id: 'content', label: 'Content' },
    { id: 'services', label: 'Services' },
  ];

  const fixes = report.score.fixes ?? report.fixes ?? [];
  const groupedFixes = getGroupedFixes(fixes);
  const effectivePlatformLabel = platformLabel ?? (files ? formatPlatformLabel(files.detectedPlatform) : null);

  const handleCopyFile = async (file: GeneratedFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedFile(file.filename);
      setTimeout(() => setCopiedFile((c) => (c === file.filename ? null : c)), 1800);
    } catch { /* clipboard blocked */ }
  };

  const handleCopyFilePrompt = async (file: GeneratedFile) => {
    if (!effectivePlatformLabel) return;
    const meta = getFileMeta(file.filename);
    const prompt = buildCursorPrompt(file, domain, effectivePlatformLabel, meta, files!.url);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedSinglePrompt(file.filename);
      setTimeout(() => setCopiedSinglePrompt((c) => (c === file.filename ? null : c)), 2200);
    } catch { /* clipboard blocked */ }
  };

  const handleCopyAllPrompts = async () => {
    if (!files || !effectivePlatformLabel) return;
    const prompt = buildAllFilesPrompt(files.files, domain, effectivePlatformLabel, files.url);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedAllPrompts(true);
      setTimeout(() => setCopiedAllPrompts(false), 2200);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-[#25c972] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'presence' && (
        <AiPresenceTab report={report} domain={domain} />
      )}

      {activeTab === 'improve' && (
        <>
          {fixes.length > 0 && <FixSummaryCards fixes={fixes} />}
          <ContentGapsSection domain={domain} />

          {groupedFixes.length > 0 ? (
            <div className="space-y-3">
              {groupedFixes.map((group, groupIdx) => {
                const GroupIcon = group.icon;
                return (
                  <WorkstreamSection
                    key={group.key}
                    icon={<GroupIcon className="h-4 w-4 text-zinc-400" />}
                    title={group.title}
                    count={group.fixes.length}
                    defaultOpen={groupIdx === 0}
                  >
                    <div className="space-y-2 px-4 pb-4">
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
                                await handleCopyFilePrompt(relatedFile);
                                return;
                              }
                              try { await navigator.clipboard.writeText(fix.copyPrompt); } catch { /* blocked */ }
                            }}
                          />
                        );
                      })}
                    </div>
                  </WorkstreamSection>
                );
              })}
            </div>
          ) : (
            <DashboardPanel className="p-5">
              <p className="text-center text-sm text-zinc-500">No fixes needed. Your site is in great shape!</p>
            </DashboardPanel>
          )}

          {/* <PromptLibraryPanel domain={domain} /> */}
        </>
      )}

      {activeTab === 'citations' && <CitationTrackingPanel report={report} />}

      {activeTab === 'files' && files && files.files.length > 0 && (
        <DashboardPanel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle eyebrow="Files to deploy" title="Generated assets" description={`${files.files.length} deploy-ready files with verification links`} />
            <button
              type="button"
              onClick={handleCopyAllPrompts}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#25c972]/30 bg-[#25c972]/10 px-3.5 py-2 text-xs font-medium text-[#25c972] transition-colors hover:bg-[#25c972]/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {copiedAllPrompts ? 'All prompts copied!' : 'Copy All Prompts'}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {files.files.map((file) => {
              const meta = getFileMeta(file.filename);
              const Icon = meta.icon;
              const verifyTarget = verificationPath(files.url, file.filename);
              return (
                <div key={file.filename} className="rounded-[1.1rem] border border-white/8 bg-white/[0.02] p-4">
                  {/* File info — always on top */}
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{file.filename}</p>
                      <p className="mt-0.5 text-[12px] text-zinc-500">{meta.subtitle}</p>
                      {file.installInstructions && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">{file.installInstructions.split('.')[0]}.</p>
                      )}
                    </div>
                  </div>
                  {/* Actions — always on a separate row */}
                  <div className="mt-3 flex flex-wrap gap-2 pl-[26px]">
                    <button type="button" onClick={() => handleCopyFilePrompt(file)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#25c972]/20 bg-[#25c972]/[0.06] px-3 py-2 text-xs font-medium text-[#25c972] transition-colors hover:bg-[#25c972]/15">
                      <Zap className="h-3.5 w-3.5" />
                      {copiedSinglePrompt === file.filename ? 'Prompt copied!' : 'Copy Prompt'}
                    </button>
                    <button type="button" onClick={() => handleCopyFile(file)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                      <Copy className="h-3.5 w-3.5" />
                      {copiedFile === file.filename ? 'Copied' : 'Copy'}
                    </button>
                    <button type="button" onClick={() => downloadTextFile(file.filename, file.content)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                    <a href={verifyTarget} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                      Verify <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      )}

      {activeTab === 'files' && (!files || files.files.length === 0) && (
        <DashboardPanel className="p-5">
          <p className="text-center text-sm text-zinc-500">No generated files available. Run a scan to generate deployment files.</p>
        </DashboardPanel>
      )}

      {activeTab === 'traffic' && (
        <>
          <PromptAnalyticsPanel domain={domain} />
          <AICrawlerPanel domain={domain} />
        </>
      )}

      {activeTab === 'content' && (
        <ContentGeneratorPanel domain={domain} />
      )}

      {activeTab === 'services' && (
        <FixMySitePanel domain={domain} />
      )}
    </div>
  );
}

/* ── Fix Summary Cards ────────────────────────────────────────────────────── */

function FixSummaryCards({ fixes }: { fixes: PrioritizedFix[] }) {
  const quickCount = fixes.filter((f) => f.effortBand === 'quick').length;
  const deepCount = fixes.filter((f) => f.effortBand === 'medium' || f.effortBand === 'technical').length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
        <Zap className="h-5 w-5 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">
            Quick Wins
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500/15 px-1.5 text-[11px] font-bold text-emerald-300">
              {quickCount}
            </span>
          </p>
          <p className="text-[11px] text-zinc-500">Minimal effort</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
        <Wrench className="h-5 w-5 shrink-0 text-blue-400" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">
            Deep Fixes
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500/15 px-1.5 text-[11px] font-bold text-blue-300">
              {deepCount}
            </span>
          </p>
          <p className="text-[11px] text-zinc-500">Requires more effort</p>
        </div>
      </div>
    </div>
  );
}

/* ── Workstream Section (replaces CollapsibleSection + DashboardPanel nesting) */

function WorkstreamSection({
  icon,
  title,
  count,
  defaultOpen,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        {icon}
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.08] px-1.5 text-[11px] font-bold text-zinc-300">
          {count}
        </span>
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pt-0">{children}</div>}
    </div>
  );
}
