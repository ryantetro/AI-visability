'use client';

import { useCallback, useMemo, useState } from 'react';
import { CollapsibleSection } from '@/components/app/dashboard-primitives';
import { usePlan } from '@/hooks/use-plan';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { PromptLibraryPanel } from '../panels/prompt-library-panel';
import { useContentGaps } from '../hooks/use-content-gaps';
import {
  buildCursorPrompt,
  getFileMeta,
  getGroupedFixes,
  matchFixToFile,
} from '../lib/utils';
import type { DashboardReportData, FilesData, GeneratedFile } from '../lib/types';
import type { PrioritizedFix } from '@/types/score';
import { ImproveActionCenter } from './improve-action-center';
import { ImproveFixList } from './improve-fix-list';
import { ImproveHeader } from './improve-header';

export function ImproveSection({
  report,
  files,
  domain,
  platformLabel,
}: {
  report: DashboardReportData;
  files: FilesData | null;
  domain: string;
  platformLabel: string | null;
}) {
  const { tier, maxPrompts } = usePlan();
  const { gaps, loading: gapsLoading } = useContentGaps(domain);
  const [copiedSinglePrompt, setCopiedSinglePrompt] = useState<string | null>(null);

  const fixes = report.score.fixes ?? report.fixes ?? [];
  const groupedFixes = useMemo(() => getGroupedFixes(fixes), [fixes]);
  const effectivePlatformLabel = platformLabel ?? (files ? formatPlatformLabel(files.detectedPlatform) : null);

  const topFixesByRoi = useMemo(
    () => [...fixes].sort((a, b) => b.roi - a.roi).slice(0, 3),
    [fixes],
  );

  const quickWins = useMemo(
    () => fixes.filter((f) => f.effortBand === 'quick').length,
    [fixes],
  );

  const estLiftPoints = useMemo(
    () => Math.round(fixes.reduce((s, f) => s + (f.pointsAvailable ?? 0), 0)),
    [fixes],
  );

  const copyFixPrompt = useCallback(
    async (fix: PrioritizedFix, relatedFile: GeneratedFile | null) => {
      if (relatedFile && effectivePlatformLabel && files) {
        const meta = getFileMeta(relatedFile.filename);
        const prompt = buildCursorPrompt(relatedFile, domain, effectivePlatformLabel, meta, files.url);
        try {
          await navigator.clipboard.writeText(prompt);
          setCopiedSinglePrompt(relatedFile.filename);
          setTimeout(() => setCopiedSinglePrompt((c) => (c === relatedFile.filename ? null : c)), 2200);
        } catch { /* blocked */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(fix.copyPrompt);
        setCopiedSinglePrompt(fix.checkId);
        setTimeout(() => setCopiedSinglePrompt((c) => (c === fix.checkId ? null : c)), 2200);
      } catch { /* blocked */ }
    },
    [domain, effectivePlatformLabel, files],
  );

  const handleCopyFixPromptForActionCenter = useCallback(
    async (fix: PrioritizedFix) => {
      const relatedFile = files ? matchFixToFile(fix, files.files) : null;
      await copyFixPrompt(fix, relatedFile);
    },
    [copyFixPrompt, files],
  );

  const scrollToFixList = useCallback(() => {
    document.getElementById('improve-fix-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="space-y-8">
      <ImproveHeader
        totalFixes={fixes.length}
        quickWins={quickWins}
        contentGapsCount={gapsLoading ? null : gaps.length}
        gapsLoading={gapsLoading}
        workstreamCount={groupedFixes.length}
        estLiftPoints={estLiftPoints}
      />

      <ImproveActionCenter
        topFixes={topFixesByRoi}
        totalFixCount={fixes.length}
        gaps={gaps}
        gapsLoading={gapsLoading}
        onCopyFixPrompt={handleCopyFixPromptForActionCenter}
        onScrollToFixList={scrollToFixList}
      />

      <ImproveFixList
        groupedFixes={groupedFixes}
        files={files?.files ?? null}
        matchFixToFile={matchFixToFile}
        copiedSinglePrompt={copiedSinglePrompt}
        onCopyPrompt={copyFixPrompt}
      />

      <CollapsibleSection title="Prompt library" defaultOpen={false}>
        <PromptLibraryPanel domain={domain} tier={tier} maxPrompts={maxPrompts} />
      </CollapsibleSection>
    </div>
  );
}
