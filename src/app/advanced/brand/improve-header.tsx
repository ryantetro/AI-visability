'use client';

import { cn } from '@/lib/utils';

interface ImproveHeaderProps {
  totalFixes: number;
  quickWins: number;
  contentGapsCount: number | null;
  gapsLoading: boolean;
  workstreamCount: number;
  estLiftPoints: number;
}

export function ImproveHeader({
  totalFixes,
  quickWins,
  contentGapsCount,
  gapsLoading,
  workstreamCount,
  estLiftPoints,
}: ImproveHeaderProps) {
  const gapsDisplay = gapsLoading ? '—' : contentGapsCount ?? 0;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Total fixes
        </p>
        <p className="mt-1.5 text-4xl font-bold tabular-nums tracking-tight text-white">
          {totalFixes}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          {workstreamCount > 0 ? `Across ${workstreamCount} area${workstreamCount === 1 ? '' : 's'}` : 'No open issues'}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Quick wins
        </p>
        <p className="mt-1.5 text-4xl font-bold tabular-nums tracking-tight text-[#25c972]">
          {quickWins}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">Minimal effort</p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Content gaps
        </p>
        <p className={cn(
          'mt-1.5 text-4xl font-bold tabular-nums tracking-tight',
          typeof contentGapsCount === 'number' && contentGapsCount > 0 ? 'text-[#ff8a1e]' : 'text-white',
        )}>
          {gapsDisplay}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">Low / no AI mentions</p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Est. lift available
        </p>
        <p className="mt-1.5 text-4xl font-bold tabular-nums tracking-tight text-[#a855f7]">
          +{estLiftPoints}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">Points if all fixed</p>
      </div>
    </div>
  );
}
