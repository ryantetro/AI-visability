# Dashboard Redesign — 5-Zone Layout

## What It Does

Replaces the original 12-section vertical stack dashboard with a focused 5-zone layout inspired by DataFast-style KPI dashboards. The redesign prioritizes action guidance over data density: users see their score, know what to fix immediately, and understand ongoing actions that drive value.

## Key Files

| File | Role |
|------|------|
| `src/app/advanced/dashboard/dashboard-section.tsx` | Orchestrator — renders all 5 zones, manages shared state (tracking, opportunity alert) |
| `src/app/advanced/dashboard/score-header.tsx` | Zone 1 — Borderless KPI row: AI Visibility (dominant), Rank, Mention Rate with deltas and rescan |
| `src/app/advanced/dashboard/action-center.tsx` | Zone 2 — Wrapper composing Fix Now + Keep Doing columns |
| `src/app/advanced/dashboard/fix-now-column.tsx` | Zone 2 left — Top 3 fixes with lift/effort badges; shows onboarding steps for new users |
| `src/app/advanced/dashboard/keep-doing-column.tsx` | Zone 2 right — Ongoing revenue-driving actions (articles CTA, monitoring, tracking, competitors) |
| `src/app/advanced/dashboard/prompt-rankings-table.tsx` | Zone 3 — DataFast-style prompt performance table with engine icons and mention rate bars |
| `src/app/advanced/dashboard/platform-snapshot.tsx` | Zone 4 — Compact horizontal engine chips replacing the 6-column card grid |
| `src/components/app/dashboard-primitives.tsx` | Shared primitives — `CollapsibleSection` wraps Zone 5 |
| `src/app/advanced/panels/monitoring-trends-panel.tsx` | Zone 5 — Unchanged, now inside collapsible section |
| `src/app/advanced/panels/prompt-analytics-panel.tsx` | Zone 5 — Unchanged, inside collapsible section |
| `src/app/advanced/panels/ai-crawler-panel.tsx` | Zone 5 — Unchanged, inside collapsible section |
| `src/app/advanced/panels/ai-referral-panel.tsx` | Zone 5 — Unchanged, inside collapsible section |

## How It Works

### Layout

```
Zone 1: Score Header     — 3-col KPI row (no panel wrapper, numbers on page bg)
Zone 2: Action Center    — 2-col grid: Fix Now (left) + Keep Doing (right)
Zone 3: Prompt Rankings  — Full-width table with engine icons, rank, rate, bar
Zone 4: Platform Snapshot — Horizontal chip row for engine breakdown
Zone 5: Analytics        — Collapsible section wrapping 4 existing panels
```

### Data Flow

All data comes from existing props passed to `DashboardSection` — no new API calls:

- `report.score.scores` → Zone 1 KPIs
- `report.score.fixes` → Zone 2 Fix Now column
- `report.mentionSummary.results` → Zone 3 prompt table
- `AI_ENGINES` + `mentions.engineBreakdown` → Zone 4 platform chips
- `monitoringConnected`, `trackingReady`, `tier` → Zone 2 Keep Doing conditionals
- `recentScans`, `domain`, tracking state → Zone 5 panels (unchanged)

### Zone 2: Action Center Logic

**Fix Now (left column):**
- New users (onboarding incomplete): shows remaining onboarding steps as numbered action items
- Returning users: top 3 prioritized fixes with category tag, estimated lift, effort badge, and copy button
- Links to `/report` for full fix list

**Keep Doing (right column):**
1. "Get AI-optimized articles" → `/fix-my-site` (always shown, highlighted)
2. "Monitor rankings weekly" → `#monitoring` (if monitoring not connected)
3. "Add structured data" → `/report` (if structured-data fixes exist)
4. "Install AI bot tracking" → `#tracking` (if tracking not installed)
5. "Track your competitors" → `/competitors` (if tier allows)

### Zone 3: Prompt Rankings Table

Groups `mentionResults` by prompt text, aggregates across engines. Each row shows:
- Prompt text (truncated)
- Engine icons (colored if mentioned, dimmed if not)
- Best rank position
- Mention rate percentage with color-coded bar

Sorted by mention rate descending, top 8 shown. Footer CTA links to `/fix-my-site`.

### Zone 5: Below-Fold Collapsible

Uses `CollapsibleSection` from `dashboard-primitives.tsx`. Default closed. Contains the same 4 panels as before (Prompt Analytics, Monitoring Trends, AI Crawler, AI Referral) — internally unchanged.

## Error Handling

- Empty states: each zone handles missing data gracefully (dashes, empty messages, ghost rows)
- New domains with no scans show onboarding-focused Fix Now and empty prompt table
- Platform Snapshot returns `null` when no engine data exists

## Configuration

No new env vars. Feature gating uses existing `tier` and `maxCompetitors` from `usePlan()` hook.
