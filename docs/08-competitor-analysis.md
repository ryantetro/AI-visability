# Competitor Analysis System

## What it does

Allows users to track up to 3 competitor URLs per monitored domain. Each competitor gets a full scan (crawl + AI mention tests), and results are displayed in rich side-by-side comparisons including battle cards, an engine heatmap, and a share of voice donut chart.

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/011_user_competitors.sql` | Database migration for `user_competitors` table |
| `src/types/competitors.ts` | TypeScript interfaces for competitor data |
| `src/lib/competitor-service.ts` | Supabase CRUD operations (add, list, get, update, delete, count) |
| `src/app/api/competitors/add/route.ts` | POST — add competitor + trigger scan |
| `src/app/api/competitors/list/route.ts` | GET — list competitors with enriched scan data |
| `src/app/api/competitors/[id]/route.ts` | DELETE — remove a competitor |
| `src/app/api/competitors/[id]/rescan/route.ts` | POST — re-scan a competitor |
| `src/app/competitors/page.tsx` | Page entry point (uses WorkspaceShell) |
| `src/app/competitors/competitors-dashboard.tsx` | Main orchestrator component |
| `src/app/competitors/add-competitor-form.tsx` | URL input form with favicon preview |
| `src/app/competitors/competitor-scan-progress.tsx` | Compact scan progress bar |
| `src/app/competitors/competitor-kpi-row.tsx` | 4-card KPI summary row |
| `src/app/competitors/battle-card.tsx` | Animated VS comparison card |
| `src/app/competitors/engine-heatmap.tsx` | AI engine mention rate grid |
| `src/app/competitors/share-of-voice-donut.tsx` | Recharts donut chart with animated center label |

## How it works

### Data flow

1. User clicks "Add Competitor" and enters a URL
2. `POST /api/competitors/add` validates the URL, checks the 3-competitor limit, inserts a `user_competitors` row, and calls `startScan()` from `scan-workflow.ts`
3. The scan runs asynchronously (same pipeline as regular scans)
4. The dashboard polls `GET /api/competitors/list` which enriches each competitor with scan data (scores, mention summary) by joining against the `scans` table
5. Stale status auto-correction: if a scan is complete but the competitor record still says "scanning", the list endpoint fixes it

### Database table

```sql
CREATE TABLE user_competitors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL REFERENCES user_profiles(id),
  domain           text NOT NULL,           -- user's monitored domain
  competitor_url   text NOT NULL,           -- full URL
  competitor_domain text NOT NULL,          -- normalized domain
  scan_id          text REFERENCES scans(id),
  status           text NOT NULL DEFAULT 'pending',
  added_at         timestamptz NOT NULL DEFAULT now(),
  last_scanned_at  timestamptz,
  UNIQUE(user_id, domain, competitor_domain)
);
```

### Visualizations

- **KPI Row**: Your Score, Avg Competitor Score, Your Rank, Share of Voice
- **Share of Voice Donut**: Recharts PieChart with animated center counter, normalized from each brand's `visibilityPct`
- **Battle Cards**: framer-motion animated cards with dual ScoreRings (winner gets green glow), 5 metric comparison bars (AI Visibility, Mention Rate, Avg Position, Sentiment, SOV)
- **Engine Heatmap**: CSS grid with color-coded cells (red → yellow → green) showing mention rate per AI engine per brand

## API Contracts

### POST /api/competitors/add
**Request:** `{ competitorUrl: string, domain: string }`
**Response:** `{ id: string, scanId: string | null, competitorDomain: string }`
**Errors:** 400 (invalid URL, self-scan, limit reached), 401 (not authenticated), 409 (duplicate)

### GET /api/competitors/list?domain=example.com
**Response:** `CompetitorComparisonData` — includes `userBrand` baseline and `competitors[]` with enriched scan data

### DELETE /api/competitors/[id]
**Response:** `{ success: true }`
**Errors:** 401, 403 (not owner), 404

### POST /api/competitors/[id]/rescan
**Response:** `{ scanId: string, status: "scanning" }`
**Errors:** 401, 403, 404

## Error Handling

- Invalid URLs rejected at API level with descriptive messages
- Self-domain detection prevents adding your own site as competitor
- Duplicate detection via unique constraint (user_id, domain, competitor_domain)
- Failed scans show error state with retry button
- Stale scan status auto-corrected on list fetch
- Missing mention data renders "--" fallbacks in all visualizations

## Configuration

- **Max competitors per domain:** 3 (hardcoded in add route)
- **Scan polling interval:** 5 seconds (dashboard), 3 seconds (progress bar)
- **Feature gate:** Uses existing `competitors` NAV_GATE from pricing system
- **RLS:** Service role only access via Supabase policies
