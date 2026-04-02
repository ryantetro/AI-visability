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
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <img src={getFaviconUrl(domain, 32)} alt="" className="h-5 w-5 rounded-sm" />
        <span className="text-sm font-semibold text-gray-900">{domain}</span>
        {expandedSite.latestPaidScan && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
            Active
          </span>
        )}
        {lastScanned && (
          <span className="text-[11px] text-gray-500">Last scanned {lastScanned}</span>
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Visit site
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        {onAddDomain && (
          <button
            type="button"
            onClick={onAddDomain}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Add domain
          </button>
        )}
      </div>
    </header>
  );
}
