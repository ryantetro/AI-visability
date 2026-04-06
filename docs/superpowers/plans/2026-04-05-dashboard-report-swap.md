# Dashboard/Report Swap, Scoring, Glitch Fix & Deep-Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap dashboard and report page content, adjust scoring weights, fix action card loading glitch, and add deep-linking from Fix Now cards to report sections.

**Architecture:** Four independent-then-dependent changes. Changes 1-2 (scoring weights, glitch fix) are isolated. Change 3 (deep-linking) adds navigation utilities. Change 4 (page swap) ties everything together by rewiring which component each route renders and updating navigation helpers.

**Tech Stack:** Next.js App Router, React (client components), TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-05-dashboard-report-swap-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/scoring-weights.ts` | Modify | Update 3 weight constants from 0.5 to 0.25 |
| `src/app/advanced/dashboard/dashboard-section.tsx` | Modify | Add `trackingLoading` state + 5s safety timeout, pass to ActionCenter |
| `src/app/advanced/dashboard/action-center.tsx` | Modify | Accept and forward `trackingLoading` prop |
| `src/app/advanced/dashboard/keep-doing-column.tsx` | Modify | Accept `trackingLoading`, render skeleton while loading |
| `src/lib/workspace-nav.ts` | Modify | Add `dimensionToSection()` map, `dashboardSectionHref()` helper, swap URL paths in existing helpers |
| `src/app/advanced/dashboard/fix-now-column.tsx` | Modify | Convert fix `<div>` to `<Link>` with dimension-based deep-link href |
| `src/app/advanced/report/report-section.tsx` | Modify | Add hash-based auto-scroll `useEffect` |
| `src/app/dashboard/page.tsx` | Modify | Render `ReportSection` instead of `DashboardSection` |
| `src/app/report/page.tsx` | Modify | Render `DashboardSection` instead of `ReportSection` |
| `src/components/app/workspace-shell.tsx` | Modify | Update NoDomainState autoStart condition |

---

## Task 1: Update Scoring Weights

**Files:**
- Modify: `src/lib/scoring-weights.ts:6-11`

- [ ] **Step 1: Update the three weight constants**

In `src/lib/scoring-weights.ts`, change lines 7-8 and 11:

```typescript
// Before:
export const WEIGHT_PERFORMANCE = 0.5;
export const WEIGHT_TRUST = 0.5;
// ...
export const WEIGHT_WEB_HEALTH_AGGREGATE = 0.5;

// After:
export const WEIGHT_PERFORMANCE = 0.25;
export const WEIGHT_TRUST = 0.25;
// ...
export const WEIGHT_WEB_HEALTH_AGGREGATE = 0.25;
```

The derived constants `SUM_AV_PERFORMANCE_TRUST` and `SUM_AV_WEB_FALLBACK` on lines 13-15 auto-recalculate from these values.

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors. Only constant values changed, no type changes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring-weights.ts
git commit -m "feat: reduce speed/trust scoring weights to emphasize AI visibility and mentions"
```

---

## Task 2: Fix Keep Doing Column Loading Glitch

**Files:**
- Modify: `src/app/advanced/dashboard/dashboard-section.tsx:50-67`
- Modify: `src/app/advanced/dashboard/action-center.tsx:7-13,15-21,28-35`
- Modify: `src/app/advanced/dashboard/keep-doing-column.tsx:21-27,39-45,112-163`

### Step 2a: Add `trackingLoading` state to DashboardSection

- [ ] **Step 1: Add state declaration**

In `src/app/advanced/dashboard/dashboard-section.tsx`, after line 50 (`const [trackingReady, setTrackingReady] = useState(false);`), add:

```typescript
const [trackingLoading, setTrackingLoading] = useState(true);
```

- [ ] **Step 2: Update the tracking-key useEffect to set loading false on success and failure**

Replace the existing `useEffect` (lines 54-67) with:

