'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Clock3, Diamond, Loader2, LogOut, Megaphone, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { planStringToTier, PLANS } from '@/lib/pricing';
import { detectAppShellSection } from '@/lib/workspace-ui';
import { AisoBrand } from '@/components/ui/aiso-brand';

type AppSection = 'history' | 'leaderboard' | 'featured' | 'dashboard';

const navItems: { key: AppSection; label: string; href: string; icon: typeof Diamond }[] = [
  { key: 'history', label: 'History', href: '/history', icon: Clock3 },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Diamond },
];

export function AppShellNav() {
  const router = useRouter();
  const pathname = usePathname();
  const active = detectAppShellSection(pathname);
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [usageData, setUsageData] = useState<{ plan: string; isPaid: boolean } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  // Fetch plan info for dropdown
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch('/api/auth/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && active) setUsageData(d); })
      .catch(() => {});
    return () => { active = false; };
  }, [user]);

  // Close dropdown on outside click
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
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const session = await res.json();
      setDropdownOpen(false);
      if (typeof session.url === 'string' && /^https?:\/\//i.test(session.url)) {
        window.location.href = session.url;
        return;
      }
      router.push(session.url);
    } catch {
      setDropdownOpen(false);
      router.push('/pricing');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const tier = usageData?.plan ? planStringToTier(usageData.plan) : 'free';
  const planLabel = tier !== 'free' ? `${PLANS[tier].name} Plan` : 'Free Plan';

  return (
    <header className="w-full border-b border-white/[0.06] bg-transparent px-6 py-4 sm:px-8">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[15px] font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-90"
        >
          <AisoBrand logoClassName="h-9 w-9" textClassName="tracking-tight text-[var(--text-primary)]" />
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex" role="navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 rounded-lg px-5 py-3 text-[13px] font-medium transition-colors duration-150',
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

        {/* Right section: Get featured + profile */}
        <div className="flex items-center gap-4">
          <Link
            href="/featured"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)] sm:inline-flex"
          >
            <Megaphone className="h-3.5 w-3.5 text-[#25c972]" />
            Get featured
          </Link>

          {loading ? (
            <div className="h-9 w-9 rounded-full bg-white/[0.04]" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-white/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#356df4] to-[#25c972] text-[12px] font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden text-[14px] font-medium text-[var(--text-primary)] sm:block">{user.name}</span>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl">
                  {/* Email */}
                  <div className="border-b border-white/[0.06] px-5 py-3.5">
                    <p className="truncate text-[13px] text-[var(--text-secondary)]">{user.email}</p>
                  </div>

                  {/* Plan section */}
                  <div className="border-b border-white/[0.06] px-5 py-3">
                    <p className="text-[12px] font-medium text-[var(--text-muted)]">{planLabel}</p>
                  </div>

                  {tier === 'free' && (
                    <div className="border-b border-white/[0.06] py-1.5">
                      <button
                        type="button"
                        disabled={checkoutLoading !== null}
                        onClick={() => void handleUpgrade('starter_monthly')}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-[var(--text-primary)] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
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
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-[var(--text-primary)] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
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
                    <div className="border-b border-white/[0.06] py-1.5">
                      <button
                        type="button"
                        disabled={checkoutLoading !== null}
                        onClick={() => void handleUpgrade('pro_monthly')}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-[var(--text-primary)] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
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
                    <div className="border-b border-white/[0.06] py-1.5">
                      <button
                        type="button"
                        disabled={checkoutLoading !== null}
                        onClick={() => void handleUpgrade('growth_monthly')}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-[var(--text-primary)] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
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

                  <div className="border-b border-white/[0.06] py-1.5">
                    <Link
                      href="/featured"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-[var(--text-primary)] transition-colors hover:bg-white/[0.04]"
                    >
                      <Megaphone className="h-4 w-4 text-[#25c972]" />
                      Get featured
                    </Link>
                  </div>

                  <div className="py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] text-[var(--text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
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
              href="/login?next=/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-white/[0.04]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
