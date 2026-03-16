'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import {
  GAP_COMPARISONS,
  ENHANCEMENTS,
  BUILD_ORDER,
  type GapSeverity,
  type FeatureState,
  type Priority,
} from './gap-data';

// ── Palette ──────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<GapSeverity, string> = {
  critical: 'text-[#ff5252]',
  high: 'text-[#ff8a1e]',
  medium: 'text-[#ffbb00]',
  none: 'text-[#25c972]',
};
const SEVERITY_BG: Record<GapSeverity, string> = {
  critical: 'bg-[#ff5252]/8 border-[#ff5252]/25',
  high: 'bg-[#ff8a1e]/8 border-[#ff8a1e]/25',
  medium: 'bg-[#ffbb00]/8 border-[#ffbb00]/25',
  none: 'bg-[#25c972]/8 border-[#25c972]/25',
};
const SEVERITY_LABEL: Record<GapSeverity, string> = {
  critical: 'Critical gap',
  high: 'Big gap',
  medium: 'Gap',
  none: 'No gap',
};

const STATE_COLOR: Record<FeatureState, string> = {
  yes: 'text-[#25c972]',
  partial: 'text-[#ffbb00]',
  no: 'text-[#ff5252]',
};
const STATE_LABEL: Record<FeatureState, string> = {
  yes: '\u2713 Has it',
  partial: '~ Partial',
  no: '\u2715 Missing',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  CRITICAL: '#ff5252',
  HIGH: '#ff8a1e',
  MEDIUM: '#3b82f6',
};

const SPRINT_COLOR: Record<number, string> = {
  1: '#ff5252',
  2: '#ff5252',
  3: '#ff8a1e',
  4: '#ff8a1e',
  5: '#3b82f6',
};

// ── Tabs ─────────────────────────────────────────────────────────

type Tab = 'gaps' | 'enhancements' | 'buildOrder';

