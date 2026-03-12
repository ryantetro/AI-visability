import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicScoreSummary } from '@/lib/public-score';

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
    title: `${summary.domain} scored ${summary.percentage}/100 on AISO`,
    description: `${summary.domain} is currently rated ${summary.bandInfo.label} for AI visibility.`,
    openGraph: {
      title: `${summary.domain} scored ${summary.percentage}/100 on AISO`,
      description: `${summary.domain} is currently rated ${summary.bandInfo.label} for AI visibility.`,
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
        <p className="aiso-kicker">
          Public Score Card
        </p>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="app-h1 font-bold" style={{ color: 'var(--text-primary)' }}>
              {summary.domain}
            </h1>
            <p className="app-body app-measure mt-3 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              This site currently scores {summary.percentage}/100 for AI visibility and falls into the {summary.bandInfo.label} band.
            </p>
            <p className="mt-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Scan completed on {new Date(summary.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
            <div className="mt-8">
              <Link
                href="/"
                className="aiso-button aiso-button-primary px-6 py-3 text-sm"
              >
                Run Your Own Audit
              </Link>
            </div>
          </div>
          <div className="aiso-card-soft p-8 text-center" style={{ borderRadius: '1.75rem' }}>
            <div
              className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border-[12px]"
              style={{ borderColor: `${summary.bandInfo.color}33` }}
            >
              <div
                className="flex h-32 w-32 items-center justify-center rounded-full text-5xl font-bold text-white"
                style={{ backgroundColor: summary.bandInfo.color, boxShadow: `0 18px 36px ${summary.bandInfo.color}33` }}
              >
                {summary.percentage}
              </div>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--text-muted)' }}>
              AI Visibility Score
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {summary.bandInfo.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
