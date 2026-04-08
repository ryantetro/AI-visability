'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  ListChecks,
  Lock,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
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
import { useActionChecklistCount } from '@/contexts/action-checklist-context';
import { AisoBrand } from '@/components/ui/aiso-brand';
import { AisoLogo } from '@/components/ui/aiso-brand';
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

const PROMPT_TABS = [
  { id: 'active',      label: 'Active' },
  { id: 'inactive',    label: 'Inactive' },
  { id: 'suggestions', label: 'Suggestions' },
] as const;

type PromptTabId = typeof PROMPT_TABS[number]['id'];

const CONTENT_STUDIO_TABS = [
  { id: 'contents',  label: 'Contents' },
  { id: 'audiences', label: 'Audiences' },
] as const;

type ContentStudioTabId = typeof CONTENT_STUDIO_TABS[number]['id'];

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
    key: 'actions',
    label: 'Actions',
    href: '/actions',
    icon: ListChecks,
    matchFn: (p) => p === '/actions',
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
    key: 'prompts',
    label: 'Prompts',
    href: '/prompts',
    icon: MessageSquareText,
    matchFn: (p) => p === '/prompts',
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
const WORKSPACE_KEYS = new Set(['dashboard', 'report', 'actions', 'brand', 'competitors', 'settings', 'prompts', 'content-studio']);

const SIDEBAR_STORAGE_KEY = 'aiso_sidebar_collapsed';

// ── Collapse hook ──────────────────────────────────────────────────────

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const width = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';
    document.documentElement.style.setProperty('--sidebar-current-width', width);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch { /* noop */ }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);

  return { collapsed, toggle, mounted };
}

// ── Tooltip ────────────────────────────────────────────────────────────

function SidebarTooltip({ label, show }: { label: string; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.15 }}
          className="sidebar-tooltip"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function buildNavHref(base: string, reportId: string | null): string {
  if (!reportId) return base;
  return `${base}?report=${reportId}`;
}

function buildBrandTabHref(tabId: string, reportId: string | null): string {
  const params = new URLSearchParams();
  if (reportId) params.set('report', reportId);
  if (tabId !== 'presence') params.set('tab', tabId);
  const qs = params.toString();
  return qs ? `/brand?${qs}` : '/brand';
}

function buildPromptTabHref(tabId: string, reportId: string | null): string {
  const params = new URLSearchParams();
  if (reportId) params.set('report', reportId);
  if (tabId !== 'active') params.set('tab', tabId);
  const qs = params.toString();
  return qs ? `/prompts?${qs}` : '/prompts';
}

function buildContentStudioTabHref(tabId: string, reportId: string | null): string {
  const params = new URLSearchParams();
  if (reportId) params.set('report', reportId);
  if (tabId !== 'contents') params.set('tab', tabId);
  const qs = params.toString();
  return qs ? `/content-studio?${qs}` : '/content-studio';
}

// ── NavItem ────────────────────────────────────────────────────────────

function NavItem({
  item,
  active,
  locked,
  collapsed,
  badge,
  onClick,
}: {
  item: SidebarItem;
  active: boolean;
  locked?: boolean;
  collapsed?: boolean;
  badge?: number | null;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);

  if (locked) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4'
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {!collapsed && <Lock className="h-3 w-3 shrink-0 text-zinc-600" />}
        {collapsed && <SidebarTooltip label={item.label} show={hovered} />}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
        'h-[var(--sidebar-item-height)]',
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
        collapsed ? 'justify-center px-0' : 'gap-3 px-4'
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-indicator"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-zinc-500')} />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-[#ffbb00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#ffbb00]">
          {badge}
        </span>
      )}
      {collapsed && <SidebarTooltip label={item.label} show={hovered} />}
    </Link>
  );
}

// ── BrandNavItem ───────────────────────────────────────────────────────

