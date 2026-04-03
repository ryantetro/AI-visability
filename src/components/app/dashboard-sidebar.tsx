'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Globe2,
  Heart,
  LayoutDashboard,
  Lock,
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
import { useOnboarding } from '@/hooks/use-onboarding';
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

const BRAND_TABS = [
  { id: 'presence',  label: 'AI Presence' },
  { id: 'improve',   label: 'Improve' },
  { id: 'citations', label: 'Citations' },
  { id: 'files',     label: 'Files' },
  { id: 'traffic',   label: 'Traffic' },
  { id: 'content',   label: 'Content' },
  { id: 'services',  label: 'Services' },
] as const;

type BrandTabId = typeof BRAND_TABS[number]['id'];

const NAV_ITEMS: SidebarItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    matchFn: (p) => p === '/dashboard',
  },
  {
    key: 'report',
    label: 'Report',
    href: '/report',
    icon: FileText,
    matchFn: (p) => p === '/report',
  },
  {
    key: 'competitors',
    label: 'Competitors',
    href: '/competitors',
    icon: Users,
    matchFn: (p) => p === '/competitors',
  },
  {
    key: 'history',
    label: 'History',
    href: '/history',
    icon: Clock3,
    matchFn: (p) => p.startsWith('/history'),
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    matchFn: (p) => p === '/analytics',
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy,
    matchFn: (p) => p.startsWith('/leaderboard'),
  },
];

const SETTINGS_ITEM: SidebarItem = {
  key: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: Settings2,
  matchFn: (p) => p === '/settings',
};

const PRICING_ITEM: SidebarItem = {
  key: 'pricing',
  label: 'Pricing',
  href: '/pricing',
  icon: CreditCard,
  matchFn: (p) => p.startsWith('/pricing'),
};

/** Routes that represent the active workspace and should carry ?report= */
const WORKSPACE_KEYS = new Set(['dashboard', 'report', 'brand', 'competitors', 'settings']);

function buildNavHref(base: string, reportId: string | null): string {
  if (!reportId) return base;
  return `${base}?report=${reportId}`;
}

function NavItem({
  item,
  active,
  locked,
  onClick,
}: {
  item: SidebarItem;
  active: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  if (locked) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-4 text-[13px] font-medium transition-colors',
          'h-[var(--sidebar-item-height)]',
          'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400'
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
        <span className="flex-1">{item.label}</span>
        <Lock className="h-3 w-3 shrink-0 text-zinc-600" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-4 text-[13px] font-medium transition-colors',
        'h-[var(--sidebar-item-height)]',
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]" />
      )}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-zinc-500')} />
      <span>{item.label}</span>
    </Link>
  );
}

function buildBrandTabHref(tabId: string, reportId: string | null): string {
  const params = new URLSearchParams();
  if (reportId) params.set('report', reportId);
  if (tabId !== 'presence') params.set('tab', tabId);
  const qs = params.toString();
  return qs ? `/brand?${qs}` : '/brand';
}

