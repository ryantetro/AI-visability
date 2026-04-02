'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, LogOut, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { planStringToTier, PLANS } from '@/lib/pricing';
import { buildLoginHref, getCurrentAppPath } from '@/lib/app-paths';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/report': 'Full Report',
  '/brand': 'Brand',
  '/competitors': 'Competitors',
  '/settings': 'Settings',
  '/history': 'History',
  '/leaderboard': 'Leaderboard',
  '/featured': 'Featured Spot',
  '/pricing': 'Pricing',
};

function getPageTitle(pathname: string): string {
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return 'Dashboard';
}

export function DashboardHeaderBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [usageData, setUsageData] = useState<{ plan: string; isPaid: boolean } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = getPageTitle(pathname);

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

  const handleUpgrade = async (plan: string) => {
    setCheckoutLoading(plan);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, returnPath: getCurrentAppPath('/dashboard') }),
      });
      if (res.status === 401) {
        router.push(buildLoginHref(getCurrentAppPath('/dashboard')));
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to start checkout right now.');
      }
      const session = await res.json();
      if (typeof session.url !== 'string' || session.url.length === 0) {
        throw new Error('Checkout session did not include a redirect URL.');
      }
      setDropdownOpen(false);
      if (typeof session.url === 'string' && /^https?:\/\//i.test(session.url)) {
        window.location.href = session.url;
        return;
      }
      router.push(session.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout right now.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const tier = usageData?.plan ? planStringToTier(usageData.plan) : 'free';
  const planLabel = tier !== 'free' ? `${PLANS[tier].name} Plan` : 'Free Plan';

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-bar-height)] shrink-0 items-center justify-between border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-6">
      {/* Left — page title (with spacing for mobile hamburger) */}
      <div className="flex items-center gap-3">
        <div className="w-10 md:hidden" /> {/* spacer for hamburger button */}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right — user profile */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="h-8 w-8 rounded-full bg-gray-200" />
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-gray-100"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#356df4] to-[#25c972] text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden text-[13px] font-medium text-gray-700 sm:block">{user.name}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <p className="truncate text-[13px] text-gray-500">{user.email}</p>
                </div>
                <div className="border-b border-gray-100 px-5 py-3">
                  <p className="text-[12px] font-medium text-gray-600">{planLabel}</p>
                </div>
                {checkoutError && (
                  <div className="border-b border-gray-100 px-5 py-2.5">
                    <p className="text-[12px] text-red-600">{checkoutError}</p>
                  </div>
                )}
                {tier === 'free' && (
                  <div className="border-b border-gray-100 py-1.5">
                    <button
                      type="button"
                      disabled={checkoutLoading !== null}
                      onClick={() => void handleUpgrade('starter_monthly')}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {checkoutLoading === 'starter_monthly' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#25c972]" />
                      ) : (
                        <Zap className="h-4 w-4 text-[#25c972]" />
                      )}
                      Upgrade to Starter — $49/mo
                    </button>
                    <button
                      type="button"
                      disabled={checkoutLoading !== null}
                      onClick={() => void handleUpgrade('pro_monthly')}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {checkoutLoading === 'pro_monthly' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#356df4]" />
                      ) : (
                        <Zap className="h-4 w-4 text-[#356df4]" />
                      )}
                      Upgrade to Pro — $99/mo
                    </button>
                  </div>
                )}
                {tier === 'starter' && (
                  <div className="border-b border-gray-100 py-1.5">
                    <button
                      type="button"
                      disabled={checkoutLoading !== null}
                      onClick={() => void handleUpgrade('pro_monthly')}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {checkoutLoading === 'pro_monthly' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#356df4]" />
                      ) : (
                        <Zap className="h-4 w-4 text-[#356df4]" />
                      )}
                      Upgrade to Pro — $99/mo
                    </button>
                  </div>
                )}
                {tier === 'pro' && (
                  <div className="border-b border-gray-100 py-1.5">
                    <button
                      type="button"
                      disabled={checkoutLoading !== null}
                      onClick={() => void handleUpgrade('growth_monthly')}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {checkoutLoading === 'growth_monthly' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#a855f7]" />
                      ) : (
                        <Zap className="h-4 w-4 text-[#a855f7]" />
                      )}
                      Upgrade to Growth — $249/mo
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
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
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
            href={buildLoginHref(getCurrentAppPath('/dashboard'))}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-1.5 text-[12px] font-semibold text-gray-800 transition-colors hover:bg-gray-100"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
