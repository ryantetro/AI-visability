'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Download, ExternalLink, Sparkles, Zap } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { usePlan } from '@/hooks/use-plan';
import { AiPresenceTab } from '../panels/ai-presence-tab';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { ContentGeneratorPanel } from '../panels/content-generator-panel';
import { FixMySitePanel } from '../panels/fix-my-site-panel';
import { CitationTrackingPanel } from '../panels/citation-tracking-panel';
import { getFileMeta, matchFixToFile, verificationPath, downloadTextFile, buildCursorPrompt, buildAllFilesPrompt } from '../lib/utils';
import type { DashboardReportData, FilesData, GeneratedFile } from '../lib/types';
import { ImproveSection } from './improve-section';

type BrandTab = 'presence' | 'improve' | 'citations' | 'files' | 'traffic' | 'content' | 'services';

interface BrandSectionProps {
  report: DashboardReportData;
  files: FilesData | null;
  domain: string;
  platformLabel: string | null;
}

const VALID_TABS: BrandTab[] = ['presence', 'improve', 'citations', 'files', 'traffic', 'content', 'services'];

export function BrandSection({ report, files, domain, platformLabel }: BrandSectionProps) {
  const searchParams = useSearchParams();
  const { tier, maxPrompts } = usePlan();

  const tabParam = searchParams.get('tab') as BrandTab | null;
  const activeTab: BrandTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'presence';

  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState<string | null>(null);
  const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);

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
      {activeTab === 'presence' && (
        <AiPresenceTab report={report} domain={domain} />
      )}

      {activeTab === 'improve' && (
        <ImproveSection
          report={report}
          files={files}
          domain={domain}
          platformLabel={platformLabel}
        />
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
          <AICrawlerPanel domain={domain} tier={tier} />
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