function BrandNavItem({
  isOnBrand,
  activeTab,
  reportParam,
  locked,
  onClick,
}: {
  isOnBrand: boolean;
  activeTab: BrandTabId | null;
  reportParam: string | null;
  locked?: boolean;
  onClick?: () => void;
}) {
  // Start expanded if we're on brand; auto-expand when navigating to brand
  const [expanded, setExpanded] = useState(() => isOnBrand);
  useEffect(() => {
    if (isOnBrand) setExpanded(true);
  }, [isOnBrand]);

  const brandHref = buildNavHref('/brand', reportParam);

  if (locked) {
    return (
      <Link
        href="/brand"
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-4 text-[13px] font-medium transition-colors',
          'h-[var(--sidebar-item-height)]',
          'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400'
        )}
      >
        <Heart className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
        <span className="flex-1">Brand</span>
        <Lock className="h-3 w-3 shrink-0 text-zinc-600" />
      </Link>
    );
  }

  return (
    <div>
      {/* Brand parent row — left side navigates, right chevron toggles */}
      <div
        className={cn(
          'relative flex items-center rounded-lg transition-colors',
          'h-[var(--sidebar-item-height)]',
          isOnBrand
            ? 'bg-white/[0.08] text-white'
            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
        )}
      >
        {isOnBrand && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]" />
        )}
        <Link
          href={brandHref}
          onClick={onClick}
          className="flex flex-1 items-center gap-3 px-4 text-[13px] font-medium h-full min-w-0"
        >
          <Heart className={cn('h-[18px] w-[18px] shrink-0', isOnBrand ? 'text-white' : 'text-zinc-500')} />
          <span>Brand</span>
        </Link>
        {/* Chevron — animates with Framer Motion */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-full items-center pr-3 pl-2 text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label={expanded ? 'Collapse brand menu' : 'Expand brand menu'}
        >
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>
        </button>
      </div>

      {/* Sub-items — Framer Motion for true height animation */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="brand-subnav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.18, ease: 'easeOut' },
            }}
            style={{ overflow: 'hidden' }}
          >
            {/* Left border track + indented items */}
            <div className="relative ml-[30px] mt-1 pb-1.5">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.07]" />
              <div className="space-y-px">
                {BRAND_TABS.map((tab, i) => {
                  const isActive = isOnBrand && (activeTab === tab.id || (!activeTab && tab.id === 'presence'));
                  return (
                    <motion.div
                      key={tab.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.03, ease: 'easeOut' }}
                    >
                      <Link
                        href={buildBrandTabHref(tab.id, reportParam)}
                        onClick={onClick}
                        className={cn(
                          'relative flex items-center pl-4 pr-2 py-[6px] rounded-md text-[12.5px] transition-colors',
                          isActive
                            ? 'font-semibold text-white'
                            : 'font-medium text-zinc-500 hover:text-zinc-200',
                        )}
                      >
                        {/* Tick mark on the left rail */}
                        {isActive && (
                          <motion.span
                            layoutId="brand-active-tick"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-[14px] w-px bg-[var(--sidebar-accent)]"
                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        )}
                        {tab.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarDomainList({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const {
    monitoredSites,
    selectedDomain,
    selectDomain,
    addDomainInput,
    setAddDomainInput,
    handleAddDomain,
    handleRemoveDomain,
    addError,
    confirmChecked,
    setConfirmChecked,
    inputFaviconUrl,
  } = useDomainContext();

  const [showAddInput, setShowAddInput] = useState(false);

  const handleSelectDomain = (domain: string) => {
    selectDomain(domain);
    onCloseMobile?.();
  };

  const handleSubmitDomain = async () => {
    const result = await handleAddDomain();
    if (result.ok) {
      setShowAddInput(false);
    }
  };

  const renderDomainButton = (site: SiteSummary) => {
    const isActive = site.domain === selectedDomain;
    const score =
      site.latestPaidScan?.scores?.overall ??
      site.latestScan?.scores?.overall ??
      site.latestScan?.score ??
      null;

    return (
      <button
        key={site.domain}
        type="button"
        onClick={() => handleSelectDomain(site.domain)}
        className={cn(
          'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
          isActive
            ? 'bg-white/[0.08] text-white'
            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#25c972]" />
        )}
        <img
          src={getFaviconUrl(site.domain, 32)}
          alt=""
          className="h-4 w-4 shrink-0 rounded-sm"
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">
            {site.domain}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5">
            {site.lastTouchedAt && (() => {
              const ageMs = Date.now() - site.lastTouchedAt;
              const ageMinutes = Math.floor(ageMs / 60000);
              const ageHours = Math.floor(ageMs / 3600000);
              const ageDays = Math.floor(ageMs / 86400000);
              const label =
                ageMinutes < 1
                  ? 'Just now'
                  : ageHours < 1
                    ? `${ageMinutes}m ago`
                    : ageDays < 1
                      ? `${ageHours}h ago`
                      : `${ageDays}d ago`;
              const dotColor = ageDays < 1 ? 'bg-[#25c972]' : ageDays <= 7 ? 'bg-[#ffbb00]' : 'bg-[#ff5252]';
              return (
                <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dotColor)} />
                  {label}
                </span>
              );
            })()}
          </div>
        </div>
        {score != null && (
          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              score >= 80
                ? 'bg-[#25c972]/15 text-[#25c972]'
                : score >= 60
                  ? 'bg-[#ffbb00]/15 text-[#ffbb00]'
                  : score >= 40
                    ? 'bg-[#ff8a1e]/15 text-[#ff8a1e]'
                    : 'bg-[#ff5252]/15 text-[#ff5252]'
            )}
          >
            {Math.round(score)}
          </span>
        )}
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveDomain(site.domain);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              handleRemoveDomain(site.domain);
            }
          }}
          className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
          aria-label={`Remove ${site.domain}`}
        >
          <X className="h-3 w-3" />
        </span>
      </button>
    );
  };

  return (
    <div className="px-3">
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
        Domains
      </p>

      <div className="space-y-0.5">
        {monitoredSites.map((site) => renderDomainButton(site))}
      </div>

      {/* Add domain toggle */}
      {showAddInput ? (
        <div className="mt-1.5 space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <div className="flex items-center gap-1.5">
            {inputFaviconUrl ? (
              <img src={inputFaviconUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
            ) : (
              <Globe2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            )}
            <input
              type="text"
              value={addDomainInput}
              onChange={(e) => setAddDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSubmitDomain()}
              placeholder="example.com"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleSubmitDomain()}
              className="rounded p-0.5 text-zinc-400 transition-colors hover:text-white"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setShowAddInput(false); setAddDomainInput(''); }}
              className="rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-1.5 text-[10px] leading-4 text-zinc-500">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-0.5 h-3 w-3 shrink-0 accent-zinc-400"
            />
            <span>I own or am authorized to monitor this domain</span>
          </label>

          {addError && (
            <p className="text-[10px] text-red-400">{addError}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </button>
      )}
    </div>
  );
}

