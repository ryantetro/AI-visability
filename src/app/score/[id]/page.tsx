import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicScoreSummary, type PublicEngineResult } from '@/lib/public-score';
import { ScoreRing } from '@/components/ui/score-ring';
import { ScoreBandBadge } from '@/components/ui/score-band-badge';
import { EffortBadge } from '@/components/ui/effort-badge';
import { ImpactBadge } from '@/components/ui/impact-badge';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon } from '@/components/ui/ai-icons';
import type { EffortBand } from '@/types/score';

interface ScorePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ScorePageProps): Promise<Metadata> {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    return {
      title: 'Score Not Found | AISO',
    };
  }

  return {
    title: `${summary.domain} scored ${summary.percentage} on AISO`,
    description: `${summary.domain} is currently rated ${summary.bandInfo.label} for AI search visibility.`,
    openGraph: {
      title: `${summary.domain} scored ${summary.percentage} on AISO`,
      description: `${summary.domain} is currently rated ${summary.bandInfo.label} for AI search visibility.`,
      images: [{ url: `/score/${id}/opengraph-image` }],
    },
  };
}

function scoreColor(score: number | null): string {
  if (score === null) return '#ff8a1e';
  if (score >= 80) return '#25c972';
  if (score >= 60) return '#ff8a1e';
  return '#ff5252';
}

function getVerdictInfo(mentioned: number, total: number, status: string) {
  if (status !== 'complete') return { label: '--', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' };
  if (mentioned === 0) return { label: 'FAIL', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  const ratio = total > 0 ? mentioned / total : 0;
  if (ratio >= 0.5) return { label: 'STRONG PASS', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (ratio >= 0.25) return { label: 'PASS', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  return { label: 'LOW PASS', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
}

const engineIcons: Record<string, React.FC<{ className?: string }>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
};

function sentimentDot(sentiment: string) {
  if (sentiment === 'positive') return '#25c972';
  if (sentiment === 'negative') return '#ff5252';
  if (sentiment === 'neutral' || sentiment === 'mixed') return '#ff8a1e';
  return 'transparent';
}

export default async function PublicScorePage({ params }: ScorePageProps) {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    notFound();
  }

  const mentionPct = summary.mentionScore !== null ? `${summary.mentionScore}%` : '--';

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact min-h-screen max-w-5xl py-10">
      {/* ─── Hero Section ─── */}
      <div className="aiso-card w-full p-8 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <ScoreRing
            score={summary.percentage}
            color={summary.bandInfo.color}
            size={200}
            emphasis="hero"
            label="Overall Score"
          />
          <h1 className="app-h1 mt-5 font-bold" style={{ color: 'var(--text-primary)' }}>
            {summary.domain}
          </h1>
          <ScoreBandBadge label={summary.bandInfo.label} color={summary.bandInfo.color} compact className="mt-3" />
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Rated <strong>{summary.bandInfo.label}</strong> for AI search visibility
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Scanned {new Date(summary.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="aiso-button aiso-button-primary px-6 py-3 text-sm">
              Run Your Own Audit
            </Link>
            <Link href="/leaderboard" className="aiso-button aiso-button-secondary px-6 py-3 text-sm">
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Key Metrics Row ─── */}
      <div className="aiso-card mt-6 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Overall Score', value: summary.percentage, color: scoreColor(summary.percentage) },
            { label: 'AI Visibility', value: summary.aiVisibility, color: scoreColor(summary.aiVisibility) },
            { label: 'Web Health', value: summary.webHealth, color: scoreColor(summary.webHealth) },
            { label: 'AI Mentions', value: mentionPct, color: scoreColor(summary.mentionScore) },
          ].map((metric) => (
            <div key={metric.label} className="flex items-center gap-3 px-2 py-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              <div>
                <p className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {metric.value ?? '--'}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  {metric.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── AI Engine Breakdown ─── */}
      {summary.engines.some((e) => e.status === 'complete') && (
        <div className="aiso-card mt-6 p-6 sm:p-8">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Engine Breakdown
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            How often AI platforms mention this site when asked relevant prompts.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.engines.map((engine: PublicEngineResult) => {
              const verdict = getVerdictInfo(engine.mentioned, engine.total, engine.status);
              const Icon = engineIcons[engine.engine];
              const ratio = engine.total > 0 ? (engine.mentioned / engine.total) * 100 : 0;
              return (
                <div
                  key={engine.engine}
                  className="flex flex-col rounded-lg border p-4"
                  style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="size-4" />}
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {engine.label}
                    </span>
                    {engine.sentiment && engine.sentiment !== 'not-found' && (
                      <span
                        className="ml-auto h-2 w-2 rounded-full"
                        style={{ backgroundColor: sentimentDot(engine.sentiment) }}
                        title={engine.sentiment}
                      />
                    )}
                  </div>

                  <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {engine.status === 'complete'
                      ? `${engine.mentioned}/${engine.total} prompts`
                      : engine.status === 'not_backfilled'
                        ? 'Not tested yet'
                        : 'Not configured'}
                  </p>

                  {/* Mini progress bar */}
                  {engine.status === 'complete' && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(ratio, 2)}%`,
                          backgroundColor: verdict.label === 'FAIL' ? '#ff5252' : verdict.label === 'LOW PASS' ? '#ff8a1e' : '#25c972',
                        }}
                      />
                    </div>
                  )}

                  <span className={`mt-2 inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${verdict.color} ${verdict.bg}`}>
                    {verdict.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Priority Fixes ─── */}
      {summary.topFixes.length > 0 && (
        <div className="aiso-card mt-6 p-6 sm:p-8">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Priority Fixes
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            The highest-impact improvements for this site.
          </p>
          <div className="mt-4 space-y-3">
            {summary.topFixes.slice(0, 3).map((fix, index) => (
              <div
                key={`fix-${index}`}
                className="flex items-start gap-4 rounded-lg border border-white/[0.06] p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fix.label}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    {fix.instruction}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <EffortBadge effortBand={fix.effortBand as EffortBand} />
                    <ImpactBadge value={fix.estimatedLift} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CTA Footer ─── */}
      <div className="aiso-card mt-6 p-6 text-center sm:p-8">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Want to improve this score?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
          Run a full AISO audit to get AI-generated fix files, copy-paste prompts for ChatGPT and Claude, and a prioritized action plan.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="aiso-button aiso-button-primary px-8 py-3 text-sm">
            Run Your Own Audit
          </Link>
          <Link href="/leaderboard" className="aiso-button aiso-button-secondary px-8 py-3 text-sm">
            View Leaderboard
          </Link>
        </div>
        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          Powered by AISO &mdash; AI Search Optimization
        </p>
      </div>
    </div>
  );
}
