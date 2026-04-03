'use client';

import { useState } from 'react';
import { ChevronDown, Copy, Download, ExternalLink, Zap, Wrench, Sparkles } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import type { PrioritizedFix } from '@/types/score';
import { cn } from '@/lib/utils';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { usePlan } from '@/hooks/use-plan';
import { getBrandSectionMeta, type BrandSectionKey } from '@/lib/brand-navigation';
import { AiPresenceTab } from '../panels/ai-presence-tab';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import { PromptLibraryPanel } from '../panels/prompt-library-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { ContentGeneratorPanel } from '../panels/content-generator-panel';
import { FixMySitePanel } from '../panels/fix-my-site-panel';
import { CitationTrackingPanel } from '../panels/citation-tracking-panel';
import { ContentGapsSection } from '../panels/content-gaps-section';
import { FixCard } from '../panels/fix-card';
import { getFileMeta, getGroupedFixes, matchFixToFile, verificationPath, downloadTextFile, buildCursorPrompt, buildAllFilesPrompt } from '../lib/utils';
import type { DashboardReportData, FilesData, GeneratedFile } from '../lib/types';

interface BrandSectionProps {
  report: DashboardReportData;
  files: FilesData | null;
  domain: string;
  platformLabel: string | null;
  activeSection: BrandSectionKey;
}

export function BrandSection({ report, files, domain, platformLabel, activeSection }: BrandSectionProps) {
  const { tier, maxPrompts } = usePlan();
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState<string | null>(null);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);

  const fixes = report.score.fixes ?? report.fixes ?? [];
  const groupedFixes = getGroupedFixes(fixes);
  const effectivePlatformLabel = platformLabel ?? (files ? formatPlatformLabel(files.detectedPlatform) : null);
  const sectionMeta = getBrandSectionMeta(activeSection);

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
      {sectionMeta && activeSection !== 'presence' && (
        <DashboardPanel className="overflow-hidden border-gray-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#ecfdf5_100%)] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                Brand Workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {sectionMeta.label}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {sectionMeta.description}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm shadow-slate-200/50">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Current Domain
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{domain}</p>
            </div>
          </div>
        </DashboardPanel>
      )}

      {activeSection === 'presence' && (
        <AiPresenceTab report={report} domain={domain} />
      )}

      {activeSection === 'improve' && (
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
                    icon={<GroupIcon className="h-4 w-4 text-gray-500" />}
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
              <p className="text-center text-sm text-gray-600">No fixes needed. Your site is in great shape!</p>
            </DashboardPanel>
          )}

          <PromptLibraryPanel domain={domain} tier={tier} maxPrompts={maxPrompts} />
        </>
      )}

      {activeSection === 'citations' && <CitationTrackingPanel report={report} />}

      {activeSection === 'files' && files && files.files.length > 0 && (
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
                <div key={file.filename} className="rounded-[1.1rem] border border-gray-200 bg-gray-50 p-4">
                  {/* File info — always on top */}
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{file.filename}</p>
                      <p className="mt-0.5 text-[12px] text-gray-600">{meta.subtitle}</p>
                      {file.installInstructions && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{file.installInstructions.split('.')[0]}.</p>
                      )}
                    </div>
                  </div>
                  {/* Actions — always on a separate row */}
                  <div className="mt-3 flex flex-wrap gap-2 pl-[26px]">
                    <button type="button" onClick={() => handleCopyFilePrompt(file)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#25c972]/20 bg-[#25c972]/6 px-3 py-2 text-xs font-medium text-[#25c972] transition-colors hover:bg-[#25c972]/15">
                      <Zap className="h-3.5 w-3.5" />
                      {copiedSinglePrompt === file.filename ? 'Prompt copied!' : 'Copy Prompt'}
                    </button>
                    <button type="button" onClick={() => handleCopyFile(file)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100">
                      <Copy className="h-3.5 w-3.5" />
                      {copiedFile === file.filename ? 'Copied' : 'Copy'}
                    </button>
                    <button type="button" onClick={() => downloadTextFile(file.filename, file.content)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                    <a href={verifyTarget} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100">
                      Verify <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      )}

      {activeSection === 'files' && (!files || files.files.length === 0) && (
        <DashboardPanel className="p-5">
          <p className="text-center text-sm text-gray-600">No generated files available. Run a scan to generate deployment files.</p>
        </DashboardPanel>
      )}

      {activeSection === 'traffic' && (
        <>
          <PromptAnalyticsPanel domain={domain} />
          <AICrawlerPanel domain={domain} tier={tier} />
        </>
      )}

      {activeSection === 'content' && (
        <ContentGeneratorPanel domain={domain} />
      )}

      {activeSection === 'services' && (
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
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
        <Zap className="h-5 w-5 shrink-0 text-emerald-500" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">
            Quick Wins
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-50 px-1.5 text-[11px] font-bold text-emerald-600">
              {quickCount}
            </span>
          </p>
          <p className="text-[11px] text-gray-600">Minimal effort</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
        <Wrench className="h-5 w-5 shrink-0 text-blue-500" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">
            Deep Fixes
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-50 px-1.5 text-[11px] font-bold text-blue-600">
              {deepCount}
            </span>
          </p>
          <p className="text-[11px] text-gray-600">Requires more effort</p>
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
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        {icon}
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-bold text-gray-600">
          {count}
        </span>
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pt-0">{children}</div>}
    </div>
  );
}
