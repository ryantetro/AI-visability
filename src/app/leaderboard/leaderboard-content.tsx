'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Medal, Trophy } from 'lucide-react';
import { getFaviconUrl } from '@/lib/url-utils';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  domain: string;
  url: string;
  overall: number;
  speed: number;
  quality: number;
  security: number;
  completedAt?: number;
  hasCertified?: boolean;
}

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (mins < 60) return mins <= 1 ? '1 min ago' : `${mins} mins ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

type TimeFilter = '24h' | '30d' | 'all';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-[#25c972]';
  if (score >= 60) return 'text-[#ffbb00]';
  if (score >= 40) return 'text-[#ff8a1e]';
  return 'text-[#ff5252]';
}

export function LeaderboardContent({ entries }: { entries: LeaderboardEntry[] }) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  return (
    <div className="mt-8">
      <div className="mb-4 flex justify-center">
        <div className="inline-flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
          {(['24h', '30d', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimeFilter(key)}
              className={cn(
                'rounded-md px-4 py-2 text-[13px] font-medium transition-colors',
                timeFilter === key
                  ? 'bg-[#25c972] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {key === '24h' ? 'Last 24h' : key === '30d' ? 'Last 30d' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '37%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] sm:px-4 sm:py-4">
                #
              </th>
              <th className="min-w-0 px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] sm:px-4 sm:py-4">
                Site
              </th>
              <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] sm:px-4 sm:py-4">
                Overall
              </th>
              <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] sm:px-4 sm:py-4">
                Scores
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] sm:px-4 sm:py-4">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.domain}
                className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-2 py-3 sm:px-4 sm:py-4">
                  <div className="flex items-center gap-2">
                    {entry.rank <= 3 ? (
                      <Medal
                        className={cn(
                          'h-5 w-5',
                          entry.rank === 1 && 'text-amber-400',
                          entry.rank === 2 && 'text-zinc-300',
                          entry.rank === 3 && 'text-amber-600'
                        )}
                      />
                    ) : null}
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {entry.rank}
                    </span>
                  </div>
                </td>
                <td className="min-w-0 px-2 py-3 sm:px-4 sm:py-4">
                  <Link
                    href={entry.hasCertified ? `/certified/${encodeURIComponent(entry.domain)}` : entry.url}
                    target={entry.hasCertified ? undefined : '_blank'}
                    rel={entry.hasCertified ? undefined : 'noreferrer'}
                    className="group flex items-center gap-3"
                  >
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                      <img
                        src={getFaviconUrl(entry.domain, 32)}
                        alt=""
                        className="h-5 w-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) {
                            fallback.classList.remove('hidden');
                            fallback.classList.add('flex');
                          }
                        }}
                      />
                      <span className="hidden h-5 w-5 items-center justify-center rounded bg-indigo-500/20 text-indigo-400">
                        <Trophy className="h-3 w-3" />
                      </span>
                    </span>
                    <div className="min-w-0 overflow-hidden">
                      <span className="inline-flex items-center gap-1.5 truncate text-sm font-semibold text-[var(--text-primary)] group-hover:underline">
                        {entry.domain}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </span>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{entry.url}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-2 py-3 sm:px-4 sm:py-4">
                  <span className="text-sm font-bold">
                    <span className={scoreColor(entry.overall)}>{entry.overall}</span>
                    <span className="text-[var(--text-primary)]">/100</span>
                  </span>
                </td>
                <td className="overflow-hidden px-2 py-3 sm:px-4 sm:py-4">
                  <span className="text-sm text-[var(--text-muted)]">
                    <span className="text-[#25c972]">•</span> Speed {entry.speed}
                    <span className="mx-1 text-[#25c972]">•</span> Quality {entry.quality}
                    <span className="mx-1 text-[#25c972]">•</span> Sec {entry.security}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-[var(--text-muted)] sm:px-4 sm:py-4">
                  {entry.completedAt ? formatRelativeDate(entry.completedAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
