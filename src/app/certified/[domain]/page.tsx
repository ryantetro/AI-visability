import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, BadgeCheck, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { getCertifiedSummary } from '@/lib/public-proof';
import { ScoreResult } from '@/types/score';
import { ScoreRing } from '@/components/ui/score-ring';
import { ScoreStrip } from '@/components/ui/score-strip';
import { CheckRow } from '@/components/ui/check-row';

interface CertifiedPageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: CertifiedPageProps) {
  const { domain } = await params;
  const certified = await getCertifiedSummary(decodeURIComponent(domain));

  if (!certified) {
    return {
      title: 'Certified Score Not Found | airadr',
    };
  }

  return {
    title: `${certified.summary.domain} Certified Score | airadr`,
    description: `${certified.summary.domain} is publicly verified on airadr with an overall score of ${certified.summary.percentage}.`,
  };
}

export default async function CertifiedDomainPage({ params }: CertifiedPageProps) {
  const { domain } = await params;
  const certified = await getCertifiedSummary(decodeURIComponent(domain));

  if (!certified) {
    notFound();
  }

  const scoreResult = certified.scoreResult as ScoreResult;
  const webHealth = scoreResult.webHealth;

  return (
    <div className="aiso-page app-page aiso-shell py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="aiso-card overflow-hidden p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-500)]/20 bg-[var(--color-primary-500)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-200)]">
                <BadgeCheck className="h-4 w-4" />
                Verified Public Report
              </div>
              <h1 className="app-h1 mt-5 font-bold text-[var(--text-primary)]">
                {certified.summary.domain}
              </h1>
              <p className="app-body app-measure mt-4 text-[var(--text-secondary)]">
                This domain verified ownership and opted into airadr public proof. The score below reflects the latest completed scan using the AI-first scoring model.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={certified.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aiso-button aiso-button-primary px-5 py-3 text-sm"
                >
                  Visit {certified.summary.domain}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <Link href={`/score/${certified.summary.id}`} className="aiso-button aiso-button-secondary px-5 py-3 text-sm">
                  Open compact score card
                </Link>
              </div>
            </div>

            <div className="aiso-card-soft p-8 text-center">
              <ScoreRing
                score={certified.summary.percentage}
                color={certified.summary.bandInfo.color}
                size={220}
                label="Overall Score"
                caption={certified.summary.bandInfo.label}
                emphasis="hero"
              />
            </div>
          </div>

          <div className="mt-8">
            <ScoreStrip
              items={[
                {
                  label: 'Overall',
                  score: certified.summary.percentage,
                  caption: certified.summary.bandInfo.label,
                  color: certified.summary.bandInfo.color,
                },
                {
                  label: 'AI Visibility',
                  score: certified.summary.aiVisibility,
                  caption: 'Pre-unlock hero score',
                },
                {
                  label: 'Web Health',
                  score: certified.summary.webHealth,
                  caption: webHealth?.status === 'complete' ? 'Quality + speed + security' : 'Pending or unavailable',
                },
              ]}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="aiso-card p-6">
            <p className="aiso-kicker">AI Visibility breakdown</p>
            <div className="mt-6 space-y-3">
              {scoreResult.dimensions.map((dimension) => (
                <div key={dimension.key} className="aiso-card-soft p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{dimension.label}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {dimension.score}/{dimension.maxScore} points
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{dimension.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="aiso-card p-6">
            <p className="aiso-kicker">Public proof notes</p>
            <div className="mt-6 space-y-4">
              <div className="aiso-card-soft p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--color-success)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Domain verification complete</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Verified via {certified.profile.verified ? 'live token detection' : 'pending review'}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="aiso-card-soft p-4">
                <div className="flex items-center gap-3">
                  <Globe2 className="h-5 w-5 text-[var(--color-primary-300)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Public badge eligibility</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Badge publishing is {certified.profile.badgeEnabled ? 'enabled' : 'disabled'} for this domain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="aiso-card-soft p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[var(--color-warning)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Leaderboard status</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {certified.profile.leaderboardEnabled ? 'Included in leaderboard rankings.' : 'Not currently opted into leaderboard rankings.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {webHealth ? (
          <section className="mt-8 aiso-card p-6">
            <p className="aiso-kicker">Web Health</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {webHealth.pillars.map((pillar) => (
                <div key={pillar.key} className="aiso-card-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{pillar.label}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {pillar.score}/{pillar.maxScore} points
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {pillar.percentage ?? '--'}%
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pillar.checks.slice(0, 3).map((check) => (
                      <CheckRow
                        key={check.id}
                        title={check.label}
                        points={`${check.points}/${check.maxPoints}`}
                        status={check.verdict}
                        detail={check.detail}
                        actualValue={check.detail}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
