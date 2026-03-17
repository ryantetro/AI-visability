'use client';

import { ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { getFaviconUrl } from '@/lib/url-utils';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '../lib/utils';
import type { SiteSummary } from '../lib/types';

interface DomainHeaderProps {
  domain: string;
  expandedSite: SiteSummary;
  reauditing: boolean;
  onReaudit: () => void;
  onAddDomain?: () => void;
}

export function DomainHeader({
  domain,
  expandedSite,
  reauditing,
  onReaudit,
  onAddDomain,
}: DomainHeaderProps) {
  const siteUrl = expandedSite.url;
  const lastScanned = expandedSite.lastTouchedAt
    ? formatRelativeTime(expandedSite.lastTouchedAt)
    : null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.96)_0%,rgba(6,6,7,0.98)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.024)]">
      <div className="flex items-center gap-3">
        <img src={getFaviconUrl(domain, 32)} alt="" className="h-5 w-5 rounded-sm" />
        <span className="text-sm font-semibold text-white">{domain}</span>
        {expandedSite.latestPaidScan && (
          <span className="rounded-full bg-[#25c972]/15 px-2 py-0.5 text-[10px] font-semibold text-[#25c972]">
            Active
          </span>
        )}
        {lastScanned && (
          <span className="text-[11px] text-zinc-500">Last scanned {lastScanned}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReaudit}
          disabled={reauditing}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', reauditing && 'animate-spin')} />
          {reauditing ? 'Scanning...' : 'Run scan'}
        </button>
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          Visit site
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        {onAddDomain && (
          <button
            type="button"
            onClick={onAddDomain}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add domain
          </button>
        )}
      </div>
    </header>
  );
}
