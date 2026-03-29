import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicScoreSummary, type PublicEngineResult } from '@/lib/public-score';
import { ScoreRing } from '@/components/ui/score-ring';
import { ScoreBandBadge } from '@/components/ui/score-band-badge';
import { EffortBadge } from '@/components/ui/effort-badge';
import { ImpactBadge } from '@/components/ui/impact-badge';
import {
  ChatGPTIcon,
  PerplexityIcon,
  GeminiIcon,
  ClaudeIcon,
  getAiEngineBrandHex,
} from '@/components/ui/ai-icons';
import { MiniGauge, EngineRing, PillarBar, AnimatedNumber } from './score-visuals';
import type { EffortBand } from '@/types/score';

interface ScorePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ScorePageProps): Promise<Metadata> {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    return { title: 'Score Not Found | airadr' };
  }

  return {
    title: `${summary.domain} scored ${summary.percentage} on airadr`,
    description: `${summary.domain} is currently rated ${summary.bandInfo.label} for AI search visibility.`,
    openGraph: {
      title: `${summary.domain} scored ${summary.percentage} on airadr`,
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
  if (status !== 'complete') return { label: '--', hex: '#71717a' };
  if (mentioned === 0) return { label: 'Not Found', hex: '#ff5252' };
  const ratio = total > 0 ? mentioned / total : 0;
  if (ratio >= 0.75) return { label: 'Strong', hex: '#25c972' };
  if (ratio >= 0.5) return { label: 'Moderate', hex: '#ff8a1e' };
  return { label: 'Low Visibility', hex: '#ff5252' };
}

const engineIcons: Record<string, React.FC<{ className?: string }>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
};

function sentimentLabel(sentiment: string) {
  if (sentiment === 'positive') return { text: 'Positive', color: '#25c972' };
  if (sentiment === 'negative') return { text: 'Negative', color: '#ff5252' };
  if (sentiment === 'neutral') return { text: 'Neutral', color: '#ff8a1e' };
  if (sentiment === 'mixed') return { text: 'Mixed', color: '#ff8a1e' };
  return null;
}

