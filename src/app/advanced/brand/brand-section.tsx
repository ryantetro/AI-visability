'use client';

import { useState } from 'react';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { CollapsibleSection, DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { AiVisibilityDashboard } from '../panels/ai-visibility-dashboard';
import { CitationTrackingPanel } from '../panels/citation-tracking-panel';
import { PromptLibraryPanel } from '../panels/prompt-library-panel';
import { PositionTrendingPanel } from '../panels/position-trending-panel';
import { ContentGapsSection } from '../panels/content-gaps-section';
import { FixCard } from '../panels/fix-card';
import { getFileMeta, getGroupedFixes, matchFixToFile, verificationPath, downloadTextFile, buildCursorPrompt } from '../lib/utils';
import type { DashboardReportData, FilesData, GeneratedFile } from '../lib/types';

type BrandTab = 'visibility' | 'prompts' | 'citations' | 'fixes' | 'files';

interface BrandSectionProps {
  report: DashboardReportData;
  files: FilesData | null;
  domain: string;
  platformLabel: string | null;
}

export function BrandSection({ report, files, domain, platformLabel }: BrandSectionProps) {
  const [activeTab, setActiveTab] = useState<BrandTab>('visibility');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState<string | null>(null);

  const tabs: { id: BrandTab; label: string }[] = [
    { id: 'visibility', label: 'Visibility' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'citations', label: 'Citations' },
    { id: 'fixes', label: 'Fixes' },
    { id: 'files', label: 'Files' },
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

      {activeTab === 'visibility' && (
        <>
          <AiVisibilityDashboard report={report} />
          <PositionTrendingPanel domain={domain} />
        </>
      )}

      {activeTab === 'prompts' && <PromptLibraryPanel domain={domain} />}

      {activeTab === 'citations' && <CitationTrackingPanel report={report} />}

      {activeTab === 'fixes' && (
        <>
          {groupedFixes.length > 0 ? (
            <div className="space-y-4">
              {groupedFixes.map((group) => (
                <CollapsibleSection key={group.key} title={group.title} defaultOpen>
                  <DashboardPanel className="p-5">
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
                                await handleCopyFilePrompt(relatedFile);
                                return;
                              }
                              try { await navigator.clipboard.writeText(fix.copyPrompt); } catch { /* blocked */ }
                            }}
                          />
                        );
                      })}
                    </div>
                  </DashboardPanel>
                </CollapsibleSection>
              ))}
            </div>
          ) : (
            <DashboardPanel className="p-5">
              <p className="text-center text-sm text-zinc-500">No fixes needed. Your site is in great shape!</p>
            </DashboardPanel>
          )}
          <ContentGapsSection domain={domain} />
        </>
      )}

      {activeTab === 'files' && files && files.files.length > 0 && (
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
    </div>
  );
}
