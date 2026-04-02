# Light Theme + Dashboard Overhaul

## What Changed

1. **Theme** — App shell moved from dark surfaces to a light theme driven by CSS variables in `src/app/globals.css`, plus hardcoded Tailwind classes updated to gray/white equivalents on dashboard primitives, sidebar, header, and key dashboard sections.
2. **Scoring** — Overall score weights speed and trust higher; pillar label “Performance” renamed to “Site Speed”. See [23-score-page-overhaul.md](./23-score-page-overhaul.md#updated-score-formula-april-2026).
3. **Dashboard layout** — Action funnel first: KPI row → **Your Action Plan** → **Quick Wins** → prompt performance + competitors → platform performance → analytics → monitoring → traffic panels.

## Key Files

| Area | Files |
|------|--------|
| Theme tokens | `src/app/globals.css` |
| Shell chrome | `src/components/app/dashboard-primitives.tsx`, `dashboard-sidebar.tsx`, `dashboard-header-bar.tsx` |
| Scoring | `src/lib/scorer/index.ts`, `src/lib/web-health/index.ts` |
| Dashboard | `src/app/advanced/dashboard/dashboard-section.tsx`, `action-plan-section.tsx`, `quick-wins-section.tsx`, `prompt-rankings-section.tsx`, `empty-state-card.tsx` |

## New Components

- **`ActionPlanSection`** — Three phases: fix ranking → improve AI presence → monitor & grow; optional “Get Expert Help” CTA for free users with fixable issues.
- **`PromptRankingsSection`** — Groups prompts by mention rate, surfaces gaps, content/expert CTA.
- **`QuickWinsSection`** (enhanced) — Up to five fixes with copy action and “Fix My Site” CTA.

## Dashboard Section Order

1. Onboarding checklist (when shown)  
2. Opportunity alert (when present)  
3. Scan / rescan row  
4. KPI cards (AI visibility, average rank, mention rate)  
5. Action plan  
6. Quick wins  
7. Two columns: prompt performance + competitor rankings  
8. Platform performance  
9. Prompt analytics  
10. Monitoring trends (`#monitoring` on panel)  
11. AI crawler (`#tracking`) and referral panels  

`NextStepsCard` was removed from the dashboard; its guidance is covered by the action plan.

## Configuration

No new environment variables. Theme is global (single `:root` light palette).

## Error Handling

Unchanged: empty mention results show an empty-state card in the prompts column; `PromptRankingsSection` returns `null` when there are no mention rows.
