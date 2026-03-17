'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Loader2, LogOut, Megaphone, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const PAGE_TITLES: Record<string, string> = {
  '/advanced': 'Dashboard',
  '/analysis': 'Analysis',
  '/history': 'History',
  '/leaderboard': 'Leaderboard',
  '/featured': 'Featured Spot',
};

const SECTION_TITLES: Record<string, string> = {
  brand: 'Brand',
  competitors: 'Competitors',
  settings: 'Settings',
};

function getPageTitle(pathname: string, section: string | null): string {
  if (pathname.startsWith('/advanced') && section && SECTION_TITLES[section]) {
    return SECTION_TITLES[section];
  }
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return 'Dashboard';
}

export function DashboardHeaderBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [usageData, setUsageData] = useState<{ plan: string; isPaid: boolean } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = getPageTitle(pathname, section);

  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch('/api/auth/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && active) setUsageData(d); })
      .catch(() => {});
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleUpgrade = async (plan: 'monthly' | 'lifetime') => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const session = await res.json();
      setDropdownOpen(false);
      router.push(session.url);
    } catch {
      setDropdownOpen(false);
      router.push('/analysis');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const planLabel = usageData?.isPaid
    ? usageData.plan === 'lifetime' ? 'Lifetime Plan' : 'Monthly Plan'
    : 'Free Plan';

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-bar-height)] shrink-0 items-center justify-between border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-6">
      {/* Left — page title (with spacing for mobile hamburger) */}
      <div className="flex items-center gap-3">
        <div className="w-10 md:hidden" /> {/* spacer for hamburger button */}
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>

      {/* Right — user profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/featured"
          className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-white sm:inline-flex"
        >
          <Megaphone className="h-3 w-3 text-[#25c972]" />
          Get featured
        </Link>

        {loading ? (
          <div className="h-8 w-8 rounded-full bg-white/[0.04]" />
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-white/[0.04]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#356df4] to-[#25c972] text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden text-[13px] font-medium text-zinc-200 sm:block">{user.name}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl">
                <div className="border-b border-white/[0.06] px-5 py-3.5">
                  <p className="truncate text-[13px] text-zinc-400">{user.email}</p>
                </div>
                <div className="border-b border-white/[0.06] px-5 py-3">
                  <p className="text-[12px] font-medium text-zinc-500">{planLabel}</p>
                </div>
                {!usageData?.isPaid && (
                  <div className="border-b border-white/[0.06] py-1.5">
                    <button
                      type="button"
                      disabled={checkoutLoading !== null}
                      onClick={() => void handleUpgrade('monthly')}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-white transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      {checkoutLoading === 'monthly' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#25c972]" />
                      ) : (
                        <Zap className="h-4 w-4 text-[#25c972]" />
                      )}
                      Subscribe Monthly
                    </button>
                    <button
                      type="button"
                      disabled={checkoutLoading !== null}
                      onClick={() => void handleUpgrade('lifetime')}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-white transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      {checkoutLoading === 'lifetime' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      ) : (
                        <Crown className="h-4 w-4 text-amber-400" />
                      )}
                      Upgrade to Lifetime
                    </button>
                  </div>
                )}
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      void logout();
                    }}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login?next=/analysis"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/[0.04]"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
