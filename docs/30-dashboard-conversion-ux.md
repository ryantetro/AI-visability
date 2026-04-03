# Dashboard conversion UX: next steps, mention insights, workspace links

## What it does

- Centralizes overall score weights in `src/lib/scoring-weights.ts` (used by `scorer` and `public-score`).
- Adds a **Your next steps** strip on the home dashboard (fix baseline → improve AI answers → track ongoing).
- Explains **why the AI Mentions score is what it is** for unpaid users (aggregate-only copy; no prompt text) on the full report and analysis report.
- Fixes in-app links to the Fix My Site / articles flow: **`/brand?tab=services`** with optional `?report=` (replacing the non-existent `/fix-my-site` page route).

## Key files

| File | Role |
|------|------|
| `src/lib/scoring-weights.ts` | Weight constants + `computeOverallFromPillars`, `computePublicOverallScore` |
| `src/lib/workspace-nav.ts` | `withReportQuery`, `brandServicesHref`, `reportHref`, `dashboardTrackingHref` |
| `src/lib/mention-insights.ts` | `buildMentionScoreInsights` (bullet text from engine breakdown) |
| `src/components/app/mention-why-score-callout.tsx` | UI callout + optional unlock CTA |
| `src/app/advanced/dashboard/next-steps-strip.tsx` | Numbered 1–2–3 next steps |
| `src/app/advanced/dashboard/dashboard-section.tsx` | Composes strip, passes `reportId` into actions |
| `src/app/advanced/dashboard/prompt-rankings-table.tsx` | Services links + low-rate row CTA |
| `src/app/advanced/dashboard/keep-doing-column.tsx` | Articles CTA → `brandServicesHref` |
| `src/app/advanced/report/report-section.tsx` | Mention callout when `!hasPaid` |
| `src/app/analysis/analysis-client.tsx` | Same callout when gated |
| `tests/scoring-weights.test.cjs` | Weight helper tests |

## Configuration

No new environment variables. Tune weights in `src/lib/scoring-weights.ts` only; keep `scorer` and `public-score` in sync via shared helpers.
