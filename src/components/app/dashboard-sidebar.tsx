'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Globe2,
  Heart,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Plus,
  Settings2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/url-utils';
import { useDomainContext } from '@/contexts/domain-context';
import { usePlan } from '@/hooks/use-plan';
import { useAuth } from '@/hooks/use-auth';
import { useOnboarding } from '@/hooks/use-onboarding';
import { BRAND_SECTIONS, buildBrandPath } from '@/lib/brand-navigation';
import { NAV_GATES, canAccess } from '@/lib/pricing';
import { AisoBrand } from '@/components/ui/aiso-brand';
import type { SiteSummary } from '@/app/advanced/lib/types';

type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  matchFn: (pathname: string, section: string | null) => boolean;
};

const NAV_ITEMS: SidebarItem[] = [
  { key: 'dashboard',   label: 'Dashboard',   href: '/dashboard',              icon: LayoutDashboard, matchFn: (p) => p === '/dashboard' },
  { key: 'report',      label: 'Report',      href: '/report',                 icon: FileText,        matchFn: (p) => p === '/report' },
  { key: 'brand',       label: 'Brand',       href: buildBrandPath('presence'), icon: Heart,          matchFn: (p) => p === '/brand' || p.startsWith('/brand/') },
  { key: 'competitors', label: 'Competitors', href: '/competitors',             icon: Users,           matchFn: (p) => p === '/competitors' },
  { key: 'history',     label: 'History',     href: '/history',                icon: Clock3,          matchFn: (p) => p.startsWith('/history') },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard',            icon: Trophy,          matchFn: (p) => p.startsWith('/leaderboard') },
];

const SETTINGS_ITEM: SidebarItem = {
  key: 'settings', label: 'Settings', href: '/settings', icon: Settings2,
  matchFn: (p) => p === '/settings',
};
const PRICING_ITEM: SidebarItem = {
  key: 'pricing', label: 'Pricing', href: '/pricing', icon: CreditCard,
  matchFn: (p) => p.startsWith('/pricing'),
};

const WORKSPACE_KEYS = new Set(['dashboard', 'report', 'brand', 'competitors', 'settings']);

function buildNavHref(base: string, reportId: string | null): string {
  if (!reportId) return base;
  return `${base}?report=${reportId}`;
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
      {children}
    </p>
  );
}

// ── Nav item ───────────────────────────────────────────────────────────────
function NavItem({
  item, active, locked, expandable, expanded, onExpandToggle, onClick,
}: {
  item: SidebarItem;
  active: boolean;
  locked?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onExpandToggle?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
        active
          ? 'bg-gray-100 text-gray-900'
          : locked
            ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-500'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-gray-700' : 'text-gray-500')} />
      <span className="flex-1">{item.label}</span>
      {locked && <Lock className="h-3 w-3 shrink-0 text-gray-300" />}
      {expandable && (
        <span
          role="button"
          tabIndex={0}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpandToggle?.(e); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpandToggle?.(e as unknown as React.MouseEvent); } }}
          className="rounded p-0.5 text-gray-400 hover:text-gray-600"
        >
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-90')} />
        </span>
      )}
    </Link>
  );
}

// ── Brand sub-nav ──────────────────────────────────────────────────────────
function BrandSectionNavItem({
  label, href, active, locked, onClick,
}: {
  label: string; href: string; active: boolean; locked?: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg py-1.5 pl-9 pr-3 text-[12px] font-medium transition-colors',
        locked
          ? 'text-gray-300 hover:bg-gray-50'
          : active
            ? 'bg-gray-100 text-gray-800'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', active ? 'bg-gray-500' : 'bg-gray-300')} />
      <span>{label}</span>
      {locked && <Lock className="ml-auto h-3 w-3 shrink-0 text-gray-300" />}
    </Link>
  );
}

