'use client';

import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart,
  Bar, BarChart, XAxis, YAxis,
  Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { ExportButton } from '@/components/ui/export-button';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '../lib/constants';
import { scoreColor, barFillColor } from '../lib/utils';
import { ChartTooltipContent } from './shared';
import type { DashboardReportData } from '../lib/types';

export function AiVisibilityDashboard({ report }: { report: DashboardReportData }) {
  const dimensions = report.score.dimensions;
  if (!dimensions?.length) return null;

  const scores = report.score.scores;
  const fixes = report.score.fixes ?? report.fixes ?? [];

  let domain = '';
  try { domain = new URL(report.url).hostname.replace(/^www\./, ''); } catch { /* fallback */ }

  const radarData = dimensions.map((d) => ({ subject: d.label, value: d.percentage, fullMark: 100 }));

  const checkCounts = { pass: 0, fail: 0, unknown: 0 };
  for (const dim of dimensions) {
    for (const ch of dim.checks) {
      checkCounts[ch.verdict]++;
    }
  }
  const donutData = [
    { name: 'Pass', value: checkCounts.pass, color: CHART_COLORS.pass },
    { name: 'Fail', value: checkCounts.fail, color: CHART_COLORS.fail },
    { name: 'Unknown', value: checkCounts.unknown, color: CHART_COLORS.unknown },
  ].filter((d) => d.value > 0);

  const barData = [...dimensions].sort((a, b) => a.percentage - b.percentage).map((d) => ({ name: d.label, pct: d.percentage }));

  const topFixes = fixes.slice(0, 5);

  const cards: { label: string; value: number | null; suffix?: string }[] = [
    { label: 'Overall', value: scores.overall ?? null },
    { label: 'AI Visibility', value: scores.aiVisibility },
    { label: 'Web Health', value: scores.webHealth },
    { label: 'Potential Lift', value: scores.potentialLift, suffix: '+' },
  ];

  return (
    <DashboardPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle eyebrow="Dashboard" title="AI Visibility Overview" description="Visual breakdown of your AI visibility metrics across all dimensions." />
        {domain && (
          <ExportButton
            exportType="scans"
            domain={domain}
            featureGate="data_export"
            className="mt-1"
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border-l-[3px] bg-white/[0.03] px-4 py-3" style={{ borderLeftColor: card.value != null ? barFillColor(card.value) : 'rgba(255,255,255,0.1)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{card.label}</p>
            <p className={cn('mt-1 text-2xl font-bold leading-none', scoreColor(card.value))}>
              {card.value != null ? `${card.suffix ?? ''}${Math.round(card.value)}` : '--'}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">AI Dimension Radar</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <Radar dataKey="value" stroke={CHART_COLORS.pass} fill={CHART_COLORS.pass} fillOpacity={0.2} />
              <Tooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Check Status</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as { name: string; value: number; color: string };
                return (
                  <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
                    <span style={{ color: item.color }} className="font-medium">{item.name}</span>
                    <span className="ml-2 text-white">{item.value}</span>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Dimension Breakdown</p>
        <ResponsiveContainer width="100%" height={barData.length * 40 + 20}>
          <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={18}>
              {barData.map((entry) => (
                <Cell key={entry.name} fill={barFillColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {topFixes.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Top Priority Fixes</p>
          <div className="space-y-2">
            {topFixes.map((fix, i) => (
              <div key={fix.checkId} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">{fix.label}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{fix.category}</span>
                <span className={cn('shrink-0 text-xs font-semibold', fix.estimatedLift > 0 ? 'text-[#25c972]' : 'text-zinc-500')}>
                  {fix.estimatedLift > 0 ? `+${fix.estimatedLift}` : fix.estimatedLift}
                </span>
                <span className="shrink-0 rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-zinc-500">
                  {fix.effortBand ?? (fix.effort <= 2 ? 'quick' : fix.effort <= 5 ? 'medium' : 'heavy')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}
