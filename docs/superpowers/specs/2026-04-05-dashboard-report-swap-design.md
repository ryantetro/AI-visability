# Dashboard/Report Swap, Scoring Weights, Glitch Fix & Deep-Linking

**Date:** 2026-04-05
**Status:** Approved

## Summary

Four coordinated changes to improve the AISO user experience:

1. **Page Swap** - Move the detailed report breakdown to `/dashboard` (home) and the action-oriented KPI view to `/report`
2. **Scoring Weight Adjustment** - Reduce Performance and Trust weights from 0.5 to 0.25 to emphasize AI visibility and mentions
3. **Fix Now / Keep Doing Glitch** - Resolve layout shift caused by async state resolving after initial render
4. **Clickable Action Cards** - Convert Fix Now items to navigable links with auto-scroll deep-linking

---

## Change 1: Page Swap

### What Changes

The detailed report breakdown (currently `/report`) becomes the homepage at `/dashboard`. The action-oriented KPI/fix-now view (currently `/dashboard`) moves to `/report`.

### Files & Changes

| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Render `ReportSection` instead of `DashboardSection`. Pass `ctx.files`, `ctx.onOpenUnlock`, `ctx.domain`, `ctx.handleReaudit`, `ctx.reauditing` props. Move `markReportViewed()` onboarding logic and tracking CTA from old report page. |
| `src/app/report/page.tsx` | Render `DashboardSection` instead of `ReportSection`. Pass all required props: `report`, `recentScans`, `domain`, `lastScannedAt` (from `ctx.expandedSite.lastTouchedAt`), `monitoringConnected`, `monitoringLoading`, `onEnableMonitoring`, `onReaudit`, `reauditing`. |
| `src/lib/workspace-nav.ts` | Update `dashboardTrackingHref` and `dashboardMonitoringHref` to point to `/report` (where the action view with `#tracking` and `#monitoring` anchors now lives). Update `reportHref` to build `/dashboard` URLs (where the detailed report now lives). |
| `src/components/app/workspace-shell.tsx` | Update `NoDomainState` autoStart condition: change `sectionKey === 'report'` to `sectionKey === 'dashboard'` since the detailed report (landing flow target) now lives at `/dashboard`. |

### Key Decisions

- **Swap rendered components, not file locations.** Keep route files at `/dashboard` and `/report` but change which section component each renders. Minimal diff, no broken imports.
- **Onboarding tracking** (`markReportViewed()`) moves to `/dashboard/page.tsx` since that's where the full report now lives.
- **sectionKey** in `WorkspaceShell` stays matched to the URL path for sidebar highlighting.
- **NoDomainState autoStart** logic must update since the landing page flow targets the report view, which is now at `/dashboard`.
- **Prop wiring:** `ReportSection` requires `files` and `onOpenUnlock` from `WorkspaceContext`; `DashboardSection` requires `lastScannedAt` from `ctx.expandedSite.lastTouchedAt`. Both are available on `WorkspaceContext`.

### Verification Points

