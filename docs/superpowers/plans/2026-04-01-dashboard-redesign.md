# Dashboard Redesign Plan

## Goal
Redesign the dashboard to feel like a professional analytics dashboard. Elevate actions (fixes, prompt optimization) and drive users to pay for implementation (Fix My Site $499).

## New Layout

### Row 1: Welcome Header
- "Your AI Visibility Overview" + domain name
- Last scanned timestamp + Rescan button (right-aligned)

### Row 2: 4 KPI Cards (was 3)
1. AI Visibility Score (green, 0-100)
2. Average Rank (blue, #X)
3. Brand Mention Rate (purple, X%)
4. **Potential Lift (NEW)** (amber, +X pts — shows opportunity)

### Row 3: Action Banner (replaces ActionPlanSection)
- Full-width gradient banner: "X fixes available — boost your score by +Y points"
- CTAs: "View Fixes" (scroll) + "Get Expert Help" (Fix My Site link)

### Row 4: Prompt Performance Table (replaces PromptRankingsSection)
- Kretya-style data table with columns: Prompt, Top Engine, Visibility %, Top Competitor, Status
- Groups mention results by prompt text
- Shows top 8 rows + "View all" link
- Bottom CTA for expert help

### Row 5: Two-column
- LEFT: Platform Breakdown — horizontal bars per engine (ChatGPT 80%, Perplexity 60%, etc.)
- RIGHT: Quick Fixes — existing QuickWinsSection

### Row 6: Score Trends (full width)
- Existing MonitoringTrendsPanel

### Row 7: Two-column
- LEFT: AI Crawler Panel
- RIGHT: AI Referral Panel

### Row 8: Prompt Analytics (feature-gated, as-is)

## Files to Create
1. `src/app/advanced/dashboard/action-banner.tsx` (~40 lines)
2. `src/app/advanced/dashboard/platform-breakdown.tsx` (~80 lines)
3. `src/app/advanced/dashboard/prompt-performance-table.tsx` (~160 lines)

## Files to Modify
4. `src/app/advanced/dashboard/dashboard-section.tsx` — full JSX restructure

## Files Unchanged
- monitoring-trends-panel.tsx, ai-crawler-panel.tsx, ai-referral-panel.tsx
- prompt-analytics-panel.tsx, empty-state-card.tsx, quick-wins-section.tsx
- All lib/utils files

## Components Replaced (become unused)
- action-plan-section.tsx (replaced by action-banner.tsx)
- prompt-rankings-section.tsx (replaced by prompt-performance-table.tsx)

## No New API Calls
All data already exists — this is purely a layout reorganization.

## Implementation Order
1. Create action-banner.tsx
2. Create platform-breakdown.tsx
3. Create prompt-performance-table.tsx
4. Rewrite dashboard-section.tsx layout
5. Verify TypeScript + build
