'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { EngineIcon, BrandFavicon } from '@/app/advanced/panels/shared';
import type { CompetitorComparisonData } from '@/types/competitors';
import type { AIEngine, EngineBreakdown, MentionSummary } from '@/types/ai-mentions';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';

function heatColor(rate: number): string {
  if (rate >= 75) return '#25c972';
  if (rate >= 50) return '#ffbb00';
  if (rate >= 25) return '#ff8a1e';
  if (rate > 0) return '#ff5252';
  return 'rgba(255,255,255,0.04)';
}

function heatBg(rate: number): string {
  if (rate >= 75) return 'rgba(37,201,114,0.15)';
  if (rate >= 50) return 'rgba(255,187,0,0.12)';
  if (rate >= 25) return 'rgba(255,138,30,0.10)';
  if (rate > 0) return 'rgba(255,82,82,0.10)';
  return 'rgba(255,255,255,0.02)';
}

interface HeatmapRow {
  name: string;
  isUser: boolean;
  engines: Record<AIEngine, { mentioned: number; total: number; rate: number | null; state: string }>;
}

function buildCell(summary: MentionSummary | null | undefined, engine: AIEngine) {
  const eb = summary?.engineBreakdown?.[engine] as EngineBreakdown | undefined;
  const status = summary?.engineStatus?.[engine];
  const mentioned = eb?.mentioned ?? 0;
  const total = eb?.total ?? 0;

  if (!status || status.status === 'not_backfilled') {
    return { mentioned, total, rate: null, state: 'Not tested yet' };
  }
  if (status.status === 'not_configured') {
    return { mentioned, total, rate: null, state: 'Not configured' };
  }
  if (status.status === 'error' && total === 0) {
    return { mentioned, total, rate: null, state: 'Error' };
  }

  return {
    mentioned,
    total,
    rate: total > 0 ? Math.round((mentioned / total) * 100) : 0,
    state: 'Complete',
  };
}

function buildRows(data: CompetitorComparisonData): HeatmapRow[] {
  const rows: HeatmapRow[] = [];

  // User's row
  const userEngines = {} as HeatmapRow['engines'];
  for (const engine of AI_ENGINES) {
    userEngines[engine] = buildCell(data.userBrand.mentionSummary, engine);
  }
  rows.push({ name: data.userBrand.domain, isUser: true, engines: userEngines });

  // Competitor rows
  for (const comp of data.competitors) {
    if (comp.status !== 'complete' || !comp.scanData?.mentionSummary) continue;
    const compEngines = {} as HeatmapRow['engines'];
    for (const engine of AI_ENGINES) {
      compEngines[engine] = buildCell(comp.scanData.mentionSummary, engine);
    }
    rows.push({ name: comp.competitorDomain, isUser: false, engines: compEngines });
  }

  return rows;
}

export function EngineHeatmap({ data }: { data: CompetitorComparisonData }) {
  const rows = buildRows(data);

  if (rows.length <= 1) return null;

  let cellIndex = 0;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="Engine breakdown"
        title="Engine Heatmap"
        description="Mention rate by AI engine across all brands."
      />

      <div className="mt-5 overflow-x-auto">
        <div
          className="grid min-w-[480px] gap-1"
          style={{
            gridTemplateColumns: `160px repeat(${AI_ENGINES.length}, 1fr)`,
          }}
        >
          {/* Header row */}
          <div /> {/* Empty corner cell */}
          {AI_ENGINES.map((engine) => (
            <div
              key={engine}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.03] px-2 py-2"
            >
              <EngineIcon engine={engine} className="size-4" />
              <span className="text-[10px] font-medium text-zinc-400">
                {getAIEngineLabel(engine)}
              </span>
            </div>
          ))}

          {/* Data rows */}
          {rows.map((row) => (
            <React.Fragment key={row.name}>
              {/* Row label */}
              <div
                className={`flex items-center gap-2 rounded-lg px-2 py-2.5 ${
                  row.isUser ? 'border border-white/[0.12] bg-white/[0.04]' : 'bg-white/[0.02]'
                }`}
              >
                <BrandFavicon name={row.name} size={16} />
                <span className="truncate text-[11px] font-medium text-zinc-200">
                  {row.name}
                </span>
              </div>

              {/* Cells */}
              {AI_ENGINES.map((engine) => {
                const cell = row.engines[engine];
                const ci = cellIndex++;
                return (
                  <motion.div
                    key={`${row.name}-${engine}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: ci * 0.05 }}
                    className="flex flex-col items-center justify-center rounded-lg px-2 py-2.5"
                    style={{ backgroundColor: heatBg(cell.rate ?? 0) }}
                  >
                    <span
                      className="text-[14px] font-bold tabular-nums"
                      style={{ color: cell.rate == null ? '#71717a' : heatColor(cell.rate) }}
                    >
                      {cell.rate == null ? '--' : `${cell.rate}%`}
                    </span>
                    <span className="mt-0.5 text-[9px] text-zinc-500">
                      {cell.rate == null ? cell.state : 'Mention rate'}
                    </span>
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}