```typescript
useEffect(() => {
  if (!domain) return;
  let cancelled = false;
  const timer = setTimeout(() => {
    if (!cancelled) setTrackingLoading(false);
  }, 5000);
  fetch(`/api/user/tracking-key?domain=${encodeURIComponent(domain)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!cancelled && data) {
        setTrackingReady(Boolean(data.siteKey));
        setTrackingLastUsedAt(typeof data.lastUsedAt === 'string' ? data.lastUsedAt : null);
      }
    })
    .catch(() => {})
    .finally(() => {
      if (!cancelled) setTrackingLoading(false);
    });
  return () => { cancelled = true; clearTimeout(timer); };
}, [domain]);
```

Key changes: added `timer` for 5s safety timeout, added `.finally()` to set `trackingLoading` to `false` on both success and error, and cleanup clears the timer.

- [ ] **Step 3: Pass `trackingLoading` to ActionCenter**

In the same file, update the `<ActionCenter>` JSX (around line 141) to include the new prop:

```tsx
<ActionCenter
  fixes={fixes}
  monitoringConnected={monitoringConnected}
  trackingReady={trackingReady}
  trackingLoading={trackingLoading}
  maxCompetitors={maxCompetitors}
  reportId={report.id}
/>
```

### Step 2b: Forward `trackingLoading` through ActionCenter

- [ ] **Step 4: Update ActionCenter interface and component**

In `src/app/advanced/dashboard/action-center.tsx`:

Add `trackingLoading` to the interface:

```typescript
interface ActionCenterProps {
  fixes: PrioritizedFix[];
  monitoringConnected: boolean;
  trackingReady: boolean;
  trackingLoading: boolean;
  maxCompetitors: number;
  reportId?: string | null;
}
```

Destructure it and pass to `KeepDoingColumn`:

```tsx
export function ActionCenter({
  fixes,
  monitoringConnected,
  trackingReady,
  trackingLoading,
  maxCompetitors,
  reportId,
}: ActionCenterProps) {
  // ... existing hasStructuredDataFixes logic ...

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FixNowColumn fixes={fixes} reportId={reportId} />
      <KeepDoingColumn
        monitoringConnected={monitoringConnected}
        trackingReady={trackingReady}
        trackingLoading={trackingLoading}
        hasStructuredDataFixes={hasStructuredDataFixes}
        maxCompetitors={maxCompetitors}
        reportId={reportId}
      />
    </div>
  );
}
```

### Step 2c: Add skeleton loading to KeepDoingColumn

- [ ] **Step 5: Update KeepDoingColumn to accept `trackingLoading` and show skeletons**

In `src/app/advanced/dashboard/keep-doing-column.tsx`:

Add `trackingLoading` to the interface:

```typescript
interface KeepDoingColumnProps {
  monitoringConnected: boolean;
  trackingReady: boolean;
  trackingLoading: boolean;
  hasStructuredDataFixes: boolean;
  maxCompetitors: number;
  reportId?: string | null;
}
```

Destructure it in the component:

```typescript
export function KeepDoingColumn({
  monitoringConnected,
  trackingReady,
  trackingLoading,
  hasStructuredDataFixes,
  maxCompetitors,
  reportId,
}: KeepDoingColumnProps) {
```

Replace the `<div className="mt-3 space-y-2">` items rendering block (lines 118-161) with:

```tsx
<div className="mt-3 space-y-2">
  {trackingLoading ? (
    /* Skeleton placeholders while async data resolves */
    Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5"
      >
        <span className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-2 w-48 animate-pulse rounded bg-white/[0.04]" />
        </div>
      </div>
    ))
  ) : (
    items.slice(0, 5).map((item) => {
      const Icon = item.icon;
      return (
        <Link
          key={item.key}
          href={item.href}
          onClick={(e) => {
            const hash = item.href.split('#')[1];
            if (hash) {
              const el = document.getElementById(hash);
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }}
          className={cn(
            'group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
            item.highlight
              ? 'border-[#ffbb00]/15 bg-[#ffbb00]/[0.04] hover:border-[#ffbb00]/25 hover:bg-[#ffbb00]/[0.07]'
              : 'border-white/5 bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]'
          )}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${item.iconColor}15`, color: item.iconColor }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn(
              'truncate text-[12px] font-medium',
              item.highlight ? 'text-white' : 'text-zinc-200'
            )}>
              {item.label}
            </p>
            <p className="truncate text-[10px] text-zinc-500">{item.description}</p>
          </div>
          <ArrowRight className="h-3 w-3 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
        </Link>
      );
    })
  )}
</div>
```

- [ ] **Step 6: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/advanced/dashboard/dashboard-section.tsx src/app/advanced/dashboard/action-center.tsx src/app/advanced/dashboard/keep-doing-column.tsx
git commit -m "fix: add skeleton loading to Keep Doing column to prevent layout shift glitch"
```

---

## Task 3: Add Deep-Linking Utilities and Clickable Fix Cards

**Files:**
- Modify: `src/lib/workspace-nav.ts:1-37`
- Modify: `src/app/advanced/dashboard/fix-now-column.tsx:1-122`
- Modify: `src/app/advanced/report/report-section.tsx` (add useEffect near top)

### Step 3a: Add dimension-to-section mapping to workspace-nav

- [ ] **Step 1: Add `dimensionToSection()` and `dashboardSectionHref()` to workspace-nav.ts**

First, add the type import at line 1 of `src/lib/workspace-nav.ts` (before the existing JSDoc comment):

```typescript
import type { DimensionKey, WebHealthPillarKey } from '@/types/score';
```

Then append the following to the end of the same file:

```typescript
/** Map a fix dimension to its report section anchor ID. Returns null for unknown dimensions. */
const DIMENSION_SECTION_MAP: Record<string, string> = {
  'file-presence': 'section-ai-readiness',
  'structured-data': 'section-ai-readiness',
  'content-signals': 'section-content-authority',
  'topical-authority': 'section-content-authority',
  'entity-clarity': 'section-content-authority',
  'ai-registration': 'section-ai-readiness',
  'performance': 'section-performance-security',
  'quality': 'section-website-quality',
  'security': 'section-performance-security',
};

export function dimensionToSection(dimension: DimensionKey | WebHealthPillarKey): string | null {
  return DIMENSION_SECTION_MAP[dimension] ?? null;
}

/** Build a dashboard URL that deep-links to a specific report section. */
export function dashboardSectionHref(
  reportId: string | null | undefined,
  dimension: DimensionKey | WebHealthPillarKey,
): string | null {
  const section = dimensionToSection(dimension);
  if (!section) return null;
  return reportHref(reportId, section);
}
```

Note: `reportHref` already supports a `hash` parameter (line 23-25 of existing file), so `dashboardSectionHref` delegates to it.

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

### Step 3b: Convert Fix Now cards to clickable Links

- [ ] **Step 3: Update fix-now-column.tsx to use `<Link>` for fix items**

In `src/app/advanced/dashboard/fix-now-column.tsx`:

Update the existing import on line 8 from:

```typescript
import { reportHref } from '@/lib/workspace-nav';
```

to:

```typescript
import { reportHref, dashboardSectionHref } from '@/lib/workspace-nav';
```

Replace the fix item rendering block (lines 59-105, the `topFixes.map(...)` section) with:

```tsx
topFixes.map((fix, i) => {
  const sectionHref = dashboardSectionHref(reportId, fix.dimension);
  const Wrapper = sectionHref ? Link : 'div';
  const wrapperProps = sectionHref ? { href: sectionHref } : {};

  return (
    <Wrapper
      key={fix.checkId}
      {...wrapperProps}
      className="group flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
    >
      <span className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        i === 0 ? 'bg-[#ffbb00]/15 text-[#ffbb00]' : 'bg-white/[0.06] text-zinc-400'
      )}>
        {i + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12px] font-medium text-zinc-200">{fix.label}</p>
          <span className={cn(
            'shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase',
            fix.category === 'ai'
              ? 'bg-[#a855f7]/15 text-[#a855f7]'
              : 'bg-[#3b82f6]/15 text-[#3b82f6]'
          )}>
            {fix.category === 'ai' ? 'AI' : 'Web'}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-[10px] font-semibold text-[#25c972]">
        +{fix.estimatedLift}pts
      </span>
      <span className={cn(
        'shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold',
        fix.effortBand === 'quick'
          ? 'bg-[#25c972]/10 text-[#25c972]'
          : fix.effortBand === 'medium'
            ? 'bg-[#ffbb00]/10 text-[#ffbb00]'
            : 'bg-[#ff8a1e]/10 text-[#ff8a1e]'
      )}>
        {fix.effortBand.charAt(0).toUpperCase() + fix.effortBand.slice(1)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCopy(fix, i);
        }}
        className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
        aria-label="Copy fix"
      >
        {copiedIdx === i ? <Check className="h-3 w-3 text-[#25c972]" /> : <Copy className="h-3 w-3" />}
      </button>
    </Wrapper>
  );
})
```

Key changes:
- `sectionHref` computed from `dashboardSectionHref(reportId, fix.dimension)`
- If `sectionHref` is truthy, uses `Link`; otherwise falls back to `'div'`
- Copy button gets `e.preventDefault()` and `e.stopPropagation()` to prevent navigation

### Step 3c: Add auto-scroll on hash to report-section

- [ ] **Step 4: Add hash-based auto-scroll useEffect to report-section.tsx**

In `src/app/advanced/report/report-section.tsx`:

First, update the React import on line 2. The current import is:

```typescript
import { useState } from 'react';
```

Change it to:

```typescript
import { useState, useEffect } from 'react';
```

Then add a `useEffect` inside the `ReportSection` component (near the top of the component body, after any existing hooks):

```typescript
useEffect(() => {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;
  // Small delay to ensure DOM is rendered
  const timer = setTimeout(() => {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
  return () => clearTimeout(timer);
}, []);
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/workspace-nav.ts src/app/advanced/dashboard/fix-now-column.tsx src/app/advanced/report/report-section.tsx
git commit -m "feat: add deep-linking from Fix Now cards to report sections with auto-scroll"
```

---

## Task 4: Swap Dashboard and Report Pages

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/report/page.tsx`
- Modify: `src/lib/workspace-nav.ts:23-36`
- Modify: `src/components/app/workspace-shell.tsx:350`

### Step 4a: Update navigation helpers

- [ ] **Step 1: Swap URL paths in workspace-nav.ts**

In `src/lib/workspace-nav.ts`, update the three functions that hard-code paths:

**`reportHref`** (currently builds `/report` URLs) — change to build `/dashboard` URLs:

```typescript
/** Full report (now lives at /dashboard) with optional section hash. */
export function reportHref(reportId: string | null | undefined, hash?: string): string {
  const path = withReportQuery('/dashboard', reportId);
  return hash ? `${path}#${hash.replace(/^#/, '')}` : path;
}
```

**`dashboardTrackingHref`** (currently builds `/dashboard#tracking`) — change to `/report#tracking`:

```typescript
/** Action view (now lives at /report) with hash for AI bot tracking panel. */
export function dashboardTrackingHref(reportId: string | null | undefined): string {
  return `${withReportQuery('/report', reportId)}#tracking`;
}
```

**`dashboardMonitoringHref`** (currently builds `/dashboard#monitoring`) — change to `/report#monitoring`:

```typescript
/** Action view (now lives at /report) with hash for monitoring section. */
export function dashboardMonitoringHref(reportId: string | null | undefined): string {
  return `${withReportQuery('/report', reportId)}#monitoring`;
}
```

### Step 4b: Rewrite dashboard/page.tsx to render ReportSection

- [ ] **Step 2: Replace dashboard/page.tsx content**

Replace the entire content of `src/app/dashboard/page.tsx` with:

```typescript
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Code2, ArrowRight } from 'lucide-react';
import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ReportSection } from '@/app/advanced/report/report-section';
import { useOnboarding } from '@/hooks/use-onboarding';
import type { WorkspaceContext } from '@/components/app/workspace-shell';

