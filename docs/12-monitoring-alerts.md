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
| `src/app/api/monitoring/[domain]/route.ts` | DELETE to disable monitoring for a domain |
| `src/app/api/cron/monitor/route.ts` | Cron job: Phase 0 rescans, Phase 1 score alerts, Phase 2 prompt monitoring |
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

- **Phase 0**: For each active monitored domain, if last scan is older than 24h, triggers a rescan (max 5 per run)
- **Phase 1**: For each active monitored domain, checks latest scan score against the domain's `alert_threshold`. If score is below threshold, calls `alertService.sendScoreAlert()`
- **Phase 2**: Prompt monitoring — tests active prompts against AI engines

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

### DELETE /api/monitoring/{domain}
**Response:** `{ success: true }` (200) or `{ error: string }` (404/401)

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
