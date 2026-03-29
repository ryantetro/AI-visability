# Monitoring & Email Alerts

## What it does

Automated monitoring runs periodic scans on user domains and sends email alerts (via Resend) when a domain's AI visibility score drops below the user's configured threshold.

## Key files

| File | Role |
|------|------|
| `src/lib/services/resend-alerts.ts` | Resend AlertService implementation — sends styled HTML score alerts |
| `src/lib/monitoring-alerts.ts` | Mock AlertService (console.log only, used in dev/test) |
| `src/lib/services/registry.ts` | `getAlertService()` — returns Resend if `RESEND_API_KEY` set, mock otherwise |
| `src/lib/monitoring.ts` | CRUD for `monitoring_domains` table (add, remove, list) |
| `src/app/api/monitoring/route.ts` | POST to enable monitoring, GET to list user's monitored domains |
| `src/app/api/monitoring/[domain]/route.ts` | PATCH to toggle opportunity alerts, DELETE to disable monitoring |
| `src/app/api/opportunity-alert/route.ts` | GET opportunity alert summary for a domain |
| `src/lib/opportunity-alerts.ts` | Opportunity computation: thresholds, summaries, cooldown logic |
| `src/app/advanced/dashboard/opportunity-alert-banner.tsx` | Dashboard banner for opportunity alerts |
| `src/app/api/cron/monitor/route.ts` | Cron job: Phase 0 rescans, Phase 1 score alerts, Phase 1b opportunity alerts, Phase 2 prompt monitoring |
| `src/contexts/domain-context.tsx` | Client-side monitoring state — hydrates from DB, enable/disable handlers |
| `src/app/advanced/settings/settings-section.tsx` | Settings UI — enable/disable monitoring toggle |

## How it works

### Enable/disable flow
1. User clicks "Enable" in Settings → calls `POST /api/monitoring` with `scanId`
2. Server creates a row in `monitoring_domains` with `status: 'active'` and `alert_threshold: 5`
3. Client sets `monitoringConnected[domain] = true`
4. On page load, `GET /api/monitoring` hydrates monitoring state from DB
5. User clicks "Disable" → calls `DELETE /api/monitoring/{domain}` → removes DB row

### Cron job (runs via external scheduler)
Called with `GET /api/cron/monitor` + `Authorization: Bearer {MONITORING_SECRET}`:

- **Phase 0**: For each active monitored domain, if last scan is older than 24h, triggers a rescan (default **1** per run via `CRON_MAX_RESCANS_PER_RUN`, max 5). Full rescans are expensive; multiple rescans in one HTTP invocation often hit Vercel’s **~300s** serverless limit and return **504 / FUNCTION_INVOCATION_TIMEOUT**.
- **Phase 1**: For each active monitored domain, checks latest scan score against the domain's `alert_threshold`. If score is below threshold, calls `alertService.sendScoreAlert()`
- **Phase 1b**: AI Opportunity Alerts — for each active domain with `opportunityAlertsEnabled=true`, computes a 30-day opportunity summary. If crawlerVisits >= 25, referralVisits <= 2, and crawl-to-referral ratio >= 20:1, sends `alertService.sendOpportunityAlert()`. Respects a 7-day cooldown via `lastOpportunityAlertAt`.
- **Phase 2**: Prompt monitoring — tests active prompts against AI engines (capped per run by **`CRON_MAX_PROMPT_ENGINE_CALLS`** default `80` to reduce timeouts; response JSON includes `promptMonitoring.budgetExhausted` when cut short)

### Email delivery
When `RESEND_API_KEY` is set, `getAlertService()` returns `resendAlertService` which sends a styled HTML email via Resend's API. The email includes:
- Current score with color coding (green/orange/red)
- Alert threshold
- Link to dashboard
- Dark-themed HTML matching the app's design

When `RESEND_API_KEY` is not set (or `USE_MOCKS=true`), falls back to `mockAlertService` which logs to console.

## API contracts

### POST /api/monitoring
**Request:** `{ scanId: string, alertThreshold?: number }`
**Response:** `MonitoringRecord` (201) or `{ error: string }` (400/401)

### GET /api/monitoring
**Response:** `{ domains: MonitoringRecord[] }` — user's monitored domains

### PATCH /api/monitoring/{domain}
**Request:** `{ opportunityAlertsEnabled: boolean }`
**Response:** Updated `MonitoringRecord` (200) or `{ error: string }` (400/401/404)

### DELETE /api/monitoring/{domain}
**Response:** `{ success: true }` (200) or `{ error: string }` (404/401)

### GET /api/opportunity-alert?domain=...
**Response:** `{ opportunity: OpportunityAlertSummary | null }` — returns null when domain is not monitored, alerts disabled, or threshold not met

## Error handling

- Missing `RESEND_API_KEY` → graceful fallback to mock (no crash)
- Invalid recipient email → skipped with console warning
- Resend API failure → error propagates to cron response JSON (doesn't crash the cron job)
- Cron phase failures are isolated — Phase 1 error doesn't block Phase 2

## Configuration

| Env var | Required | Description |
|---------|----------|-------------|
| `RESEND_API_KEY` | For real emails | Resend API key from https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | No | Sender address (default: `AISO Alerts <alerts@aiso.so>`) — must be verified in Resend |
| `MONITORING_SECRET` | For cron | Bearer token to authenticate cron job requests |
| `USE_MOCKS` | No | Set to `true` to force mock alert service |

### GitHub Actions: Scheduled Monitoring Re-scans

Workflow: `.github/workflows/monitoring-cron.yml` runs `scripts/run-monitoring.mjs`, which calls `GET {APP_URL}/api/cron/monitor` with `Authorization: Bearer {MONITORING_SECRET}`.

1. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**.
2. Add **`MONITORING_SECRET`** — use the **same** value as in production (e.g. Vercel env for `MONITORING_SECRET`).
3. Add **`APP_URL`** — your public site origin with **no** trailing slash, e.g. `https://your-app.vercel.app`.  
   Alternatively you can add **`NEXT_PUBLIC_APP_URL`** instead of `APP_URL`; the workflow passes whichever is available.

If either the secret or the URL secret is missing, the **Run monitoring cron** step is skipped and a **warning** is printed — the job **succeeds** so CI does not fail. To actually run scheduled rescans, both must be set.

### Vercel timeouts (504)

The cron route exports **`maxDuration = 300`** (seconds). If work still exceeds the limit (many prompts × engines, or a long **Phase 0** rescan), Vercel returns **504** with `FUNCTION_INVOCATION_TIMEOUT`. Mitigations:

| Mitigation | How |
|------------|-----|
| Fewer inline rescans | Set **`CRON_MAX_RESCANS_PER_RUN=0`** to skip Phase 0, or keep default **`1`** |
| Smaller Phase 2 batches | Lower **`CRON_MAX_PROMPT_ENGINE_CALLS`** (e.g. `40`) or raise it only if you have a higher platform limit |
| Longer functions | Vercel Pro max is typically **300s** for this pattern; Enterprise / Fluid can go higher |

Optional env vars (production / Vercel):

| Variable | Default | Description |
|----------|---------|-------------|
| `CRON_MAX_RESCANS_PER_RUN` | `1` | Full site rescans started per cron invocation (0–5). Each rescan can take many minutes. |
| `CRON_MAX_PROMPT_ENGINE_CALLS` | `80` | Max successful `tester.query` calls in Phase 2 per invocation (hard cap 400). |
