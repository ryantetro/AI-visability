'use client';

import Link from 'next/link';
import { ChevronRight, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import { EmptyStateCard } from './empty-state-card';
import { brandHref, brandServicesHref } from '@/lib/workspace-nav';
import type { MentionResult, AIEngine } from '@/types/ai-mentions';

const LOW_MENTION_THRESHOLD = 50;

interface PromptRankingsTableProps {
  mentionResults: MentionResult[];
  reportId?: string | null;
}

interface AggregatedPrompt {
  text: string;
  engines: Map<AIEngine, { mentioned: boolean; position: number | null }>;
  mentionCount: number;
  totalChecks: number;
  mentionRate: number;
  bestRank: number | null;
}

const ENGINE_ICONS: Record<AIEngine, React.ComponentType<{ className?: string }>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
  grok: GrokIcon,
};

const ENGINE_ORDER: AIEngine[] = ['chatgpt', 'perplexity', 'gemini', 'claude', 'grok'];

export function PromptRankingsTable({ mentionResults, reportId }: PromptRankingsTableProps) {
  const brandLink = brandHref(reportId);
  const servicesLink = brandServicesHref(reportId);
  // Group results by prompt text, aggregate across engines
  const promptMap = new Map<string, AggregatedPrompt>();

  for (const r of mentionResults) {
    const key = r.prompt.text;
    let entry = promptMap.get(key);
    if (!entry) {
      entry = {
        text: key,
        engines: new Map(),
        mentionCount: 0,
        totalChecks: 0,
        mentionRate: 0,
        bestRank: null,
      };
      promptMap.set(key, entry);
    }

    entry.totalChecks++;
    if (r.mentioned) entry.mentionCount++;

    // Store per-engine data (keep best result per engine)
    const existing = entry.engines.get(r.engine);
    if (!existing || (r.mentioned && !existing.mentioned)) {
      entry.engines.set(r.engine, {
        mentioned: r.mentioned,
        position: r.position,
      });
    }

    // Track best rank
    if (r.mentioned && r.position != null) {
      if (entry.bestRank == null || r.position < entry.bestRank) {
        entry.bestRank = r.position;
      }
    }
  }

  // Compute mention rates and sort
  const prompts = Array.from(promptMap.values())
    .map((p) => ({
      ...p,
      mentionRate: p.totalChecks > 0 ? Math.round((p.mentionCount / p.totalChecks) * 100) : 0,
    }))
    .sort((a, b) => b.mentionRate - a.mentionRate)
    .slice(0, 8);

  if (prompts.length === 0) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Prompt Rankings</p>
        <div className="mt-3">
          <EmptyStateCard
            icon={MessageSquare}
            iconColor="#a855f7"
            title="No prompts tracked yet"
            description="Run a scan to see which AI prompts mention your business across ChatGPT, Perplexity, Gemini, and Claude."
            ctaLabel="View Brand & Prompts"
            ctaHref={brandLink}
            ghostRows={3}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Prompt Rankings</p>
        <Link
          href={brandLink}
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="pb-2 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Prompt
              </th>
              <th className="pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Engines
              </th>
              <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Rank
              </th>
              <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Rate
              </th>
              <th className="w-24 pb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                <span className="sr-only">Bar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => (
              <tr
                key={prompt.text}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
              >
                <td className="max-w-[200px] py-2.5 pr-3 sm:max-w-[300px]">
                  <p className="truncate text-[12px] text-zinc-200" title={prompt.text}>
                    {prompt.text}
                  </p>
                  {prompt.mentionRate < LOW_MENTION_THRESHOLD && (
                    <Link
                      href={servicesLink}
                      className="mt-1 inline-flex text-[10px] font-medium text-[#ffbb00]/90 hover:text-[#ffbb00]"
                    >
                      Boost with targeted content →
                    </Link>
                  )}
                </td>
                <td className="py-2.5 text-center">
                  <div className="inline-flex items-center gap-1">
                    {ENGINE_ORDER.map((engine) => {
                      const data = prompt.engines.get(engine);
                      const Icon = ENGINE_ICONS[engine];
                      const color = AI_ENGINE_META[engine]?.color ?? '#6b7280';
                      if (!data) return null;
                      return (
                        <span
                          key={engine}
                          className={cn(
                            'flex items-center',
                            data.mentioned ? '' : 'opacity-20'
                          )}
                          title={`${engine}${data.mentioned ? ' (mentioned)' : ' (not mentioned)'}`}
                          style={{ color: data.mentioned ? color : undefined }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="py-2.5 text-right text-[12px] font-semibold tabular-nums text-zinc-300">
                  {prompt.bestRank != null ? `#${prompt.bestRank}` : '--'}
                </td>
                <td className="py-2.5 text-right text-[12px] font-semibold tabular-nums text-white">
                  {prompt.mentionRate}%
                </td>
                <td className="py-2.5 pl-3">
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${prompt.mentionRate}%`,
                        backgroundColor: prompt.mentionRate >= 60 ? '#25c972' : prompt.mentionRate >= 30 ? '#ffbb00' : '#ff5252',
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ffbb00]/10 bg-[#ffbb00]/[0.03] px-4 py-3">
        <p className="text-[12px] text-zinc-400">
          Weak prompts? Order AI-optimized articles to win those searches.
        </p>
        <Link
          href={servicesLink}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#ffbb00] transition-colors hover:text-[#ffd666]"
        >
          <Sparkles className="h-3 w-3" />
          Get optimized articles
        </Link>
      </div>
    </div>
  );
}
