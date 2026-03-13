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

export default async function PublicScorePage({ params }: ScorePageProps) {
  const { id } = await params;
  const summary = await getPublicScoreSummary(id);

  if (!summary) {
    notFound();
  }

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact flex min-h-screen max-w-5xl items-center py-16">
      <div className="aiso-card w-full p-8 sm:p-10">
        <p className="aiso-kicker">Public Score Card</p>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="app-h1 font-bold" style={{ color: 'var(--text-primary)' }}>
              {summary.domain}
            </h1>
            <p className="app-body app-measure mt-3 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              This site currently scores {summary.percentage} overall on AISO. AI Visibility is {summary.aiVisibility} and Web Health is {summary.webHealth ?? 'pending'}.
            </p>
            <p className="mt-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Scan completed on {new Date(summary.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="aiso-card-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">AI Visibility</p>
                <p className="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{summary.aiVisibility}</p>
              </div>
              <div className="aiso-card-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Web Health</p>
                <p className="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{summary.webHealth ?? '--'}</p>
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
    </div>
  );
}