function SidebarOnboardingProgress() {
  const onboarding = useOnboarding();

  if (!onboarding || onboarding.allComplete || onboarding.dismissed) return null;

  const { completedCount, totalSteps, progressPct } = onboarding;

  return (
    <div className="px-3 py-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]"
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="#25c972"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(progressPct / 100) * 50.27} 50.27`}
            transform="rotate(-90 10 10)"
          />
        </svg>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-zinc-300">Getting Started</p>
          <p className="text-[10px] text-zinc-500">{completedCount}/{totalSteps} complete</p>
        </div>
      </Link>
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  const reportParam = searchParams.get('report');
  const tabParam = searchParams.get('tab') as BrandTabId | null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tier, loading: planLoading } = usePlan();

  const isOnBrand = pathname === '/brand';

  const closeMobile = () => setMobileOpen(false);

  // Check if context is available (only on /advanced routes)
  let hasDomainContext = false;
  try {
    useDomainContext();
    hasDomainContext = true;
  } catch {
    hasDomainContext = false;
  }

  const isFree = !planLoading && tier === 'free';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* ── Fixed header: logo ──────────────────────────────────── */}
      <div className="shrink-0 flex h-14 items-center gap-2.5 px-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={closeMobile}>
          <AisoBrand
            logoClassName="h-7 w-7"
            textClassName="text-[15px]"
            wordmarkVariant="dark"
          />
        </Link>
      </div>

      {/* ── Scrollable middle: domains + nav ────────────────────── */}
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          // slim, barely-visible scrollbar
          '[&::-webkit-scrollbar]:w-[3px]',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-white/[0.08]',
          '[&::-webkit-scrollbar-thumb:hover]:bg-white/[0.15]',
        )}
      >
        {/* Domain Selector */}
        {hasDomainContext && (
          <>
            <div className="mx-3 border-t border-white/[0.06]" />
            <div className="py-2.5">
              <SidebarDomainList onCloseMobile={closeMobile} />
            </div>
          </>
        )}

        {hasDomainContext && <SidebarOnboardingProgress />}

        {/* Nav separator */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* Main nav */}
        <nav className="mt-2 space-y-0.5 px-3 pb-2">
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const requiredTier = NAV_GATES[item.key] ?? 'free';
            const isLocked = !planLoading && !canAccess(tier, requiredTier);
            const href = WORKSPACE_KEYS.has(item.key)
              ? buildNavHref(item.href, reportParam)
              : item.href;
            return (
              <NavItem
                key={item.key}
                item={{ ...item, href }}
                active={item.matchFn(pathname, section)}
                locked={isLocked}
                onClick={closeMobile}
              />
            );
          })}

          {/* Brand — expandable with sub-tabs */}
          <BrandNavItem
            isOnBrand={isOnBrand}
            activeTab={tabParam}
            reportParam={reportParam}
            locked={!planLoading && !canAccess(tier, NAV_GATES.brand ?? 'free')}
            onClick={closeMobile}
          />

          {NAV_ITEMS.slice(2).map((item) => {
            const requiredTier = NAV_GATES[item.key] ?? 'free';
            const isLocked = !planLoading && !canAccess(tier, requiredTier);
            const href = WORKSPACE_KEYS.has(item.key)
              ? buildNavHref(item.href, reportParam)
              : item.href;
            return (
              <NavItem
                key={item.key}
                item={{ ...item, href }}
                active={item.matchFn(pathname, section)}
                locked={isLocked}
                onClick={closeMobile}
              />
            );
          })}
        </nav>
      </div>

      {/* ── Fixed footer: settings + pricing ────────────────────── */}
      <div className="shrink-0">
        <div className="mx-3 border-t border-white/[0.06]" />
        <nav className="space-y-0.5 px-3 py-2">
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
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[var(--sidebar-bg)] text-zinc-300 md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[var(--sidebar-width)] md:shrink-0 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 md:border-r md:border-[var(--sidebar-border)] md:bg-[var(--sidebar-bg)]">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
            onKeyDown={(e) => e.key === 'Escape' && closeMobile()}
            role="button"
            tabIndex={0}
            aria-label="Close navigation"
          />
          {/* Sidebar panel */}
          <aside className="absolute inset-y-0 left-0 w-[var(--sidebar-width)] border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-2xl">
            <button
              type="button"
              onClick={closeMobile}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