function BrandNavItem({
  isOnBrand,
  activeTab,
  reportParam,
  locked,
  collapsed,
  onClick,
}: {
  isOnBrand: boolean;
  activeTab: BrandTabId | null;
  reportParam: string | null;
  locked?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(() => isOnBrand);
  const [hovered, setHovered] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOnBrand) setExpanded(true);
  }, [isOnBrand]);

  useEffect(() => {
    if (!flyoutOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [flyoutOpen]);

  const brandHref = buildNavHref('/brand', reportParam);

  if (locked) {
    return (
      <Link
        href="/brand"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4'
        )}
      >
        <Heart className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
        {!collapsed && <span className="flex-1">Brand</span>}
        {!collapsed && <Lock className="h-3 w-3 shrink-0 text-zinc-600" />}
        {collapsed && <SidebarTooltip label="Brand" show={hovered} />}
      </Link>
    );
  }

  // Collapsed mode — icon with flyout popover for sub-tabs
  if (collapsed) {
    return (
      <div ref={flyoutRef} className="relative">
        <button
          type="button"
          onClick={() => setFlyoutOpen((v) => !v)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'relative flex w-full items-center justify-center rounded-lg text-[13px] font-medium transition-all duration-200',
            'h-[var(--sidebar-item-height)]',
            isOnBrand
              ? 'bg-white/[0.08] text-white'
              : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
          )}
        >
          {isOnBrand && (
            <motion.span
              layoutId="nav-active-indicator"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <Heart className={cn('h-[18px] w-[18px] shrink-0', isOnBrand ? 'text-white' : 'text-zinc-500')} />
          {!flyoutOpen && <SidebarTooltip label="Brand" show={hovered} />}
        </button>
        <AnimatePresence>
          {flyoutOpen && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-1/2 -translate-y-1/2 min-w-[160px] py-2 px-1"
              style={{
                left: 'calc(100% + 8px)',
                zIndex: 100,
                background: 'rgba(24, 24, 27, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Brand</p>
              <div className="space-y-px">
                {BRAND_TABS.map((tab) => {
                  const isActive = isOnBrand && (activeTab === tab.id || (!activeTab && tab.id === 'presence'));
                  return (
                    <Link
                      key={tab.id}
                      href={buildBrandTabHref(tab.id, reportParam)}
                      onClick={() => { setFlyoutOpen(false); onClick?.(); }}
                      className={cn(
                        'flex items-center rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                        isActive
                          ? 'font-semibold text-white bg-white/[0.08]'
                          : 'font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]',
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      {/* Brand parent row — left side navigates, right chevron toggles */}
      <div
        className={cn(
          'relative flex items-center rounded-lg transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          isOnBrand
            ? 'bg-white/[0.08] text-white'
            : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
        )}
      >
        {isOnBrand && (
          <motion.span
            layoutId="nav-active-indicator"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
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

// ── PromptsNavItem ──────────────────────────────────────────────────────

function PromptsNavItem({
  isOnPrompts,
  activeTab,
  reportParam,
  locked,
  collapsed,
  onClick,
}: {
  isOnPrompts: boolean;
  activeTab: PromptTabId | null;
  reportParam: string | null;
  locked?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(() => isOnPrompts);
  const [hovered, setHovered] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOnPrompts) setExpanded(true);
  }, [isOnPrompts]);

  useEffect(() => {
    if (!flyoutOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [flyoutOpen]);

  const promptsHref = buildNavHref('/prompts', reportParam);

  if (locked) {
    return (
      <Link
        href="/prompts"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4'
        )}
      >
        <MessageSquareText className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
        {!collapsed && <span className="flex-1">Prompts</span>}
        {!collapsed && <Lock className="h-3 w-3 shrink-0 text-zinc-600" />}
        {collapsed && <SidebarTooltip label="Prompts" show={hovered} />}
      </Link>
    );
  }

  // Collapsed mode — icon with flyout popover for sub-tabs
  if (collapsed) {
    return (
      <div ref={flyoutRef} className="relative">
        <button
          type="button"
          onClick={() => setFlyoutOpen((v) => !v)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'relative flex w-full items-center justify-center rounded-lg text-[13px] font-medium transition-all duration-200',
            'h-[var(--sidebar-item-height)]',
            isOnPrompts
              ? 'bg-white/[0.08] text-white'
              : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
          )}
        >
          {isOnPrompts && (
            <motion.span
              layoutId="nav-active-indicator"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <MessageSquareText className={cn('h-[18px] w-[18px] shrink-0', isOnPrompts ? 'text-white' : 'text-zinc-500')} />
          {!flyoutOpen && <SidebarTooltip label="Prompts" show={hovered} />}
        </button>
        <AnimatePresence>
          {flyoutOpen && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-1/2 -translate-y-1/2 min-w-[160px] py-2 px-1"
              style={{
                left: 'calc(100% + 8px)',
                zIndex: 100,
                background: 'rgba(24, 24, 27, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Prompts</p>
              <div className="space-y-px">
                {PROMPT_TABS.map((tab) => {
                  const isActive = isOnPrompts && (activeTab === tab.id || (!activeTab && tab.id === 'active'));
                  return (
                    <Link
                      key={tab.id}
                      href={buildPromptTabHref(tab.id, reportParam)}
                      onClick={() => { setFlyoutOpen(false); onClick?.(); }}
                      className={cn(
                        'flex items-center rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                        isActive
                          ? 'font-semibold text-white bg-white/[0.08]'
                          : 'font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]',
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Expanded sidebar — collapsible sub-items
  return (
    <div>
      <div
        className={cn(
          'relative flex items-center rounded-lg transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          isOnPrompts
            ? 'bg-white/[0.08] text-white'
            : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
        )}
      >
        {isOnPrompts && (
          <motion.span
            layoutId="nav-active-indicator"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <Link
          href={promptsHref}
          onClick={onClick}
          className="flex flex-1 items-center gap-3 px-4 text-[13px] font-medium h-full min-w-0"
        >
          <MessageSquareText className={cn('h-[18px] w-[18px] shrink-0', isOnPrompts ? 'text-white' : 'text-zinc-500')} />
          <span>Prompts</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-full items-center pr-3 pl-2 text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label={expanded ? 'Collapse prompts menu' : 'Expand prompts menu'}
        >
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="prompts-subnav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.18, ease: 'easeOut' },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="relative ml-[30px] mt-1 pb-1.5">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.07]" />
              <div className="space-y-px">
                {PROMPT_TABS.map((tab, i) => {
                  const isActive = isOnPrompts && (activeTab === tab.id || (!activeTab && tab.id === 'active'));
                  return (
                    <motion.div
                      key={tab.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.03, ease: 'easeOut' }}
                    >
                      <Link
                        href={buildPromptTabHref(tab.id, reportParam)}
                        onClick={onClick}
                        className={cn(
                          'relative flex items-center pl-4 pr-2 py-[6px] rounded-md text-[12.5px] transition-colors',
                          isActive
                            ? 'font-semibold text-white'
                            : 'font-medium text-zinc-500 hover:text-zinc-200',
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="prompts-active-tick"
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

// ── ContentStudioNavItem ────────────────────────────────────────────────

function ContentStudioNavItem({
  isOnContentStudio,
  activeTab,
  reportParam,
  locked,
  collapsed,
  onClick,
}: {
  isOnContentStudio: boolean;
  activeTab: ContentStudioTabId | null;
  reportParam: string | null;
  locked?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(() => isOnContentStudio);
  const [hovered, setHovered] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOnContentStudio) setExpanded(true);
  }, [isOnContentStudio]);

  useEffect(() => {
    if (!flyoutOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [flyoutOpen]);

  const csHref = buildNavHref('/content-studio', reportParam);

  if (locked) {
    return (
      <Link
        href="/content-studio"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4'
        )}
      >
        <PenTool className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
        {!collapsed && <span className="flex-1">Content Studio</span>}
        {!collapsed && <Lock className="h-3 w-3 shrink-0 text-zinc-600" />}
        {collapsed && <SidebarTooltip label="Content Studio" show={hovered} />}
      </Link>
    );
  }

  if (collapsed) {
    return (
      <div ref={flyoutRef} className="relative">
        <button
          type="button"
          onClick={() => setFlyoutOpen((v) => !v)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'relative flex w-full items-center justify-center rounded-lg text-[13px] font-medium transition-all duration-200',
            'h-[var(--sidebar-item-height)]',
            isOnContentStudio
              ? 'bg-white/[0.08] text-white'
              : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
          )}
        >
          {isOnContentStudio && (
            <motion.span
              layoutId="nav-active-indicator"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <PenTool className={cn('h-[18px] w-[18px] shrink-0', isOnContentStudio ? 'text-white' : 'text-zinc-500')} />
          {!flyoutOpen && <SidebarTooltip label="Content Studio" show={hovered} />}
        </button>
        <AnimatePresence>
          {flyoutOpen && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-1/2 -translate-y-1/2 min-w-[160px] py-2 px-1"
              style={{
                left: 'calc(100% + 8px)',
                zIndex: 100,
                background: 'rgba(24, 24, 27, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Content Studio</p>
              <div className="space-y-px">
                {CONTENT_STUDIO_TABS.map((tab) => {
                  const isActive = isOnContentStudio && (activeTab === tab.id || (!activeTab && tab.id === 'contents'));
                  return (
                    <Link
                      key={tab.id}
                      href={buildContentStudioTabHref(tab.id, reportParam)}
                      onClick={() => { setFlyoutOpen(false); onClick?.(); }}
                      className={cn(
                        'flex items-center rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                        isActive
                          ? 'font-semibold text-white bg-white/[0.08]'
                          : 'font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]',
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          'relative flex items-center rounded-lg transition-all duration-200',
          'h-[var(--sidebar-item-height)]',
          isOnContentStudio
            ? 'bg-white/[0.08] text-white'
            : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
        )}
      >
        {isOnContentStudio && (
          <motion.span
            layoutId="nav-active-indicator"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)]"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <Link
          href={csHref}
          onClick={onClick}
          className="flex flex-1 items-center gap-3 px-4 text-[13px] font-medium h-full min-w-0"
        >
          <PenTool className={cn('h-[18px] w-[18px] shrink-0', isOnContentStudio ? 'text-white' : 'text-zinc-500')} />
          <span>Content Studio</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-full items-center pr-3 pl-2 text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label={expanded ? 'Collapse content studio menu' : 'Expand content studio menu'}
        >
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="cs-subnav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.18, ease: 'easeOut' },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="relative ml-[30px] mt-1 pb-1.5">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.07]" />
              <div className="space-y-px">
                {CONTENT_STUDIO_TABS.map((tab, i) => {
                  const isActive = isOnContentStudio && (activeTab === tab.id || (!activeTab && tab.id === 'contents'));
                  return (
                    <motion.div
                      key={tab.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.03, ease: 'easeOut' }}
                    >
                      <Link
                        href={buildContentStudioTabHref(tab.id, reportParam)}
                        onClick={onClick}
                        className={cn(
                          'relative flex items-center pl-4 pr-2 py-[6px] rounded-md text-[12.5px] transition-colors',
                          isActive
                            ? 'font-semibold text-white'
                            : 'font-medium text-zinc-500 hover:text-zinc-200',
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="cs-active-tick"
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

// ── SidebarDomainList ──────────────────────────────────────────────────

function SidebarDomainList({ onCloseMobile, collapsed }: { onCloseMobile?: () => void; collapsed?: boolean }) {
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
    recentLoading,
  } = useDomainContext();

  const [showAddInput, setShowAddInput] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  useEffect(() => {
    if (!popoverOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [popoverOpen]);

  // Collapsed mode: favicon with domain switcher popover
  if (collapsed) {
    const selectedSite = monitoredSites.find((s) => s.domain === selectedDomain);
    return (
      <div ref={popoverRef} className="relative flex justify-center px-1 py-2">
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/[0.05]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {selectedSite ? (
            <img
              src={getFaviconUrl(selectedSite.domain, 32)}
              alt={selectedSite.domain}
              className="h-5 w-5 rounded-sm"
            />
          ) : (
            <Globe2 className="h-5 w-5 text-zinc-500" />
          )}
          {!popoverOpen && <SidebarTooltip label={selectedSite?.domain ?? 'Domains'} show={hovered} />}
        </button>
        <AnimatePresence>
          {popoverOpen && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-1/2 -translate-y-1/2 min-w-[220px] py-2 px-1.5"
              style={{
                left: 'calc(100% + 8px)',
                zIndex: 100,
                background: 'rgba(24, 24, 27, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Domains</p>
              <div className="space-y-0.5">
                {recentLoading ? (
                  <div className="px-2.5 py-2 text-[11px] text-zinc-500">Loading…</div>
                ) : (
                  monitoredSites.map((site) => (
                    <button
                      key={site.domain}
                      type="button"
                      onClick={() => { handleSelectDomain(site.domain); setPopoverOpen(false); }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors',
                        site.domain === selectedDomain
                          ? 'font-semibold text-white bg-white/[0.08]'
                          : 'font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]',
                      )}
                    >
                      <img
                        src={getFaviconUrl(site.domain, 32)}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded-sm"
                      />
                      <span className="truncate">{site.domain}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-1.5 border-t border-white/[0.06] pt-1.5">
                <button
                  type="button"
                  onClick={() => { setPopoverOpen(false); setShowAddInput(true); }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-300 hover:bg-white/[0.05]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add domain
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

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
        {!mounted || recentLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg px-3 py-2">
              <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-2 w-12 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </div>
          ))
        ) : (
          monitoredSites.map((site) => renderDomainButton(site))
        )}
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

// ── SidebarOnboardingProgress ──────────────────────────────────────────

function SidebarOnboardingProgress({ collapsed }: { collapsed?: boolean }) {
  const onboarding = useOnboarding();
  const [hovered, setHovered] = useState(false);

  if (!onboarding || onboarding.allComplete || onboarding.dismissed) return null;

  const { completedCount, totalSteps, progressPct } = onboarding;

  if (collapsed) {
    return (
      <div className="flex justify-center px-1 py-2">
        <Link
          href="/dashboard"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/[0.04]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
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
          <SidebarTooltip label={`Setup ${completedCount}/${totalSteps}`} show={hovered} />
        </Link>
      </div>
    );
  }

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

// ── Main sidebar export ────────────────────────────────────────────────

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  const reportParam = searchParams.get('report');
  const tabParam = searchParams.get('tab') as BrandTabId | null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tier, loading: planLoading } = usePlan();
  const { collapsed, toggle, mounted } = useSidebarCollapsed();
  const mobilePanelRef = useRef<HTMLElement>(null);

  const isOnBrand = pathname === '/brand';
  const isOnPrompts = pathname === '/prompts';
  const isOnContentStudio = pathname === '/content-studio';
  const promptTab = isOnPrompts ? (searchParams.get('tab') as PromptTabId | null) : null;
  const csTab = isOnContentStudio ? (searchParams.get('tab') as ContentStudioTabId | null) : null;

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

  const { remainingCount } = useActionChecklistCount();

  // ── Keyboard shortcut: Cmd+B / Ctrl+B ──────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  // ── Mobile focus trap ──────────────────────────────────────────────
  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMobile();
        return;
      }
      if (e.key !== 'Tab' || !mobilePanelRef.current) return;

      const focusable = mobilePanelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // ── Render sidebar content ─────────────────────────────────────────
  function renderSidebarContent(isCollapsed: boolean) {
    return (
      <div className={cn('flex h-full flex-col', isCollapsed ? 'overflow-visible' : 'overflow-hidden')}>
        {/* ── Fixed header: logo + collapse toggle ──────────────────── */}
        <div className={cn(
          'shrink-0 flex h-14 items-center',
          isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-5'
        )}>
          {isCollapsed ? (
            <Link href="/" className="flex items-center justify-center" onClick={closeMobile}>
              <AisoLogo className="h-7 w-7" />
            </Link>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2.5" onClick={closeMobile}>
                <AisoBrand
                  logoClassName="h-7 w-7"
                  textClassName="text-[15px]"
                  wordmarkVariant="dark"
                />
              </Link>
              <div className="flex-1" />
            </>
          )}
          <button
            type="button"
            onClick={toggle}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
            title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar (${mounted && typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '\u2318' : 'Ctrl'}+B)`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ── Scrollable middle: domains + nav ──────────────────────── */}
        <div
          className={cn(
            'min-h-0 flex-1',
            isCollapsed
              ? 'overflow-visible'
              : 'overflow-y-auto overflow-x-hidden',
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
                <SidebarDomainList onCloseMobile={closeMobile} collapsed={isCollapsed} />
              </div>
            </>
          )}

          {hasDomainContext && <SidebarOnboardingProgress collapsed={isCollapsed} />}

          {/* Nav separator */}
          <div className="mx-3 border-t border-white/[0.06]" />

          {/* Main nav */}
          <nav className={cn('mt-2 space-y-0.5 pb-2', isCollapsed ? 'px-2' : 'px-3')}>
            {NAV_ITEMS.slice(0, 3).map((item) => {
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
                  collapsed={isCollapsed}
                  badge={item.key === 'actions' ? remainingCount : undefined}
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
              collapsed={isCollapsed}
              onClick={closeMobile}
            />

            {NAV_ITEMS.slice(3).map((item) => {
              const requiredTier = NAV_GATES[item.key] ?? 'free';
              const isLocked = !planLoading && !canAccess(tier, requiredTier);

              if (item.key === 'prompts') {
                return (
                  <PromptsNavItem
                    key={item.key}
                    isOnPrompts={isOnPrompts}
                    activeTab={promptTab}
                    reportParam={reportParam}
                    locked={isLocked}
                    collapsed={isCollapsed}
                    onClick={closeMobile}
                  />
                );
              }

              const href = WORKSPACE_KEYS.has(item.key)
                ? buildNavHref(item.href, reportParam)
                : item.href;
              return (
                <NavItem
                  key={item.key}
                  item={{ ...item, href }}
                  active={item.matchFn(pathname, section)}
                  locked={isLocked}
                  collapsed={isCollapsed}
                  badge={item.key === 'actions' ? remainingCount : undefined}
                  onClick={closeMobile}
                />
              );
            })}

            {/* Content Studio — expandable with sub-tabs */}
            <ContentStudioNavItem
              isOnContentStudio={isOnContentStudio}
              activeTab={csTab}
              reportParam={reportParam}
              locked={!planLoading && !canAccess(tier, NAV_GATES['content-studio'] ?? 'free')}
              collapsed={isCollapsed}
              onClick={closeMobile}
            />
          </nav>
        </div>

        {/* ── Fixed footer: settings + pricing ──────────────────────── */}
        <div className="shrink-0">
          <div className="mx-3 border-t border-white/[0.06]" />
          <nav className={cn('space-y-0.5 py-2', isCollapsed ? 'px-2' : 'px-3')}>
            <NavItem
              item={{ ...SETTINGS_ITEM, href: buildNavHref(SETTINGS_ITEM.href, reportParam) }}
              active={SETTINGS_ITEM.matchFn(pathname, section)}
              locked={!planLoading && !canAccess(tier, NAV_GATES.settings ?? 'free')}
              collapsed={isCollapsed}
              onClick={closeMobile}
            />
            {isFree && (
              <NavItem
                item={PRICING_ITEM}
                active={PRICING_ITEM.matchFn(pathname, section)}
                collapsed={isCollapsed}
                onClick={closeMobile}
              />
            )}
          </nav>
        </div>
      </div>
    );
  }

  // Gate collapsed on mounted to avoid SSR hydration mismatch —
  // server always renders expanded, client matches on first paint,
  // then collapses after hydration if localStorage says so.
  const effectiveCollapsed = mounted && collapsed;
  const desktopWidth = effectiveCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

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
      <motion.aside
        className="hidden md:flex md:shrink-0 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 md:border-r md:border-[var(--sidebar-border)] md:bg-[var(--sidebar-bg)] sidebar-texture"
        animate={mounted ? { width: desktopWidth } : undefined}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: desktopWidth, overflow: effectiveCollapsed ? 'visible' : 'hidden' }}
      >
        {renderSidebarContent(effectiveCollapsed)}
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60"
              onClick={closeMobile}
              role="button"
              tabIndex={0}
              aria-label="Close navigation"
            />
            {/* Sidebar panel */}
            <motion.aside
              ref={mobilePanelRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-[var(--sidebar-width)] border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-2xl"
            >
              <button
                type="button"
                onClick={closeMobile}
                className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-zinc-400 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
              {renderSidebarContent(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
