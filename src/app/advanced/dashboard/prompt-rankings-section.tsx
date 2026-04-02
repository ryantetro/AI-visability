'use client';

import Link from 'next/link';
import { ArrowRight, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptResult {
  prompt: { text: string };
  engine: string;
  mentioned: boolean;
}

interface PromptRankingsSectionProps {
  mentionResults: PromptResult[];
  domain: string;
  hasPaidPlan: boolean;
}

export function PromptRankingsSection({
  mentionResults,
  domain: _domain,
  hasPaidPlan: _hasPaidPlan,
}: PromptRankingsSectionProps) {
  void _domain;
  void _hasPaidPlan;

  if (mentionResults.length === 0) return null;

  const promptStats = new Map<string, { mentioned: number; total: number }>();
  for (const r of mentionResults) {
    const key = r.prompt.text;
    const stats = promptStats.get(key) || { mentioned: 0, total: 0 };
    stats.total++;
    if (r.mentioned) stats.mentioned++;
    promptStats.set(key, stats);
  }

  const sorted = Array.from(promptStats.entries())
    .map(([text, stats]) => ({
      text,
      ...stats,
      rate: Math.round((stats.mentioned / stats.total) * 100),
    }))
    .sort((a, b) => a.rate - b.rate);

  const missing = sorted.filter((p) => p.rate === 0);
  const weak = sorted.filter((p) => p.rate > 0 && p.rate < 50);
  const strong = sorted.filter((p) => p.rate >= 50);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Prompt Performance</h2>
          <p className="mt-0.5 text-xs text-gray-600">
            How your brand appears when people ask AI engines these questions
          </p>
        </div>
        <Link
          href="/brand"
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900"
        >
          Manage Prompts <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {missing.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3 w-3" />
            {missing.length} not mentioned
          </span>
        )}
        {weak.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <TrendingUp className="h-3 w-3" />
            {weak.length} low visibility
          </span>
        )}
        {strong.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            {strong.length} performing well
          </span>
        )}
      </div>

      {(missing.length > 0 || weak.length > 0) && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
            Biggest Opportunities
          </p>
          <div className="space-y-1.5">
            {[...missing, ...weak].slice(0, 5).map((prompt, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  prompt.rate === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                )}>
                  {prompt.rate}%
                </span>
                <p className="min-w-0 flex-1 truncate text-xs text-gray-700">{prompt.text}</p>
                <span className="shrink-0 text-[10px] font-medium text-gray-600">
                  {prompt.mentioned}/{prompt.total} engines
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(missing.length > 0 || weak.length > 0) && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Improve your mention rate with expert optimization
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                Our team creates targeted content and optimizations so AI engines recommend you for these prompts
              </p>
            </div>
            <Link
              href="/report#fix-my-site"
              className="shrink-0 rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
            >
              Get Expert Help
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
