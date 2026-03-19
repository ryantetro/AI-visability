import Link from 'next/link';
import {
  Flame,
  Gift,
  Send,
  Zap,
} from 'lucide-react';
import { listLeaderboardEntriesFiltered } from '@/lib/public-proof';

import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { LeaderboardContent } from './leaderboard-content';

export const metadata = {
  title: 'Leaderboard | AISO',
  description: 'Track the top public reports. See how your site stacks up and explore what makes the leaders stand out.',
};

const FEATURED_SPOTS = [
  {
    icon: Send,
    title: 'FeatureMessage',
    description: 'Write a message your future self will never forget',
  },
  {
    icon: Flame,
    title: 'HotUGC',
    description: 'AI platform for high-converting UGC video ads.',
  },
  {
    icon: Zap,
    title: 'Shack - C2C reboot',
    description: 'Marketplace: AI-native, human, local, authentic.',
  },
];

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

          <div className="mt-8">
            <div className="flex items-center justify-center gap-2 text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              <Gift className="h-4 w-4" />
              Buy Featured Spot
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {FEATURED_SPOTS.map(({ icon: Icon, title, description }) => (
                <Link
                  key={title}
                  href="/featured"
                  className="relative block overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.05]"
                >
                  <span className="absolute right-3 top-3 rounded bg-[#25c972]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#25c972]">
                    Featured
                  </span>
                  <Icon className="h-8 w-8 text-[var(--text-secondary)]" />
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">{description}</p>
                </Link>
              ))}
            </div>
            <Link
              href="/featured"
              className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-secondary)]"
            >
              <Gift className="h-4 w-4" />
              Buy your featured spot
            </Link>
          </div>

          <LeaderboardContent entries={displayEntries} />
        </section>

        <FloatingFeedback />
      </div>
  );
}
