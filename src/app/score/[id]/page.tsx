import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicScoreSummary } from '@/lib/public-score';
import { ScoreRing } from '@/components/ui/score-ring';

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

export default async function PublicScorePage({ params }: ScorePageProps) {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    notFound();
  }

  const qualityPillar = summary.pillars.find((p) => p.key === 'quality');
  const securityPillar = summary.pillars.find((p) => p.key === 'security');
  const perfPillar = summary.pillars.find((p) => p.key === 'performance');

  // Build action items based on data
  const actions: { title: string; description: string }[] = [];
  if (summary.mentionScore !== null && summary.mentionScore < 50) {
    const visibleEngines = summary.engines.filter((e) => e.status === 'complete' && e.mentioned > 0).length;
    actions.push({
      title: 'Increase AI visibility',
      description: `Only visible on ${visibleEngines}/4 AI engines. Add structured data (JSON-LD), create an llms.txt file, and ensure your brand appears in relevant industry content.`,
    });
  }
  if (summary.topFixes.length > 0) {
    const topFix = summary.topFixes[0];
    actions.push({
      title: topFix.label,
      description: `${topFix.instruction} (+${topFix.estimatedLift} pts, ${topFix.effortBand} effort)`,
    });
  }
  if (qualityPillar?.percentage !== null && qualityPillar?.percentage !== undefined && qualityPillar.percentage < 70) {
    actions.push({
      title: 'Fix website quality issues',
      description: 'Improve meta tags, Open Graph coverage, heading structure, and favicon to boost your site quality score.',
    });
  }
  if (summary.percentage < 60) {
    actions.push({
      title: 'Run a full audit to get your fix plan',
      description: 'Sign up for a full AISO audit to get generated fix files, copy-paste prompts for AI tools, and a prioritized repair queue.',
    });
  }

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact min-h-screen max-w-5xl py-10">
      {/* ─── Hero Section ─── */}
      <div className="aiso-card w-full p-8 sm:p-10">
        <p className="aiso-kicker">Public Score Card</p>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="app-h1 font-bold" style={{ color: 'var(--text-primary)' }}>
              {summary.domain}
            </h1>
            <p className="app-body app-measure mt-3 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              This site scores <strong>{summary.percentage}</strong> overall on AISO and is rated <strong>{summary.bandInfo.label}</strong> for AI search visibility.
            </p>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Scan completed on {new Date(summary.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>

            {/* Supporting score pills */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="aiso-card-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">AI Visibility</p>
                <p className="mt-2 font-display text-2xl font-semibold" style={{ color: scoreColor(summary.aiVisibility) }}>
                  {summary.aiVisibility}
                </p>
              </div>
              <div className="aiso-card-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Web Health</p>
                <p className="mt-2 font-display text-2xl font-semibold" style={{ color: scoreColor(summary.webHealth) }}>
                  {summary.webHealth ?? '--'}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="aiso-button aiso-button-primary px-6 py-3 text-sm"
              >
                Run Your Own Audit
              </Link>
              <Link
                href="/leaderboard"
                className="aiso-button aiso-button-secondary px-6 py-3 text-sm"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
          <div className="aiso-card-soft p-8 text-center" style={{ borderRadius: '1.75rem' }}>
            <ScoreRing
              score={summary.percentage}
              color={summary.bandInfo.color}
              size={220}
              emphasis="hero"
              label="Overall Score"
              caption={summary.bandInfo.label}
            />
          </div>
        </div>
      </div>

      {/* ─── Supporting Gauges ─── */}
      {(qualityPillar || securityPillar || perfPillar || summary.mentionScore !== null) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Website Quality', score: qualityPillar?.percentage ?? null },
            { label: 'Trust & Security', score: securityPillar?.percentage ?? null },
            { label: 'PageSpeed', score: perfPillar?.percentage ?? null },
            { label: 'AI Mentions', score: summary.mentionScore },
          ].map((pillar) => (
            <div key={pillar.label} className="aiso-card flex flex-col items-center p-5 text-center">
              {pillar.score !== null ? (
                <ScoreRing
                  score={pillar.score}
                  color={scoreColor(pillar.score)}
                  size={80}
                  emphasis="compact"
                />
              ) : (
                <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-[8px] border-white/[0.06]">
                  <span className="text-lg font-semibold text-zinc-500">--</span>
                </div>
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                {pillar.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ─── AI Engine Breakdown ─── */}
      {summary.engines.some((e) => e.status === 'complete') && (
        <div className="aiso-card mt-6 p-6 sm:p-8">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Engine Breakdown
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            How often AI platforms mention this site when asked relevant prompts.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {summary.engines.map((engine) => {
              const verdict = getVerdictInfo(engine.mentioned, engine.total, engine.status);
              return (
                <div
                  key={engine.engine}
                  className={`flex items-center justify-between rounded-lg border p-4 ${verdict.border} ${verdict.bg} bg-opacity-50`}
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{engine.label}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {engine.status === 'complete'
                        ? `${engine.mentioned}/${engine.total} prompts mentioned${engine.sentiment !== 'not-found' ? ` \u00B7 ${engine.sentiment}` : ''}`
                        : engine.status === 'not_backfilled'
                          ? 'Not tested on this scan yet'
                          : 'Not configured'}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${verdict.color} ${verdict.bg}`}>
                    {verdict.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Take Action Section ─── */}
      {actions.length > 0 && (
        <div className="mt-6 rounded-xl border border-[var(--accent-primary,#3b82f6)]/20 p-6 sm:p-8" style={{ backgroundColor: 'rgba(59,130,246,0.03)' }}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}>
              <svg className="h-4 w-4" style={{ color: 'var(--accent-primary, #3b82f6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Take Action
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {summary.percentage >= 80
                  ? 'Great score! Keep optimizing with these steps.'
                  : summary.percentage >= 60
                    ? 'Good start. Follow these steps to improve.'
                    : 'Your site needs attention. Here\'s where to start.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {actions.slice(0, 4).map((action, index) => (
              <div
                key={`action-${index}`}
                className="aiso-card-soft flex items-start gap-4 p-4"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{action.title}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{action.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Link
              href="/"
              className="aiso-button aiso-button-primary px-6 py-3 text-sm"
            >
              Get Your Full Fix Plan
            </Link>
          </div>
        </div>
      )}

      {/* ─── Top Fixes Preview ─── */}
      {summary.topFixes.length > 1 && (
        <div className="aiso-card mt-6 p-6 sm:p-8">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Top Priority Fixes
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            The highest-impact improvements for this site.
          </p>
          <div className="mt-4 space-y-3">
            {summary.topFixes.map((fix, index) => (
              <div
                key={`fix-${index}`}
                className="flex items-start gap-3 rounded-lg border border-white/[0.06] p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: 'rgba(255,82,82,0.15)', color: '#ff5252' }}>
                  !
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fix.label}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {fix.instruction}
                  </p>
                  <div className="mt-2 flex gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>+{fix.estimatedLift} pts</span>
                    <span>{fix.effortBand} effort</span>
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
          <Link
            href="/"
            className="aiso-button aiso-button-primary px-8 py-3 text-sm"
          >
            Run Your Own Audit
          </Link>
          <Link
            href="/leaderboard"
            className="aiso-button aiso-button-secondary px-8 py-3 text-sm"
          >
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
