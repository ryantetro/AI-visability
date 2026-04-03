# Analytics Page

Full-page data dashboard at `/analytics` providing a consolidated view of AI crawler traffic, referral traffic, score trends, prompt analytics, and platform mention rates.

## Key Files

| File | Role |
|------|------|
| `src/app/analytics/page.tsx` | Page route with `WorkspaceShell` wrapper |
| `src/app/advanced/analytics/analytics-section.tsx` | Main section component with KPI row, charts, ranked lists |
| `src/components/app/dashboard-sidebar.tsx` | Sidebar nav item (`BarChart3` icon, between History and Leaderboard) |
| `src/components/layout/conditional-layout.tsx` | Added `/analytics` to `WORKSPACE_PREFIXES` for Suspense + DomainContext |
| `src/lib/pricing.ts` | `NAV_GATES.analytics = 'starter'` |

## How It Works

1. **WorkspaceShell** handles auth, domain selection, plan gating, and loading states.
2. **AnalyticsSection** receives workspace context and renders:
   - KPI row (Total Crawls, AI Referrals, Mention Rate, AI Visibility Score)
   - Shared time range picker (7d / 14d / 30d / 90d / All)
   - Two-column line charts: AI Crawler Traffic + AI Referral Traffic
   - Two-column ranked lists: Top Providers + Top Referral Engines
   - Full-width MonitoringTrendsPanel (score trends over time)
   - Full-width PromptAnalyticsPanel (mention rate by engine over weeks)
   - PlatformSnapshot chip row (per-engine mention rates)

## Data Sources

- Crawler data: `GET /api/crawler-visits?domain=&days=`
- Referral data: `GET /api/referral-visits?domain=&days=`
- Score trends: `recentScans` from workspace context
- Prompt analytics: `GET /api/prompts/trends?domain=` (fetched internally by PromptAnalyticsPanel)
- Platform breakdown: `report.mentionSummary.engineBreakdown` from workspace context

## Configuration

- **Nav gate**: `analytics: 'starter'` in `NAV_GATES` — free users see a locked overlay
- **"All time" handling**: Sends `days=3650` to the API instead of `days=0` to avoid the cutoff-equals-now bug

## Error Handling

- API fetch failures are silently handled; charts show empty states
- WorkspaceShell handles auth redirects, missing domains, and plan gating
- Loading spinners shown while data is being fetched