export default async function PublicScorePage({ params }: ScorePageProps) {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    notFound();
  }

  const isRed = summary.percentage < 60;
  const isOrange = summary.percentage >= 60 && summary.percentage < 80;

  const heroMessage = isRed
    ? 'This site is invisible to AI search. Competitors are being recommended instead.'
    : isOrange
      ? 'This site has partial AI visibility. There are gaps competitors are exploiting.'
      : 'This site has strong AI visibility. Track it to maintain the lead.';

  const primaryCtaText = isRed ? 'Fix My AI Visibility' : isOrange ? 'Close the Gap' : 'Track My Score';

  const AI_TRAFFIC_BASELINE = 500;
  const showMissedTraffic = summary.mentionRate !== null && summary.mentionRate < 0.7;
  const estimatedMissedVisitors = showMissedTraffic
    ? Math.round((1 - summary.mentionRate!) * AI_TRAFFIC_BASELINE)
    : 0;

  const weakEngines = summary.engines.filter((e) => {
    if (e.status !== 'complete') return false;
    if (e.mentioned === 0) return true;
    const ratio = e.total > 0 ? e.mentioned / e.total : 0;
    return ratio < 0.5;
  });
  const showMidCta = weakEngines.length > 0;
  const weakEngineNames = weakEngines.map((e) => e.label).slice(0, 2).join(' and ');

  const metrics = [
    { label: 'Overall Score', value: summary.percentage, color: scoreColor(summary.percentage) },
    { label: 'AI Visibility', value: summary.aiVisibility, color: scoreColor(summary.aiVisibility) },
    { label: 'Web Health', value: summary.webHealth, color: scoreColor(summary.webHealth) },
    { label: 'AI Mentions', value: summary.mentionScore, color: scoreColor(summary.mentionScore) },
  ];

  const hasEngines = summary.engines.some((e) => e.status === 'complete');
  const hasPillars = summary.pillars.length > 0;

  const bandAccent = isRed ? '#ff5252' : isOrange ? '#ff8a1e' : '#25c972';

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact min-h-screen max-w-5xl space-y-6 py-10">

      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center">
        <ScoreRing
          score={summary.percentage}
          color={summary.bandInfo.color}
          size={200}
          emphasis="hero"
        />
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          {summary.domain}
        </h1>
        <ScoreBandBadge label={summary.bandInfo.label} color={summary.bandInfo.color} compact className="mt-3" />
        <p
          className="mt-3 max-w-lg text-[15px] font-medium leading-relaxed"
          style={{ color: isRed ? '#ff5252' : isOrange ? '#ff8a1e' : 'var(--text-secondary)' }}
        >
          {heroMessage}
        </p>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          Scanned {new Date(summary.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="aiso-button aiso-button-primary rounded-full px-8 py-3 text-sm font-semibold">
            {primaryCtaText}
          </Link>
          <Link href="/leaderboard" className="aiso-button aiso-button-secondary rounded-full px-8 py-3 text-sm font-semibold">
            View Leaderboard
          </Link>
        </div>
      </div>

      {/* ── Thin accent divider ── */}
      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${bandAccent}44, transparent)` }} />

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            {m.value !== null ? (
              <MiniGauge value={m.value} color={m.color} size={40} />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ border: '3px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>--</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: m.color }}>
                {m.value !== null ? <AnimatedNumber value={m.value} suffix={m.label === 'AI Mentions' ? '%' : ''} /> : '--'}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Estimated Missed Traffic ── */}
      {showMissedTraffic && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-2" style={{ background: 'rgba(255, 82, 82, 0.06)', border: '1px solid rgba(255, 82, 82, 0.12)' }}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'rgba(255, 82, 82, 0.15)' }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L2 18h16L10 2z" stroke="#ff5252" strokeWidth="2" strokeLinejoin="round" fill="none" />
                <path d="M10 8v4M10 14.5v.5" stroke="#ff5252" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Est. <strong className="tabular-nums" style={{ color: '#ff5252' }}><AnimatedNumber value={estimatedMissedVisitors} /></strong> AI visitors/mo going to competitors
            </p>
          </div>
        </div>
      )}

      {/* ── Site Health Breakdown ── */}
      {hasPillars && (
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Site Health Breakdown
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Individual pillar scores that contribute to the overall rating.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summary.pillars.map((p) => {
              const pColor = scoreColor(p.percentage);
              const pVal = p.percentage ?? 0;
              return (
                <div
                  key={p.key}
                  className="flex flex-col items-center rounded-xl border px-4 py-5"
                  style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
                >
                  <EngineRing ratio={pVal} color={pColor} size={72} />
                  <p className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {p.label}
                  </p>
                  <span
                    className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${pColor}14`, color: pColor, border: `1px solid ${pColor}22` }}
                  >
                    {pVal >= 80 ? 'Strong' : pVal >= 60 ? 'Moderate' : pVal >= 40 ? 'Needs Work' : 'At Risk'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Engine Breakdown ── */}
      {hasEngines && (
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Engine Breakdown
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            How often AI platforms surface this brand in representative queries.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.engines.map((engine: PublicEngineResult) => {
              const verdict = getVerdictInfo(engine.mentioned, engine.total, engine.status);
              const Icon = engineIcons[engine.engine];
              const brandHex = getAiEngineBrandHex(engine.engine);
              const ratio = engine.total > 0 ? Math.round((engine.mentioned / engine.total) * 100) : 0;
              const sent = engine.sentiment && engine.sentiment !== 'not-found' ? sentimentLabel(engine.sentiment) : null;

              return (
                <div
                  key={engine.engine}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: `${brandHex}26`,
                    background: 'rgba(255,255,255,0.015)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: `${brandHex}22`,
                        border: `1px solid ${brandHex}40`,
                      }}
                    >
                      {Icon && (
                        <span className="inline-flex" style={{ color: brandHex }}>
                          <Icon className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {engine.label}
                    </span>
                  </div>

                  {engine.status === 'complete' ? (
                    <div className="mt-3 flex items-center justify-center">
                      <EngineRing ratio={ratio} color={brandHex} size={64} />
                    </div>
                  ) : (
                    <div className="mt-3 flex h-16 items-center justify-center">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {engine.status === 'not_backfilled' ? 'Not tested yet' : 'Not configured'}
                      </span>
                    </div>
                  )}

                  <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {engine.status === 'complete' ? `${ratio}% mention rate across tests` : '\u00A0'}
                  </p>

                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${verdict.hex}14`, color: verdict.hex, border: `1px solid ${verdict.hex}22` }}
                    >
                      {verdict.label}
                    </span>
                    {sent && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ color: sent.color, backgroundColor: `${sent.color}10` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sent.color }} />
                        {sent.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mid-Page CTA ── */}
      {showMidCta && (
        <div className="rounded-xl px-6 py-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(255, 82, 82, 0.05) 0%, rgba(255, 138, 30, 0.04) 100%)', border: '1px solid rgba(255, 138, 30, 0.1)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {weakEngineNames} {weakEngines.length === 1 ? 'is' : 'are'} not recommending your business.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
            Get a full fix plan to start appearing in AI search results.
          </p>
          <Link href="/" className="aiso-button aiso-button-primary mt-4 inline-flex rounded-full px-8 py-2.5 text-sm font-semibold">
            Start Improving My Score
          </Link>
        </div>
      )}

      {/* ── Priority Fixes ── */}
      {summary.topFixes.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Priority Fixes
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            The highest-impact improvements to boost your AI visibility.
          </p>
          <div className="mt-4 space-y-3">
            {summary.topFixes.slice(0, 3).map((fix, index) => {
              const accentColors = ['#2455dc', '#ff8a1e', '#25c972'];
              const accent = accentColors[index] || accentColors[0];

              return (
                <div
                  key={`fix-${index}`}
                  className="relative overflow-hidden rounded-xl border p-4"
                  style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
                >
                  <div className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full" style={{ backgroundColor: accent }} />
                  <div className="flex items-start gap-3 pl-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fix.label}</p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        {fix.instruction}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <EffortBadge effortBand={fix.effortBand as EffortBand} />
                        <ImpactBadge value={fix.estimatedLift} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Locked fixes teaser */}
          {summary.totalFixCount > 3 && (
            <div className="mt-4 flex flex-col items-center gap-2 py-3 text-center">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Showing 3 of <strong style={{ color: 'var(--text-primary)' }}>{summary.totalFixCount} issues</strong> found.
                Unlock the full fix plan with a complete audit.
              </p>
              <Link href="/" className="aiso-button aiso-button-secondary mt-1 inline-flex rounded-full px-6 py-2 text-sm font-semibold">
                Unlock Full Report
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Thin accent divider ── */}
      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${bandAccent}44, transparent)` }} />

      {/* ── CTA Footer ── */}
      <div className="flex flex-col items-center py-4 text-center">
        <h2 className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          {isRed
            ? "Your competitors are being recommended by AI. You're not."
            : isOrange
              ? 'Close the visibility gap before competitors pull ahead.'
              : 'Maintain your AI visibility lead.'}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {isRed
            ? "Every week this score stays below 60, your competitors are being recommended by AI while you're not."
            : isOrange
              ? 'Run a full airadr audit to identify and close the gaps in your AI search presence.'
              : 'Run a full airadr audit to monitor changes and keep your AI visibility strong.'}
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Sites that fix their top 3 issues see an average score improvement of <strong style={{ color: '#ff8a1e' }}>19 points</strong>.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="aiso-button aiso-button-primary rounded-full px-10 py-3 text-sm font-semibold">
            {primaryCtaText}
          </Link>
          <Link href="/leaderboard" className="aiso-button aiso-button-secondary rounded-full px-10 py-3 text-sm font-semibold">
            View Leaderboard
          </Link>
        </div>
        <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          Powered by airadr &mdash; AI Search Optimization
        </p>
      </div>
    </div>
  );
}
