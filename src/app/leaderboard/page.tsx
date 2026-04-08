import { listLeaderboardEntriesFiltered } from '@/lib/public-proof';

import { LeaderboardContent } from './leaderboard-content';

export const metadata = {
  title: 'Leaderboard | airadr',
  description: 'Track the top public reports. See how your site stacks up and explore what makes the leaders stand out.',
};

export default async function LeaderboardPage() {
  const entries = await listLeaderboardEntriesFiltered(100, 'all');
  const displayEntries = entries.map(({ rank, summary, profile }) => ({
    rank,
    domain: summary.domain,
    url: summary.url,
    overall: summary.percentage,
    aiVisibility: summary.aiVisibility,
    webHealth: summary.webHealth,
    mentionScore: summary.mentionScore,
    completedAt: summary.completedAt,
    hasCertified: profile.verified && profile.enabled,
  }));

  return (
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mt-6">
          <h1 className="text-center text-[2rem] font-bold tracking-tight text-[var(--text-primary)]">
            Leaderboard
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[15px] text-[var(--text-muted)]">
            Track the top 100 scanned sites. See how your site stacks up and explore what makes the leaders stand out.
          </p>

          <LeaderboardContent entries={displayEntries} />
        </section>

      </div>
  );
}
