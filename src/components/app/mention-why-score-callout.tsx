'use client';

import { buildMentionScoreInsights } from '@/lib/mention-insights';
import type { MentionSummary } from '@/types/ai-mentions';

type MentionAgg = Pick<
  MentionSummary,
  'overallScore' | 'engineBreakdown' | 'engineStatus' | 'visibilityPct'
>;

interface MentionWhyScoreCalloutProps {
  mentions: MentionAgg;
  degraded?: boolean;
  showUnlockCta: boolean;
  onUnlock?: () => void;
}

export function MentionWhyScoreCallout({
  mentions,
  degraded,
  showUnlockCta,
  onUnlock,
}: MentionWhyScoreCalloutProps) {
  const { bullets } = buildMentionScoreInsights(mentions, { degraded });
  if (bullets.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Why this score
      </p>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-zinc-300">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 text-zinc-600">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {showUnlockCta && onUnlock ? (
        <button
          type="button"
          onClick={onUnlock}
          className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
        >
          Unlock full prompt breakdown
        </button>
      ) : null}
    </div>
  );
}