// ── Domain list ────────────────────────────────────────────────────────────
function SidebarDomainList({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const {
    monitoredSites, selectedDomain, selectDomain,
    addDomainInput, setAddDomainInput, handleAddDomain, handleRemoveDomain,
    addError, confirmChecked, setConfirmChecked, inputFaviconUrl,
  } = useDomainContext();
  const [showAddInput, setShowAddInput] = useState(false);

  const handleSelectDomain = (domain: string) => { selectDomain(domain); onCloseMobile?.(); };
  const handleSubmitDomain = async () => {
    const result = await handleAddDomain();
    if (result.ok) setShowAddInput(false);
  };

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : score >= 40 ? 'text-orange-500' : 'text-red-500';
  const scoreBg = (score: number) =>
    score >= 80 ? 'bg-emerald-50' : score >= 60 ? 'bg-amber-50' : score >= 40 ? 'bg-orange-50' : 'bg-red-50';

  return (
    <div>
      <SectionLabel>Domains</SectionLabel>

      <div className="max-h-[220px] space-y-0.5 overflow-y-auto">
        {monitoredSites.map((site: SiteSummary) => {
          const isActive = site.domain === selectedDomain;
          const score =
            site.latestPaidScan?.scores?.overall ??
            site.latestScan?.scores?.overall ??
            site.latestScan?.score ??
            null;
          const ageMs = site.lastTouchedAt ? Date.now() - site.lastTouchedAt : null;
          const ageLabel = ageMs == null ? null
            : ageMs < 60000 ? 'Just now'
            : ageMs < 3600000 ? `${Math.floor(ageMs / 60000)}m ago`
            : ageMs < 86400000 ? `${Math.floor(ageMs / 3600000)}h ago`
            : `${Math.floor(ageMs / 86400000)}d ago`;

          return (
            <button
              key={site.domain}
              type="button"
              onClick={() => handleSelectDomain(site.domain)}
              className={cn(
                'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <img src={getFaviconUrl(site.domain, 32)} alt="" className="h-5 w-5 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <span className={cn('block truncate text-[12px] font-semibold', isActive ? 'text-gray-900' : 'text-gray-700')}>
                  {site.domain}
                </span>
                {ageLabel && (
                  <span className="text-[10px] text-gray-500">{ageLabel}</span>
                )}
              </div>
              {score != null && (
                <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums', scoreColor(score), scoreBg(score))}>
                  {Math.round(score)}
                </span>
              )}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); handleRemoveDomain(site.domain); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleRemoveDomain(site.domain); } }}
                className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100"
                aria-label={`Remove ${site.domain}`}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>

      {showAddInput ? (
        <div className="mt-1 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <div className="flex items-center gap-1.5">
            {inputFaviconUrl
              ? <img src={inputFaviconUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
              : <Globe2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            }
            <input
              type="text"
              value={addDomainInput}
              onChange={(e) => setAddDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSubmitDomain()}
              placeholder="example.com"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
              autoFocus
            />
            <button type="button" onClick={() => void handleSubmitDomain()} className="rounded p-0.5 text-gray-500 hover:text-gray-800">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { setShowAddInput(false); setAddDomainInput(''); }} className="rounded p-0.5 text-gray-500 hover:text-gray-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <label className="flex cursor-pointer items-start gap-1.5 text-[10px] leading-4 text-gray-600">
            <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="mt-0.5 h-3 w-3 shrink-0 accent-blue-600" />
            <span>I own or am authorized to monitor this domain</span>
          </label>
          {addError && <p className="text-[10px] text-red-500">{addError}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </button>
      )}
    </div>
  );
}

// ── Onboarding ring ────────────────────────────────────────────────────────
function SidebarOnboardingProgress() {
  const onboarding = useOnboarding();
  if (!onboarding || onboarding.allComplete || onboarding.dismissed) return null;
  const { completedCount, totalSteps, progressPct } = onboarding;
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50">
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.5" />
        <circle cx="10" cy="10" r="8" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${(progressPct / 100) * 50.27} 50.27`} transform="rotate(-90 10 10)" />
      </svg>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-gray-700">Getting Started</p>
        <p className="text-[10px] text-gray-500">{completedCount}/{totalSteps} complete</p>
      </div>
    </Link>
  );
}

// ── User profile (bottom) ─────────────────────────────────────────────────
function SidebarUserProfile() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const initials = user.name
    ?.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase()).join('') ?? 'A';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-gray-900">{user.name}</p>
          <p className="truncate text-[10px] text-gray-500">{user.email}</p>
        </div>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => { setOpen(false); void logout(); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-[13px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main sidebar export ────────────────────────────────────────────────────
export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  const reportParam = searchParams.get('report');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    // Auto-expand brand if we're on a brand route
    const initial = new Set<string>();
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/brand')) {
      initial.add('brand');
    }
    return initial;
  });
  const { tier, loading: planLoading } = usePlan();
  const closeMobile = () => setMobileOpen(false);

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  let hasDomainContext = false;
  try { useDomainContext(); hasDomainContext = true; } catch { hasDomainContext = false; }

  const isFree = !planLoading && tier === 'free';

  const sidebarContent = (
    <div className="flex h-full flex-col gap-0 overflow-hidden">

      {/* ── Logo ── */}
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/" onClick={closeMobile}>
          <AisoBrand logoClassName="h-7 w-7" textClassName="text-[15px]" wordmarkVariant="dark" />
        </Link>
      </div>


      {/* ── Scrollable body ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-3">

        {/* Domains */}
        {hasDomainContext && (
          <div>
            <SidebarDomainList onCloseMobile={closeMobile} />
          </div>
        )}

        {/* Onboarding progress */}
        {hasDomainContext && <SidebarOnboardingProgress />}

        {/* Main nav */}
        <div>
          <SectionLabel>Main</SectionLabel>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const requiredTier = NAV_GATES[item.key] ?? 'free';
              const isLocked = !planLoading && !canAccess(tier, requiredTier);
              const href = WORKSPACE_KEYS.has(item.key)
                ? buildNavHref(item.href, reportParam)
                : item.href;
              const isActive = item.matchFn(pathname, section);
              const hasChildren = item.key === 'brand' && !isLocked;
              const isExpanded = expandedKeys.has(item.key);
              return (
                <div key={item.key}>
                  <NavItem
                    item={{ ...item, href }}
                    active={isActive}
                    locked={isLocked}
                    expandable={hasChildren}
                    expanded={isExpanded}
                    onExpandToggle={() => toggleExpanded(item.key)}
                    onClick={!hasChildren ? closeMobile : undefined}
                  />
                  <AnimatePresence initial={false}>
                    {hasChildren && isExpanded && (
                      <motion.div
                        key="brand-sub"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-0.5 space-y-0.5">
                          {BRAND_SECTIONS.map((brandSection) => {
                            const sectionHref = buildNavHref(buildBrandPath(brandSection.key), reportParam);
                            return (
                              <BrandSectionNavItem
                                key={brandSection.key}
                                label={brandSection.label}
                                href={sectionHref}
                                active={pathname === buildBrandPath(brandSection.key)}
                                onClick={closeMobile}
                              />
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div>
          <SectionLabel>Settings</SectionLabel>
          <div className="space-y-0.5">
            <NavItem
              item={{ ...SETTINGS_ITEM, href: buildNavHref(SETTINGS_ITEM.href, reportParam) }}
              active={SETTINGS_ITEM.matchFn(pathname, section)}
              locked={!planLoading && !canAccess(tier, NAV_GATES.settings ?? 'free')}
              onClick={closeMobile}
            />
            {isFree && (
              <NavItem
                item={PRICING_ITEM}
                active={PRICING_ITEM.matchFn(pathname, section)}
                onClick={closeMobile}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── User profile (bottom) ── */}
      <div className="shrink-0 border-t border-gray-100 px-3 py-2">
        <SidebarUserProfile />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-(--sidebar-width) md:shrink-0 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 md:border-r md:border-gray-100 md:bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
            onKeyDown={(e) => e.key === 'Escape' && closeMobile()}
            role="button" tabIndex={0} aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-(--sidebar-width) border-r border-gray-100 bg-white shadow-xl">
            <button
              type="button"
              onClick={closeMobile}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:text-gray-700"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