const TABS: { id: Tab; label: string }[] = [
  { id: 'gaps', label: 'Gap Analysis' },
  { id: 'enhancements', label: 'Enhancement Plan' },
  { id: 'buildOrder', label: 'Build Order' },
];

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-[#111113] p-5 text-center">
      <div className={cn('text-3xl font-extrabold', color)}>{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}

function GapAnalysisTab() {
  const stats = useMemo(() => ({
    have: GAP_COMPARISONS.filter((c) => c.us.state === 'yes').length,
    partial: GAP_COMPARISONS.filter((c) => c.us.state === 'partial').length,
    missing: GAP_COMPARISONS.filter((c) => c.us.state === 'no').length,
    critical: GAP_COMPARISONS.filter((c) => c.gap === 'critical').length,
  }), []);

  return (
    <div>
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        Feature-by-feature comparison — {GAP_COMPARISONS.length} capabilities mapped
      </p>

      {/* Summary stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4">
        <StatCard value={stats.have} label="You have" color="text-[#25c972]" />
        <StatCard value={stats.partial} label="Partial" color="text-[#ffbb00]" />
        <StatCard value={stats.missing} label="Missing" color="text-[#ff5252]" />
        <StatCard value={stats.critical} label="Critical gaps" color="text-[#ff5252]" />
      </div>

      {/* Comparison table */}
      <DashboardPanel>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-white/8">
                <th className="w-[28%] px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.16em] font-normal text-zinc-500">Feature</th>
                <th className="w-[26%] px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.16em] font-normal text-[#3b82f6]">Your App</th>
                <th className="w-[26%] px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.16em] font-normal text-[#a855f7]">Competitor</th>
                <th className="w-[10%] px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.16em] font-normal text-zinc-500">Gap</th>
              </tr>
            </thead>
            <tbody>
              {GAP_COMPARISONS.map((row, i) => (
                <tr key={row.feature} className={cn('border-b border-white/5', i % 2 === 1 && 'bg-white/[0.015]')}>
                  <td className="px-4 py-3 font-medium text-white">{row.feature}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px]', STATE_COLOR[row.us.state])}>{STATE_LABEL[row.us.state]}</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{row.us.note}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px]', STATE_COLOR[row.competitor.state])}>{STATE_LABEL[row.competitor.state]}</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{row.competitor.note}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('inline-block whitespace-nowrap border px-2 py-0.5 text-[10px] uppercase tracking-wider', SEVERITY_COLOR[row.gap], SEVERITY_BG[row.gap])}>
                      {SEVERITY_LABEL[row.gap]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      {/* "Where you're ahead" callout */}
      <div className="mt-6 rounded-lg border border-[#25c972]/20 bg-[#18181b] px-5 py-4 text-[13px] leading-relaxed text-white">
        <span className="font-bold text-[#25c972]">Where you&apos;re ahead: </span>
        Your technical site audit (6-dimension crawl-based scoring) is more detailed than the competitor&apos;s — they only offer it on paid tiers and it&apos;s clearly not their core focus. This is a real differentiator for the SMB market.
      </div>
    </div>
  );
}

function EnhancementCard({ item }: { item: (typeof ENHANCEMENTS)[number] }) {
  const [open, setOpen] = useState(false);
  const pColor = PRIORITY_COLOR[item.priority];

  return (
    <div className="mb-2 border border-white/8 bg-[#111113]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3.5 px-5 py-4 text-left"
      >
        <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full" style={{ background: pColor }} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <span
              className="inline-block border px-2 py-0.5 text-[10px] uppercase tracking-wider"
              style={{ color: pColor, borderColor: `${pColor}30`, background: `${pColor}12` }}
            >
              {item.priority}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Effort: {item.effort}
            </span>
          </div>
          <p className="text-[15px] font-bold text-white">{item.title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">{item.subtitle}</p>
        </div>
        <ChevronDown className={cn('mt-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-white/8 px-5 py-5">
          {/* Impact */}
          <div
            className="mb-5 rounded-md border px-4 py-3 text-[13px] leading-relaxed text-white"
            style={{ borderColor: `${pColor}25`, background: `${pColor}08` }}
          >
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: pColor }}>
              Why This Matters
            </p>
            {item.impact}
          </div>

          {/* Current state */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Current State</p>
            <div className="bg-[#18181b] px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-zinc-400">
              {item.currentState}
            </div>
          </div>

          {/* What to build */}
          <div>
            <p className="mb-2.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">What To Build</p>
            {item.whatToBuild.map((step, idx) => (
              <div key={idx} className="mb-2 flex gap-2.5 text-[12px] leading-relaxed text-white">
                <span className="shrink-0 font-mono" style={{ color: pColor }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancementPlanTab() {
  const groups: { priority: Priority; items: (typeof ENHANCEMENTS)[number][] }[] = useMemo(() => {
    const priorities: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM'];
    return priorities
      .map((p) => ({ priority: p, items: ENHANCEMENTS.filter((e) => e.priority === p) }))
      .filter((g) => g.items.length > 0);
  }, []);

  return (
    <div>
      <p className="mb-6 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {ENHANCEMENTS.length} enhancements — click any to see impact, current state, and build plan
      </p>
      {groups.map(({ priority, items }) => {
        const color = PRIORITY_COLOR[priority];
        return (
          <div key={priority} className="mb-8">
            <div className="mb-3 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
              <div className="h-px w-5" style={{ background: color }} />
              {priority} PRIORITY — {items.length} items
              <div className="h-px flex-1 bg-white/8" />
            </div>
            {items.map((item) => (
              <EnhancementCard key={item.id} item={item} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function BuildOrderTab() {
  const enhancementMap = useMemo(() => {
    const map: Record<string, (typeof ENHANCEMENTS)[number]> = {};
    for (const e of ENHANCEMENTS) map[e.id] = e;
    return map;
  }, []);

  return (
    <div>
      <p className="mb-6 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        Sequenced build order — each sprint unlocks the next
      </p>

      <div className="overflow-hidden border border-white/8">
        {BUILD_ORDER.map((sprint, si) => {
          const color = SPRINT_COLOR[si + 1] ?? '#3b82f6';
          return (
            <div
              key={sprint.sprint}
              className={cn('grid grid-cols-1 sm:grid-cols-[160px_1fr]', si < BUILD_ORDER.length - 1 && 'border-b border-white/8')}
            >
              <div className="border-b border-white/8 bg-[#18181b] px-5 py-5 sm:border-b-0 sm:border-r">
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color }}>{sprint.sprint}</p>
                <p className="mt-1.5 text-[14px] font-bold text-white">{sprint.label}</p>
                <p className="mt-1 text-[11px] text-zinc-500">Weeks {sprint.weeks}</p>
              </div>
              <div className="px-5 py-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  {sprint.enhancementIds.map((id) => {
                    const item = enhancementMap[id];
                    if (!item) return null;
                    const borderColor = PRIORITY_COLOR[item.priority];
                    return (
                      <span
                        key={id}
                        className="inline-block border bg-[#18181b] px-3.5 py-1.5 text-[12px] text-white"
                        style={{ borderColor: `${borderColor}50` }}
                      >
                        {item.title}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[12px] leading-relaxed text-zinc-500">
                  <span style={{ color }}>→ </span>
                  {sprint.rationale}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Snapshot vs Monitoring callout */}
      <div className="mt-8 border border-white/8 bg-[#18181b] p-6">
        <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#a855f7]">The Core Difference To Internalize</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-white/8 bg-[#09090b] p-4">
            <p className="mb-2 text-[11px] text-zinc-500">Your app right now</p>
            <p className="mb-2 text-[14px] font-bold text-white">Snapshot tool</p>
            <p className="text-[12px] leading-relaxed text-zinc-500">
              Runs once per scan. User triggers it. Results stored on device. No continuous signal. No trend.
            </p>
          </div>
          <div className="border border-[#a855f7]/30 bg-[#09090b] p-4">
            <p className="mb-2 text-[11px] text-[#a855f7]">What you need to become</p>
            <p className="mb-2 text-[14px] font-bold text-white">Monitoring platform</p>
            <p className="text-[12px] leading-relaxed text-zinc-500">
              Runs continuously in background. User sets it up once. Results accumulate on server. Trends are the product.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────

export function RoadmapView() {
  const [tab, setTab] = useState<Tab>('gaps');

  const critCount = ENHANCEMENTS.filter((e) => e.priority === 'CRITICAL').length;
  const highCount = ENHANCEMENTS.filter((e) => e.priority === 'HIGH').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          Competitive Analysis — Internal Reference
        </p>
        <h1 className="mt-2 text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight text-white">
          Product Roadmap
        </h1>
        <div className="mt-2 flex flex-wrap gap-5 text-[13px] text-zinc-500">
          <span><span className="font-bold text-[#ff5252]">{critCount} critical</span> gaps</span>
          <span><span className="font-bold text-[#ff8a1e]">{highCount} high</span> priority</span>
          <span><span className="font-bold text-[#25c972]">1 area</span> where you&apos;re already ahead</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mb-8 inline-flex border border-white/10">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-5 py-2.5 text-[12px] uppercase tracking-wider transition-colors',
              i > 0 && 'border-l border-white/10',
              tab === t.id
                ? 'bg-[#a855f7] font-semibold text-white'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'gaps' && <GapAnalysisTab />}
      {tab === 'enhancements' && <EnhancementPlanTab />}
      {tab === 'buildOrder' && <BuildOrderTab />}
    </div>
  );
}
