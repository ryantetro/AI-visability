'use client';

import { useState } from 'react';
import { Globe, Info, Link2Off } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/url-utils';
import { ENGINE_COLORS } from '../lib/constants';
import { EngineIcon } from './shared';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DashboardReportData } from '../lib/types';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';

function DomainFavicon({ domain, isOwn, isComp }: { domain: string; isOwn: boolean; isComp: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <Globe className={cn(
        'h-4 w-4 shrink-0',
        isOwn ? 'text-[#25c972]' : isComp ? 'text-[#ff8a1e]' : 'text-gray-500'
      )} />
    );
  }
  return (
    <img
      src={getFaviconUrl(domain, 16)}
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  );
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

function CitationChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].filter(p => (p.value ?? 0) > 0).sort((a, b) => b.value - a.value);
  if (sorted.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-2xl backdrop-blur-sm min-w-[170px]">
      <p className="text-[13px] font-semibold text-gray-900 mb-2.5 pb-2 border-b border-gray-200">{label}</p>
      <div className="space-y-2">
        {sorted.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2.5">
            <EngineIcon engine={p.dataKey} className="size-5" />
            <span className="text-[12px] text-gray-700 flex-1">{getAIEngineLabel(p.dataKey as never)}</span>
            <span className="text-[14px] font-bold tabular-nums text-gray-900">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CitationTrackingPanel({ report }: { report: DashboardReportData }) {
  const results = report.mentionSummary?.results;
  const allCitations = (results ?? []).flatMap((r) =>
    (r.citationUrls ?? []).map((c) => ({ ...c, engine: r.engine }))
  );

  if (allCitations.length === 0) {
    return (
      <DashboardPanel className="p-8">
        <div className="flex flex-col items-center text-center py-8">
          <div className="mb-4 rounded-full bg-gray-50 p-4">
            <Link2Off className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-[15px] font-semibold text-gray-700">No citations found</h3>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-gray-500">
            AI engines didn&apos;t include citation links for your brand in their responses.
            Citations appear when AI models reference specific URLs alongside their answers.
          </p>
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left max-w-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">How to improve</p>
            <ul className="space-y-1.5 text-[12px] text-gray-500">
              <li>Publish authoritative, well-structured content</li>
              <li>Add an <code className="text-gray-700 bg-gray-100 px-1 rounded text-[11px]">llms.txt</code> file to your site</li>
              <li>Build high-quality backlinks from trusted sources</li>
              <li>Ensure your site is crawlable by AI bots</li>
            </ul>
          </div>
        </div>
      </DashboardPanel>
    );
  }

  const ownDomain = allCitations.filter((c) => c.isOwnDomain);
  const competitor = allCitations.filter((c) => c.isCompetitor && !c.isOwnDomain);
  const thirdParty = allCitations.filter((c) => !c.isOwnDomain && !c.isCompetitor);

  const domainCounts = new Map<string, { count: number; isOwn: boolean; isComp: boolean; uniqueUrls: Set<string>; brandCites: number }>();
  for (const c of allCitations) {
    const existing = domainCounts.get(c.domain);
    if (existing) {
      existing.count++;
      existing.uniqueUrls.add(c.url);
      if (c.isOwnDomain) existing.brandCites++;
    } else {
      domainCounts.set(c.domain, {
        count: 1,
        isOwn: c.isOwnDomain,
        isComp: c.isCompetitor,
        uniqueUrls: new Set([c.url]),
        brandCites: c.isOwnDomain ? 1 : 0,
      });
    }
  }
  const sortedDomains = Array.from(domainCounts.entries()).sort((a, b) => b[1].count - a[1].count);
  const maxCiteCount = sortedDomains.length > 0 ? sortedDomains[0][1].count : 1;

  const engineCounts = AI_ENGINES
    .map((e) => ({ engine: e, count: allCitations.filter((c) => c.engine === e).length }))
    .filter((e) => e.count > 0);

  const maxEngineCount = Math.max(...engineCounts.map((e) => e.count), 1);

  // Build chart data: citations per engine grouped by prompt topic/category
  const activeEngines = engineCounts.map(ec => ec.engine);
  const chartData = (() => {
    if (!results || results.length === 0) return [];
    const topicSet = new Set(results.map(r => r.prompt.topic).filter(Boolean));
    const useTopics = topicSet.size >= 3;
    const groups = new Map<string, Record<string, number>>();
    for (const r of results) {
      const key = useTopics ? (r.prompt.topic || r.prompt.category) : r.prompt.category;
      const label = key || 'General';
      if (!groups.has(label)) {
        const init: Record<string, number> = {};
        for (const e of activeEngines) init[e] = 0;
        groups.set(label, init);
      }
      groups.get(label)![r.engine] += (r.citationUrls?.length ?? 0);
    }
    return Array.from(groups.entries()).map(([label, vals]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      ...vals,
    }));
  })();

  return (
    <div className="space-y-6">
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Citations"
          title="AI Citation Sources"
          description={`${allCitations.length} citation URLs found across ${engineCounts.length} engine${engineCounts.length === 1 ? '' : 's'}`}
        />

        {/* KPI stat boxes */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#25c972]/15 bg-[#25c972]/5 px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#25c972]">{ownDomain.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Your domain</p>
          </div>
          <div className="rounded-xl border border-[#ff8a1e]/15 bg-[#ff8a1e]/5 px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#ff8a1e]">{competitor.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Competitor</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
            <p className="text-lg font-bold text-gray-700">{thirdParty.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Third-party</p>
          </div>
        </div>
      </DashboardPanel>

      {/* Domain table with progress bars */}
      <DashboardPanel className="p-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Cited Domains</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                <th className="pb-2.5 pr-3">Domain</th>
                <th className="pb-2.5 pr-3 text-right">Citations</th>
                <th className="pb-2.5 text-right">Brand Citations</th>
              </tr>
            </thead>
            <tbody>
              {sortedDomains.slice(0, 15).map(([domainName, info]) => {
                const citePct = Math.round((info.count / allCitations.length) * 100);
                const brandCitePct = info.count > 0 ? Math.round((info.brandCites / info.count) * 100) : 0;
                const barWidthPct = Math.round((info.count / maxCiteCount) * 100);

                return (
                  <tr key={domainName} className="border-b border-gray-100">
                    {/* Domain column */}
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <DomainFavicon domain={domainName} isOwn={info.isOwn} isComp={info.isComp} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-gray-700 truncate">{domainName}</span>
                            {info.isOwn && <span className="text-[9px] font-bold uppercase tracking-wider text-[#25c972]">you</span>}
                            {info.isComp && <span className="text-[9px] font-bold uppercase tracking-wider text-[#ff8a1e]">competitor</span>}
                          </div>
                          <span className="inline-block mt-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                            {info.uniqueUrls.size} page{info.uniqueUrls.size !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Citations column */}
                    <td className="py-3.5 pr-3 text-right w-[160px]">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[13px] font-bold tabular-nums text-gray-700">{info.count}</span>
                        <span className="text-[11px] tabular-nums text-gray-500">{citePct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: info.isOwn ? '#25c972' : info.isComp ? '#ff8a1e' : '#71717a',
                          }}
                        />
                      </div>
                    </td>

                    {/* Brand Citations column */}
                    <td className="py-3.5 text-right w-[160px]">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[13px] font-bold tabular-nums text-gray-700">{info.brandCites}</span>
                        <span className="text-[11px] tabular-nums text-gray-500">{brandCitePct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all bg-[#25c972]"
                          style={{ width: `${brandCitePct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      {/* Citation Analysis Chart + Top Engines Leaderboard */}
      {engineCounts.length > 0 && chartData.length > 0 && (
        <DashboardPanel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle
              eyebrow="Analysis"
              title="Citation Trends by Engine"
              description={`Tracking ${activeEngines.length} engine${activeEngines.length === 1 ? '' : 's'} across ${chartData.length} topic${chartData.length === 1 ? '' : 's'}`}
            />
            <div className="group relative mt-1 shrink-0">
              <Info className="h-4 w-4 cursor-help text-gray-400 transition-colors group-hover:text-gray-500" />
              <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-[280px] rounded-xl border border-gray-200 bg-white px-4 py-3 opacity-0 shadow-2xl backdrop-blur-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <p className="text-[11px] font-semibold text-gray-700">Why only some engines?</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
                  Citation tracking requires structured URL data from the AI provider&apos;s API. Currently only Perplexity returns citation links in its responses. ChatGPT, Gemini, and Claude are tracked for mentions, sentiment, and positioning but their APIs don&apos;t expose citation URLs.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-0">
            {/* Chart area */}
            <div className="flex-1 min-w-0">
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 80, left: 4 }}>
                    <defs>
                      {activeEngines.map(e => (
                        <linearGradient key={`grad-${e}`} id={`line-grad-${e}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ENGINE_COLORS[e] ?? '#71717a'} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={ENGINE_COLORS[e] ?? '#71717a'} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                      tickLine={false}
                      interval={0}
                      tick={(props: Record<string, unknown>) => {
                        const x = props.x as number;
                        const y = props.y as number;
                        const raw = (props.payload as { value: string })?.value ?? '';
                        const label = raw.length > 18 ? raw.slice(0, 17) + '\u2026' : raw;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={12}
                              textAnchor="end"
                              fill="#6b7280"
                              fontSize={10}
                              fontWeight={500}
                              transform="rotate(-40)"
                            >
                              {label}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip
                      content={<CitationChartTooltip />}
                      cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
                    />
                    {activeEngines.map(e => (
                      <Line
                        key={e}
                        type="monotone"
                        dataKey={e}
                        stroke={ENGINE_COLORS[e] ?? '#71717a'}
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: '#fff',
                          stroke: ENGINE_COLORS[e] ?? '#71717a',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 6,
                          fill: ENGINE_COLORS[e] ?? '#71717a',
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                        style={{ filter: `drop-shadow(0 0 4px ${ENGINE_COLORS[e] ?? '#71717a'}44)` }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="-mt-2 flex items-center justify-center gap-5">
                {activeEngines.map(e => (
                  <div key={e} className="flex items-center gap-2">
                    <EngineIcon engine={e} className="size-4" />
                    <span className="text-[11px] font-medium capitalize text-gray-500">
                      {getAIEngineLabel(e as never)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Engines leaderboard sidebar */}
            <div className="hidden lg:flex w-[200px] shrink-0 flex-col border-l border-gray-200 pl-6 ml-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                Top Engines
              </p>
              <div className="mt-5 space-y-5">
                {engineCounts.map((ec, i) => {
                  const pct = Math.round((ec.count / allCitations.length) * 100);
                  return (
                    <div key={ec.engine} className="flex items-start gap-3">
                      <span className="mt-0.5 text-[13px] font-bold tabular-nums text-gray-400">{i + 1}</span>
                      <EngineIcon engine={ec.engine} className="mt-0.5 size-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold capitalize text-gray-700">
                          {getAIEngineLabel(ec.engine as never)}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[15px] font-bold tabular-nums text-gray-900">{ec.count}</span>
                          <span className="text-[10px] text-gray-500">citations</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-[3px] flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: ENGINE_COLORS[ec.engine] ?? '#71717a',
                              }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-gray-500">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DashboardPanel>
      )}
    </div>
  );
}