function DashboardContent({ ctx }: { ctx: WorkspaceContext }) {
  const { markReportViewed, steps } = useOnboarding();
  const trackingInstalled = steps.find((s) => s.key === 'install_tracking')?.completed;

  useEffect(() => {
    if (ctx.report) {
      markReportViewed();
    }
  }, [ctx.report, markReportViewed]);

  return (
    <>
      <ReportSection
        report={ctx.report}
        files={ctx.files}
        domain={ctx.domain}
        onReaudit={ctx.handleReaudit}
        reauditing={ctx.reauditing}
        onOpenUnlock={ctx.onOpenUnlock}
      />
      {!trackingInstalled && (
        <div className="mt-6 rounded-[1.35rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,13,14,0.98)_0%,rgba(8,8,9,0.99)_100%)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a855f7]/10">
              <Code2 className="h-5 w-5 text-[#a855f7]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-white">Want to see which AI bots visit your site?</p>
              <p className="mt-0.5 text-[12px] text-zinc-500">Install the tracking script to monitor AI crawler traffic in real time.</p>
            </div>
            <Link
              href="/settings#tracking"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.12]"
            >
              Go to Settings
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <WorkspaceShell sectionKey="dashboard">
      {(ctx) => <DashboardContent ctx={ctx} />}
    </WorkspaceShell>
  );
}
```

### Step 4c: Rewrite report/page.tsx to render DashboardSection

- [ ] **Step 3: Replace report/page.tsx content**

Replace the entire content of `src/app/report/page.tsx` with:

```typescript
'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { DashboardSection } from '@/app/advanced/dashboard/dashboard-section';

export default function ReportPage() {
  return (
    <WorkspaceShell sectionKey="report">
      {(ctx) => (
        <DashboardSection
          report={ctx.report}
          recentScans={ctx.recentScans}
          domain={ctx.domain}
          lastScannedAt={ctx.expandedSite.lastTouchedAt}
          monitoringConnected={ctx.monitoringConnected}
          monitoringLoading={ctx.monitoringLoading}
          onEnableMonitoring={ctx.handleEnableMonitoring}
          onReaudit={ctx.handleReaudit}
          reauditing={ctx.reauditing}
        />
      )}
    </WorkspaceShell>
  );
}
```

### Step 4d: Update NoDomainState autoStart condition

- [ ] **Step 4: Update workspace-shell.tsx autoStart condition**

In `src/components/app/workspace-shell.tsx`, line 350, change:

```typescript
// Before:
const resumeLandingFlow = sectionKey === 'report' && searchParams.get('autoStart') === '1' && Boolean(prefilledDomain);

// After:
const resumeLandingFlow = sectionKey === 'dashboard' && searchParams.get('autoStart') === '1' && Boolean(prefilledDomain);
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Verify application in browser**

Run: `npm run dev` (or check existing dev server)

Verify:
1. `/dashboard` shows the full detailed report breakdown
2. `/report` shows the action-oriented KPI/Fix Now/Keep Doing view
3. Sidebar highlights correct page
4. Fix Now card items are clickable and navigate to `/dashboard#section-*`
5. Auto-scroll works when landing on `/dashboard#section-website-quality` etc.
6. Copy button on Fix Now cards still works without navigating
7. Keep Doing "Monitor rankings weekly" links to `/report#monitoring`
8. Keep Doing "Install AI bot tracking" links to `/report#tracking`
9. "View all N fixes" link goes to `/dashboard` (the full report)
10. Keep Doing column loads with skeletons, then settles without layout shift

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/report/page.tsx src/lib/workspace-nav.ts src/components/app/workspace-shell.tsx
git commit -m "feat: swap dashboard and report pages - detailed report is now home, action view moves to /report"
```

---

## Task 5: Final Verification & Documentation

**Files:**
- Modify: `docs/00-overview.md` (if needed, add reference to this change)

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 2: Run existing tests**

Run: `npm test` (or `npx jest` / `npx vitest` depending on test runner)
Expected: All existing tests pass. Some may need path/assertion updates if they reference specific page content.

- [ ] **Step 3: Manual browser verification checklist**

Walk through each item from the spec's Testing section:
- [ ] `/dashboard` shows the full report breakdown
- [ ] `/report` shows the action KPI view
- [ ] Sidebar active states match current page
- [ ] NoDomainState autoStart landing flow works at `/dashboard`
- [ ] ReportSection receives `files` and `onOpenUnlock` props correctly
- [ ] DashboardSection receives `lastScannedAt` prop correctly
- [ ] Keep Doing column shows skeletons, then final items without layout shift
- [ ] Skeletons resolve on fetch failure (not infinite loading)
- [ ] Clicking a Fix Now card navigates to `/dashboard#section-*` and scrolls
- [ ] Copy button on Fix Now cards works without triggering navigation
- [ ] "View all N fixes" link points to `/dashboard`
- [ ] Keep Doing monitoring/tracking links point to `/report#monitoring` and `/report#tracking`

- [ ] **Step 4: Commit any test fixes**

If any tests needed updates:

```bash
git add -A
git commit -m "test: update tests for dashboard/report page swap"
```
