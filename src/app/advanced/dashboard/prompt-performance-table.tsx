'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronRight, MessageSquare, XCircle } from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import { cn } from '@/lib/utils';
import { EmptyStateCard } from './empty-state-card';
import type { MentionResult, AIEngine } from '@/types/ai-mentions';

const ENGINE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
  grok: GrokIcon,
};

interface PromptRow {
  promptText: string;
  totalEngines: number;
  mentionedEngines: number;
  visibilityPct: number;
  topEngine: AIEngine | null;
  topCompetitor: string | null;
  mentioned: boolean;
}

function buildRows(results: MentionResult[]): PromptRow[] {
  const grouped = new Map<string, MentionResult[]>();
  for (const r of results) {
    const key = r.prompt.text;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  const rows: PromptRow[] = [];
  for (const [promptText, group] of grouped) {
    const totalEngines = group.length;
    const mentionedEngines = group.filter((r) => r.mentioned).length;
    const visibilityPct = totalEngines > 0 ? Math.round((mentionedEngines / totalEngines) * 100) : 0;

    // Find the top engine (mentioned + best position)
    const mentionedResults = group.filter((r) => r.mentioned);
    let topEngine: AIEngine | null = null;
    if (mentionedResults.length > 0) {
      const ranked = mentionedResults
        .filter((r) => r.position != null)
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      topEngine = ranked.length > 0 ? ranked[0].engine : mentionedResults[0].engine;
    }

    // Find top competitor
    const competitorCounts = new Map<string, number>();
    for (const r of group) {
      for (const comp of r.competitors ?? []) {
        competitorCounts.set(comp, (competitorCounts.get(comp) || 0) + 1);
      }
    }
    let topCompetitor: string | null = null;
    let maxCount = 0;
    for (const [name, count] of competitorCounts) {
      if (count > maxCount) {
        topCompetitor = name;
        maxCount = count;
      }
    }

    rows.push({
      promptText,
      totalEngines,
      mentionedEngines,
      visibilityPct,
      topEngine,
      topCompetitor,
      mentioned: mentionedEngines > 0,
    });
  }

  // Sort: worst visibility first (surface opportunities)
  return rows.sort((a, b) => a.visibilityPct - b.visibilityPct);
}

interface PromptPerformanceTableProps {
  mentionResults: MentionResult[];
  domain: string;
  hasPaidPlan: boolean;
}

export function PromptPerformanceTable({ mentionResults, domain, hasPaidPlan }: PromptPerformanceTableProps) {
  if (mentionResults.length === 0) {
    return (
      <DashboardPanel className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-700">Prompt Performance</p>
            <h2 className="mt-1.5 text-lg font-semibold text-gray-900">AI Mentions by Prompt</h2>
          </div>
          <Link href="/brand/improve" className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-700 transition-colors hover:text-gray-900">
            Manage Prompts <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-4">
          <EmptyStateCard
            icon={MessageSquare}
            iconColor="#a855f7"
            title="No prompts tracked yet"
            description="Run a scan to see which AI prompts mention your business across ChatGPT, Perplexity, Gemini, and Claude."
            ctaLabel="View Brand & Prompts"
            ctaHref="/brand/improve"
            ghostRows={3}
          />
        </div>
      </DashboardPanel>
    );
  }

  const rows = buildRows(mentionResults);
  const displayRows = rows.slice(0, 8);
  const hasMore = rows.length > 8;
  const opportunityCount = rows.filter((r) => r.visibilityPct < 50).length;

  return (
    <DashboardPanel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-700">Prompt Performance</p>
          <p className="mt-0.5 text-[11px] text-gray-600">Visibility of your brand across AI-generated answers</p>
        </div>
        <Link href="/brand/improve" className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 transition-colors hover:text-gray-900">
          View All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">Prompt</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">Top Engine</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">Visibility</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">Top Competitor</th>
              <th className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const EngineIcon = row.topEngine ? ENGINE_ICONS[row.topEngine] : null;
              const engineMeta = row.topEngine ? AI_ENGINE_META[row.topEngine] : null;
              return (
                <tr key={row.promptText} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="max-w-[200px] truncate py-2 pr-4 text-[12px] text-gray-800">
                    {row.promptText}
                  </td>
                  <td className="py-2 pr-4">
                    {EngineIcon && engineMeta ? (
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: engineMeta.color }}>
                          <EngineIcon className="h-3 w-3" />
                        </span>
                        <span className="text-[11px] font-medium text-gray-700">{engineMeta.label}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-500">--</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      row.visibilityPct >= 50
                        ? 'bg-green-50 text-green-700'
                        : row.visibilityPct > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    )}>
                      {row.visibilityPct}%
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {row.topCompetitor ? (
                      <span className="text-[11px] text-gray-700">{row.topCompetitor}</span>
                    ) : (
                      <span className="text-[11px] text-gray-500">--</span>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    {row.mentioned ? (
                      <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="mx-auto h-3.5 w-3.5 text-red-400" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-3 text-center">
          <Link href="/brand/improve" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
            View all {rows.length} prompts →
          </Link>
        </div>
      )}

      {opportunityCount > 0 && !hasPaidPlan && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-gray-800">
              {opportunityCount} prompt{opportunityCount !== 1 ? 's' : ''} below 50% visibility
            </p>
            <p className="mt-0.5 text-[10px] text-gray-600">Targeted content can improve your mention rate</p>
          </div>
          <Link
            href="/report#fix-my-site"
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
          >
            Get Expert Help
          </Link>
        </div>
      )}
    </DashboardPanel>
  );
}
