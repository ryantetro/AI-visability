import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';
import type { AIEngine, MentionSummary } from '@/types/ai-mentions';

export interface MentionScoreInsights {
  bullets: string[];
}

type MentionAgg = Pick<
  MentionSummary,
  'overallScore' | 'engineBreakdown' | 'engineStatus' | 'visibilityPct'
>;

/** Plain-language drivers for AI Mentions score (no per-prompt text; safe for free tier). */
export function buildMentionScoreInsights(
  mentions: MentionAgg,
  options: { degraded?: boolean } = {},
): MentionScoreInsights {
  const bullets: string[] = [];
  const score = mentions.overallScore;
  const visibilityPct = mentions.visibilityPct;

  let totalTests = 0;
  let totalMentions = 0;
  const weakEngines: AIEngine[] = [];

  for (const engine of AI_ENGINES) {
    const eb = mentions.engineBreakdown?.[engine];
    const st = mentions.engineStatus?.[engine];
    const total = eb?.total ?? 0;
    const mentioned = eb?.mentioned ?? 0;
    if (st?.status === 'complete' && total > 0) {
      totalTests += total;
      totalMentions += mentioned;
      if (mentioned === 0) {
        weakEngines.push(engine);
      }
    }
  }

  if (score < 40) {
    bullets.push(
      'Across our test prompts, AI models rarely surfaced your brand with strong placement or citations.',
    );
  } else if (score < 70) {
    bullets.push(
      'You are showing up in some AI answers, but visibility is inconsistent across engines and prompts.',
    );
  } else {
    bullets.push('Your brand appears in many AI responses; fine-tuning can still improve rank and citations.');
  }

  if (visibilityPct != null && totalTests > 0) {
    bullets.push(
      `About ${visibilityPct}% of engine checks mentioned you (${totalMentions} of ${totalTests} results).`,
    );
  } else if (totalTests > 0) {
    bullets.push(`${totalMentions} of ${totalTests} AI checks mentioned your brand.`);
  }

  if (weakEngines.length > 0) {
    const labels = weakEngines.slice(0, 3).map((e) => getAIEngineLabel(e));
    const extra = weakEngines.length > 3 ? ` and ${weakEngines.length - 3} more` : '';
    bullets.push(`No mentions on: ${labels.join(', ')}${extra}.`);
  }

  if (options.degraded) {
    bullets.push(
      'This run used fallbacks for some providers; rescan for the most accurate picture.',
    );
  }

  return { bullets: bullets.slice(0, 4) };
}
