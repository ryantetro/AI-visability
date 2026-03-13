'use client';

import Link from 'next/link';
import { BarChart3, Clock3, Diamond, Share2, Star, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppSection = 'analysis' | 'history' | 'leaderboard' | 'advanced';

const navItems: { key: AppSection; label: string; href: string; icon: typeof BarChart3 }[] = [
  { key: 'analysis', label: 'Analysis', href: '/analysis', icon: BarChart3 },
  { key: 'history', label: 'History', href: '/history', icon: Clock3 },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { key: 'advanced', label: 'Advanced', href: '/advanced', icon: Diamond },
];

function AisoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <path
        d="M16 3 A13 13 0 0 1 27.3 18.5"
        fill="none"
        stroke="#356df4"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M27.3 18.5 A13 13 0 0 1 4.7 18.5"
        fill="none"
        stroke="#25c972"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M4.7 18.5 A13 13 0 0 1 16 3"
        fill="none"
        stroke="#16b7ca"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface AppShellNavProps {
  active: AppSection;
  actionHref?: string;
  actionLabel?: string;
  showShare?: boolean;
  onShare?: () => void;
  onClearView?: () => void;
}

export function AppShellNav({
  active,
  actionHref = '/analysis',
  actionLabel = 'New scan',
  showShare = false,
  onShare,
  onClearView,
}: AppShellNavProps) {
  return (
    <header className="mb-8 w-full border-b border-white/[0.06] bg-transparent px-6 py-5 sm:px-8">
      <div className="mx-auto flex min-h-[60px] max-w-[1120px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-h-[60px] min-w-0 items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3.5 text-[15px] font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-90"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
              <AisoLogo className="h-10 w-10" />
            </span>
            <span className="tracking-tight">AISO</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <nav className="flex items-center gap-1 sm:gap-2" role="navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 rounded-lg px-4 py-3 text-[13px] font-medium transition-colors duration-150 sm:px-5',
                    isActive
                      ? 'text-[#25c972]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'opacity-100' : 'opacity-70')} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-[#25c972]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 border-l border-white/[0.08] pl-6 sm:gap-5 sm:pl-8">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-lg border border-[#25c972]/50 bg-transparent px-4 py-2.5 text-[13px] font-medium text-[#25c972] transition-colors hover:border-[#25c972] hover:bg-[#25c972]/10"
            >
              <Star className="h-4 w-4" />
              Get featured
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-medium text-[var(--text-secondary)] ring-1 ring-white/[0.02] transition-colors hover:bg-white/[0.08]"
              >
                RT
              </button>
              <span className="hidden text-[14px] font-medium text-[var(--text-primary)] sm:inline">
                Ryan Tetro
              </span>
            </div>
            {showShare ? (
              <>
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={onClearView}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                  Clear view
                </button>
              </>
            ) : (
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center rounded-lg bg-[#356df4] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(53,109,244,0.25)] transition-all hover:bg-[#4578f5] hover:shadow-[0_0_24px_rgba(53,109,244,0.35)]"
              >
                {actionLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
