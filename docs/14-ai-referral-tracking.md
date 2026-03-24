# AI Referral Tracking

Detects human visitors arriving at a customer's site via click-through links from AI engine answers (ChatGPT, Perplexity, Gemini, Claude, Copilot) and displays traffic analytics on the dashboard.

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/013_ai_referral_visits.sql` | Database table and indexes |
| `src/types/services.ts` | `SourceEngine`, `ReferralVisit`, `ReferralVisitService` types |
| `src/lib/services/supabase-referral-visits.ts` | Supabase implementation of ReferralVisitService |
| `src/lib/services/mock-referral-visits.ts` | In-memory mock for dev/test |
| `src/lib/services/registry.ts` | `getReferralVisits()` factory |
| `src/app/api/track/route.ts` | POST handler — referral branch (`t === 'ref'`) |
| `src/app/api/referral-visits/route.ts` | GET endpoint — authenticated dashboard query |
| `src/lib/llm-prompts.ts` | Snippet generation with `AI_REFERRERS` block |
| `src/app/advanced/panels/ai-referral-panel.tsx` | Dashboard panel component |
| `src/app/advanced/lib/constants.ts` | `REFERRER_ENGINE_ORDER`, labels, colors |
| `src/app/advanced/lib/types.ts` | `ReferralTrafficSummary` type |
| `src/app/advanced/dashboard/dashboard-section.tsx` | Mounts the panel |
| `src/app/advanced/settings/settings-section.tsx` | Updated "How it works" copy |

## How It Works

1. **Snippet detection**: The tracking snippet (installed in the customer's middleware) checks the `Referer` header against known AI engine hostnames.
2. **Event posting**: When a match is found, the snippet sends a `{ t: 'ref', se: engine, ref: refererUrl, p: pathname }` payload to `/api/track`.
3. **Storage**: The `/api/track` POST handler validates the source engine and writes to `ai_referral_visits` via `ReferralVisitService.logVisit()`.
4. **Dashboard query**: The `/api/referral-visits` GET endpoint fetches visits for 2x the requested period, builds a zero-filled daily engine timeline, and computes trend percentages.
5. **Panel display**: `AIReferralPanel` renders a Recharts line chart with one line per engine, plus a sidebar showing engine rankings, visit counts, trends, and unique landing pages.

## API Contracts

### POST /api/track (referral branch)

**Request:**
```json
{ "sk": "stk_...", "t": "ref", "se": "chatgpt", "ref": "https://chatgpt.com/c/123", "p": "/pricing", "ua": "Mozilla/5.0..." }
```

**Response:** `{ "ok": true }` (200) or error (400/401/429/500)

### GET /api/referral-visits

**Query params:** `domain` (required), `days` (optional, default 30)

**Response:**
```json
{
  "engineTimeline": [{ "date": "2026-03-01", "chatgpt": 5, "perplexity": 2 }],
  "engineSummaries": [{ "engine": "chatgpt", "visits": 42, "trend": 15, "uniquePages": 8 }],
  "totalVisits": 64
}
```

## Error Handling

- Invalid source engine -> 400
- Invalid/missing site key -> 401
- Rate limit exceeded (shared 500/domain/hour) -> 429
- Referrer URL capped at 2048 chars to prevent payload abuse
- `referrer_url` is nullable -- browsers may strip the Referer header

## Configuration

- No additional env vars required -- uses existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Referral tracking activates when customers reinstall the latest snippet version
- Existing snippets without the referrer block continue working (backward compatible)
