# AI Traffic Analysis

## What it does

Displays AI crawler traffic data grouped by **provider** (ChatGPT, Perplexity, Gemini, Claude) as a new "Traffic" tab on the brand page (`/brand`). Shows a daily multi-line chart alongside a "Top Providers" leaderboard with visit counts, progress bars, and trend percentages comparing the current period to the previous equivalent period.

## Key files

| File | Role |
|------|------|
| `src/app/advanced/panels/ai-crawler-panel.tsx` | Main UI panel — chart + leaderboard |
| `src/app/api/crawler-visits/route.ts` | API route returning provider timeline + summaries |
| `src/app/advanced/brand/brand-section.tsx` | Brand page — "Traffic" tab wiring |
| `src/app/advanced/lib/constants.ts` | `BOT_TO_PROVIDER`, `PROVIDER_DISPLAY_ORDER`, `PROVIDER_LABELS` |
| `src/app/advanced/lib/types.ts` | `ProviderTrafficSummary` type |
| `src/lib/services/supabase-crawler-visits.ts` | Supabase query (limit 2000) |

## How it works

1. **Bot-to-provider mapping**: Each bot name (GPTBot, ClaudeBot, GoogleOther, Google-CloudVertexBot, etc.) is mapped to a provider key (`chatgpt`, `claude`, `gemini`, etc.) using a shared crawler catalog.
2. **API route**: Fetches `days * 2` of visits, splits into current/previous periods. Builds:
   - `providerTimeline`: Zero-filled daily rows with visit counts per provider
   - `providerSummaries`: Aggregated visits, unique paths, and trend % per provider
   - Legacy `timeline` (weekly, per-bot) for backward compatibility
3. **Trend calculation**: `((current - previous) / previous) * 100`, rounded. If no previous data and current > 0, shows +100%.
4. **UI panel**: Side-by-side layout with a Recharts `LineChart` (daily buckets, styled dots, glow filter, CartesianGrid) and a ranked leaderboard sidebar (hidden on mobile).
5. **"Other" provider**: Shown in sidebar if >0 visits; shown in chart only if ≥5% of total.

## API contracts

### GET `/api/crawler-visits?domain=example.com&days=30`

**Response** (new fields added alongside existing ones):

```json
{
  "summaries": [{ "botName": "GPTBot", "botCategory": "indexing", "visitCount": 100, "uniquePaths": 20, "lastSeen": "..." }],
  "timeline": [{ "week": "2026-03-10", "GPTBot": 5 }],
  "totalVisits": 235,
  "providerTimeline": [{ "date": "2026-03-01", "chatgpt": 12, "perplexity": 5, "gemini": 3, "claude": 2, "other": 0 }],
  "providerSummaries": [{ "provider": "chatgpt", "visits": 235, "trend": 18, "uniquePaths": 42 }]
}
```

## Google / Gemini caveat

Google's crawler docs treat **`Google-Extended` as a `robots.txt` control token, not a distinct HTTP user-agent string**. The tracking layer therefore detects live Google crawler signals such as `GoogleOther` and `Google-CloudVertexBot`, while still mapping legacy stored `Google-Extended` rows to Gemini in analytics. This means a Gemini prompt will not always generate a fresh crawler hit: Google may answer from content it already has in the Google Search index.

## Install signal (empty state)

The dashboard reads `GET /api/user/tracking-key?domain=…` for `siteKey` and **`lastUsedAt`** (mirrors `site_tracking_keys.last_used_at`, updated when `/api/track` accepts an event). The crawler panel empty state explains:

- **Key but no `lastUsedAt`**: no events received from production yet — empty chart is expected until the first bot or referral ping.
- **`lastUsedAt` set**: install is reaching the API; the crawler chart can still be empty if there were no bot hits in the selected period (referrals are separate).

## Error handling

- API errors return JSON `{ error: string }` with appropriate HTTP status
- UI shows a loading spinner during fetch, empty state message when no visits exist
- Fetch failures are silently caught (panel remains hidden)

## Configuration

- No new env vars required
- Uses existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for data access
- Period selector: 14d / 30d / 90d (default 30d)
