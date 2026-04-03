# Brand / Improve Tab Redesign

## What It Does

Replaces the Improve tab’s vertical stack (summary cards, hidden content gaps, nested workstream accordions, always-visible prompt library) with a dashboard-style 4-zone layout: borderless KPI header, two-column action center, filterable fix list, and a collapsible prompt library.

## Key Files

| File | Role |
|------|------|
| `src/app/advanced/brand/improve-section.tsx` | Orchestrator — wires zones, copy handlers, content gaps hook |
| `src/app/advanced/brand/improve-header.tsx` | Zone 1 — KPI row: total fixes, quick wins, content gaps count, est. lift |
| `src/app/advanced/brand/improve-action-center.tsx` | Zone 2 — Fix Now (top 3 by ROI) + Content Gaps (top 3, expandable) |
| `src/app/advanced/brand/improve-fix-list.tsx` | Zone 3 — Workstream filter tabs + flat `FixCard` list (`#improve-fix-list`) |
| `src/app/advanced/hooks/use-content-gaps.ts` | Shared fetch/transform for content gaps from `GET /api/prompts` |
| `src/app/advanced/panels/content-gaps-section.tsx` | Refactored to use `useContentGaps` (for reuse outside Improve) |
| `src/app/advanced/brand/brand-section.tsx` | Improve tab renders `<ImproveSection />` only |

## How It Works

1. **Zone 1** — Derived from `report.score.fixes` / `report.fixes` and `useContentGaps(domain)` (no new APIs).
2. **Zone 2** — Top 3 fixes by `roi`; gaps from the same hook as Zone 1. “See all fixes” scrolls to `#improve-fix-list`. “View all gaps” expands the gap list and shows the strategy tip.
3. **Zone 3** — `getGroupedFixes` drives tabs (`All` + each workstream). Fixes sorted by `roi` within the active filter. Reuses `FixCard` and `matchFixToFile`.
4. **Zone 4** — `CollapsibleSection` (`defaultOpen={false}`) wraps unchanged `PromptLibraryPanel`.

## API Contracts

- Same as before: `GET /api/prompts?domain=` for gaps (shared with prompt library).

## Error Handling

- Gaps: loading state in header (—) and action column; empty copy when no gaps.
- No fixes: `ImproveFixList` shows a single empty-state panel.

## Configuration

- None beyond existing plan hooks (`tier`, `maxPrompts`) for the prompt library.
