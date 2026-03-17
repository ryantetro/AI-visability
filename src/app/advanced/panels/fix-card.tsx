'use client';

import { Copy } from 'lucide-react';
import { MiniInfoTile } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { MetricPill } from './shared';
import type { GeneratedFile } from '../lib/types';
import type { PrioritizedFix } from '@/types/score';

export function FixCard({
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
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-[12px] font-semibold text-white">{index}</span>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">How to fix it</p>
          <p className="mt-2 text-[13px] leading-6 text-zinc-300">{fix.instruction}</p>
          {fix.actualValue || fix.expectedValue ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {fix.actualValue ? <MiniInfoTile title="Current value" body={fix.actualValue} /> : null}
              {fix.expectedValue ? <MiniInfoTile title="Expected value" body={fix.expectedValue} /> : null}
            </div>
          ) : null}
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Implementation</p>
          <p className="mt-2 text-[13px] leading-6 text-zinc-300">
            {file ? `Use ${file.filename} or its prompt to implement this fix quickly.` : 'Copy the implementation prompt and work through the change directly in your codebase or CMS.'}
          </p>
          <button
            type="button"
            onClick={onCopyPrompt}
            className={cn(
              'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors',
              copied ? 'bg-blue-500/15 text-blue-200' : 'bg-[var(--color-primary)] text-white hover:opacity-90'
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