After the swap, these indirect behaviors change due to `workspace-nav.ts` updates:
- `fix-now-column.tsx` line 113: "View all N fixes" link uses `reportHref(reportId)` which will now point to `/dashboard` (correct: that's where the full report lives)
- `keep-doing-column.tsx` lines 48-49: `dashboardMonitoringHref` and `dashboardTrackingHref` will point to `/report` (correct: that's where the action view with those anchors lives)
- `DashboardSection` retains its internal `id="tracking"` and `id="monitoring"` anchors after being rendered at `/report`

---

## Change 2: Scoring Weight Adjustment

### Weight Changes

| Weight | Old | New |
|--------|-----|-----|
| `WEIGHT_AI_VISIBILITY` | 1.0 | 1.0 (unchanged) |
| `WEIGHT_PERFORMANCE` | 0.5 | 0.25 |
| `WEIGHT_TRUST` | 0.5 | 0.25 |
| `WEIGHT_MENTIONS` | 1.0 | 1.0 (unchanged) |
| `WEIGHT_WEB_HEALTH_AGGREGATE` | 0.5 | 0.25 |

### Impact

- AI Visibility + Mentions now control ~80% of the overall score (up from ~67%).
- Performance and Trust become supplementary signals rather than equal partners.
- Existing database scores are unaffected; only new scans and display calculations use new weights.

### Files & Changes

| File | Change |
|------|--------|
| `src/lib/scoring-weights.ts` | Update 3 constants: `WEIGHT_PERFORMANCE`, `WEIGHT_TRUST`, `WEIGHT_WEB_HEALTH_AGGREGATE` from 0.5 to 0.25. Derived sums auto-recalculate. |

---

## Change 3: Fix Now / Keep Doing Glitch Fix

### Root Cause

In `dashboard-section.tsx`, `trackingReady` initializes as `false` and updates after an async fetch to `/api/user/tracking-key`. This causes:

1. Initial render: `trackingReady=false` shows "Install AI bot tracking" card
2. Fetch resolves: `trackingReady=true` removes the card, causing layout shift

### Solution

Add a `trackingLoading` loading state. While `true`, render skeleton placeholders in the Keep Doing column. Only render the final conditional items once all async data has resolved.

### Skeleton Design

- 3 placeholder rows matching current item dimensions (~44px height each)
- Animated pulse effect (`animate-pulse`) consistent with existing loading patterns
- Same border/background styling as real items for seamless transition

### `trackingLoading` Implementation Detail

In `dashboard-section.tsx`:
1. Add `const [trackingLoading, setTrackingLoading] = useState(true);`
2. In the tracking-key `useEffect`, set `setTrackingLoading(false)` in both the `.then()` success path AND the `.catch()` error path
3. Add a 5-second safety timeout inside the same `useEffect`: `const timer = setTimeout(() => setTrackingLoading(false), 5000);` — clean up with `clearTimeout(timer)` in the effect cleanup function
4. Pass `trackingLoading` through `ActionCenter` to `KeepDoingColumn`

### Files & Changes

| File | Change |
|------|--------|
| `src/app/advanced/dashboard/dashboard-section.tsx` | Add `trackingLoading` state (default `true`, set `false` after tracking-key fetch succeeds or fails, plus 5s safety timeout). Pass to `ActionCenter`. |
| `src/app/advanced/dashboard/action-center.tsx` | Accept and forward `trackingLoading` prop to `KeepDoingColumn`. |
| `src/app/advanced/dashboard/keep-doing-column.tsx` | Accept `trackingLoading` prop. Show 3 skeleton rows while `true`, render final items when `false`. |

---

## Change 4: Clickable Action Cards with Deep-Linking

### Dimension-to-Section Mapping

New utility function `dimensionToSection()` in `workspace-nav.ts`. Maps `DimensionKey | WebHealthPillarKey` values (from `PrioritizedFix.dimension` type in `src/types/score.ts`) to report section anchor IDs:

```
# DimensionKey values:
file-presence      -> #section-ai-readiness
structured-data    -> #section-ai-readiness
content-signals    -> #section-content-authority
topical-authority  -> #section-content-authority
entity-clarity     -> #section-content-authority
ai-registration    -> #section-ai-readiness

# WebHealthPillarKey values:
performance        -> #section-performance-security
quality            -> #section-website-quality
security           -> #section-performance-security
```

Note: The valid dimension values come from the union type `DimensionKey | WebHealthPillarKey` defined in `src/types/score.ts`. There are exactly 9 possible values. The function returns `null` for any unrecognized dimension.

### Fix Now Cards

- Convert fix items from `<div>` to `<Link>` components
- Build href using `dashboardSectionHref(reportId, fix.dimension)` which maps dimension to the correct `#section-*` hash
- If `dimensionToSection()` returns `null` for an unknown dimension, fall back to a plain `<div>` (non-navigable)
- Copy button uses `e.stopPropagation()` to prevent navigation when copying
- After page swap, these links navigate to `/dashboard#section-*` (the detailed report)

### Auto-Scroll on Report Page (now `/dashboard`)

- `report-section.tsx` already has `id="section-*"` anchors with `scroll-mt-4` classes
- Add a `useEffect` that reads `window.location.hash` on mount
- If hash matches a section, scroll it into view with `{ behavior: 'smooth', block: 'start' }`
- Sections are already visible (not collapsed), so no accordion expansion needed

### Keep Doing Cards

Already have `href` props and are `<Link>` components. Destination URLs will auto-update since they use the nav helpers (`dashboardTrackingHref`, `dashboardMonitoringHref`, etc.) which are updated in Change 1.

### Files & Changes

| File | Change |
|------|--------|
| `src/lib/workspace-nav.ts` | Add `dimensionToSection()` map and `dashboardSectionHref()` helper |
| `src/app/advanced/dashboard/fix-now-column.tsx` | Convert fix `<div>` to `<Link>` using dimension-based href. Fall back to `<div>` for unknown dimensions. |
| `src/app/advanced/report/report-section.tsx` | Add hash-based auto-scroll `useEffect` |

---

## Implementation Order

1. **Scoring weights** (isolated, no dependencies)
2. **Glitch fix** (isolated, no dependencies)
3. **Deep-linking** (add mapping + convert fix cards to links)
4. **Page swap** (depends on deep-linking being done since nav helpers change)

This order minimizes risk: changes 1 and 2 are independent, change 3 adds new capabilities, and change 4 ties everything together.

---

## Error Handling

- **Missing hash target:** If `window.location.hash` doesn't match any section ID, no scroll occurs (graceful no-op)
- **Missing dimension mapping:** If `dimensionToSection()` returns `null`, the Fix Now card renders as a non-navigable `<div>` rather than linking to a wrong section
- **Fetch failures:** `trackingLoading` is set to `false` in the `.catch()` handler. Additionally, a 5-second `setTimeout` in the same `useEffect` acts as a safety net, ensuring skeletons never persist indefinitely. The timeout is cleared on effect cleanup to prevent stale state updates.

---

## Testing

- Verify `/dashboard` shows the full report breakdown after swap
- Verify `/report` shows the action KPI view after swap
- Verify sidebar active states match current page
- Verify `NoDomainState` autoStart landing flow still works at `/dashboard`
- Verify `ReportSection` receives `files` and `onOpenUnlock` props correctly on `/dashboard`
- Verify `DashboardSection` receives `lastScannedAt` prop correctly on `/report`
- Verify score changes are reflected in new scans (compare old vs new weight output)
- Verify Keep Doing column shows skeletons, then final items without layout shift
- Verify skeletons resolve on fetch failure (not infinite loading)
- Verify clicking a Fix Now card navigates to `/dashboard#section-*` and scrolls to correct section
- Verify copy button on Fix Now cards still works without triggering navigation
- Verify "View all N fixes" link in Fix Now column points to `/dashboard` (the full report)
- Verify Keep Doing "Monitor rankings weekly" and "Install AI bot tracking" links point to `/report#monitoring` and `/report#tracking`
- Verify all 9 dimension values (`DimensionKey` + `WebHealthPillarKey`) map to valid section anchors
