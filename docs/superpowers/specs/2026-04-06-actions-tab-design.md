# Actions Tab — Guided Action Plan

## Summary

A new sidebar tab ("Actions") that aggregates all scan-derived fixes and setup tasks into a single guided, prioritized action plan. Users can manually check off items for immediate feedback, while re-scans serve as the source of truth — automatically verifying completions and detecting regressions.

## Data Model

### Table: `action_checklist`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK to `auth.users` |
| `domain` | text | The monitored domain |
| `check_id` | text | Matches `PrioritizedFix.checkId` or keep-doing key |
| `action_type` | text | `'fix'` or `'keep_doing'` |
| `manual_status` | text | `'pending'` or `'done'` |
| `scan_status` | text | `'pass'` / `'fail'` / `'unknown'` (from latest scan) |
| `last_scan_id` | uuid | Nullable, references the scan that last updated this row |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**Unique constraint:** `(user_id, domain, check_id)`

### Resolution & Regression Logic

An action's effective status is derived server-side:

- **Complete:** `scan_status = 'pass'` OR `manual_status = 'done'`
- **Regression:** `manual_status = 'done'` AND `scan_status = 'fail'` — the user marked it done, but the latest scan says it's still failing

On regression, `manual_status` is **not** mutated. Both columns are preserved. The API response includes a derived `is_regression` boolean (computed as `manual_status = 'done' AND scan_status = 'fail'`). The UI shows an amber warning on regression items, and they count as **incomplete** in progress totals (scan truth wins for counting purposes).

Effective completion for counts: `scan_status = 'pass'` OR (`manual_status = 'done'` AND `scan_status != 'fail'`).

### RLS Policies

- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

## Sidebar Integration

- **Position:** After Dashboard and Report but before Brand. In the code, inserted at index 2 of `NAV_ITEMS`. The sidebar render splits at `slice(0, 3)` (was `slice(0, 2)`) to include Dashboard, Report, and Actions before the Brand sub-nav injection.
- **Icon:** `ListChecks` from lucide-react
- **Route:** `/actions`
- **Nav key:** `'actions'` added to `NAV_ITEMS` array and `WORKSPACE_KEYS` set
- **Plan gate:** `NAV_GATES.actions = 'free'` — available to all tiers since it aggregates existing scan data
- **Badge count:** The `useActionChecklist` hook stores `summary.remaining` in a React context (`ActionChecklistProvider`) mounted in the dashboard layout. The sidebar reads this context for the badge. On first mount (before navigating to /actions), the provider makes a lightweight `GET /api/action-checklist/count?domain=X` call that returns `{ remaining: number }`. This avoids a full sync just for the badge.

## API Routes

### `POST /api/action-checklist`

Two operations via `action` field. **All API payloads use camelCase** to match TypeScript conventions. The service layer handles snake_case conversion for Supabase columns.

#### `sync`

Called on page load. Sends the current scan's fix list + keep-doing items. Server upserts rows, updates `scanStatus`, returns the full merged list with manual statuses.

**Request:**
```json
{
  "action": "sync",
  "domain": "example.com",
  "items": [
    {
      "checkId": "robots-txt-present",
      "actionType": "fix",
      "scanStatus": "fail",
      "label": "Add robots.txt",
      "detail": "...",
      "dimension": "file-presence",
      "category": "ai",
      "estimatedLift": 5,
      "effortBand": "quick",
      "copyPrompt": "..."
    }
  ]
}
```

**Notes on field mapping:**
- `fix` items: `checkId`, `label`, `detail`, `dimension`, `category`, `estimatedLift`, `effortBand`, `copyPrompt` all come directly from `PrioritizedFix`. Fields like `pointsAvailable`, `urgency`, `effort`, `roi`, `instruction`, `actualValue`, `expectedValue` are intentionally omitted — they are used for internal scoring only and not needed in the checklist.
- `keep_doing` items: `dimension` is nullable. Keep-doing keys (`articles`, `monitoring`, `tracking`, `competitors`) do not map to `DimensionKey`. Instead, these items use `dimension: null` and are grouped under a "Setup" section in the "By Category" view.

**Response:**
```json
{
  "items": [
    {
      "checkId": "robots-txt-present",
      "actionType": "fix",
      "manualStatus": "pending",
      "scanStatus": "fail",
      "label": "Add robots.txt",
      "detail": "...",
      "dimension": "file-presence",
      "category": "ai",
      "estimatedLift": 5,
      "effortBand": "quick",
      "copyPrompt": "...",
      "isComplete": false,
      "isRegression": false
    }
  ],
  "summary": {
    "total": 12,
    "complete": 5,
    "remaining": 7,
    "potentialLift": 23
  }
}
```

#### `toggle`

Called on checkbox click.

**Request:**
```json
{
  "action": "toggle",
  "domain": "example.com",
  "checkId": "robots-txt-present",
  "manualStatus": "done"
}
```

**Response:**
```json
{
  "checkId": "robots-txt-present",
  "manualStatus": "done",
  "scanStatus": "fail",
  "isComplete": true,
  "isRegression": true,
  "updatedAt": "2026-04-06T..."
}
```

### `GET /api/action-checklist/count`

Lightweight endpoint for sidebar badge. Returns remaining count without full item data.

**Query params:** `domain` (required)

**Response:**
```json
{
  "remaining": 7
}
```

## Page Layout

### Top: Progress Hero

- Circular progress ring (SVG, matching existing onboarding ring style)
- Text: "7 of 12 actions complete"
- Subtext: "+23 pts possible" (sum of remaining `estimatedLift` values)

### Filter Bar

**View toggles (pill buttons):**
- `By Priority` (default) — flat list sorted by ROI descending
- `By Category` — grouped by `DimensionKey` sections + "Setup" section for keep-doing items (dimension: null)
- `By Effort` — grouped into Quick Wins / Medium Effort / Technical

**Status filter:**
- `All` (default) | `To Do` | `Done`

### Action Cards

Each card contains:
- **Left:** Checkbox (manual toggle, hits API with optimistic update)
- **Title:** Action label
- **Description:** Short detail text
- **Tags:** Category badge (`AI` purple / `Web` blue), effort badge (green/yellow/orange)
- **Right:** Point lift chip (`+5 pts`), copy-prompt button
- **States:**
  - Default: unchecked, normal styling
  - Manually done: checked, slightly faded
  - Scan-verified complete: green checkmark overlay replaces checkbox
  - Regression: amber warning icon with tooltip "This was previously complete but the latest scan found a regression". Item counts as incomplete in progress totals.

### Empty State

When all actions are complete: celebratory message with current score and "Re-scan to find new opportunities" CTA.

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/027_action_checklist.sql` | DB table + RLS policies |
| `src/lib/services/supabase-action-checklist.ts` | Supabase service layer (camelCase ↔ snake_case) |
| `src/app/api/action-checklist/route.ts` | API route (POST sync/toggle) |
| `src/app/api/action-checklist/count/route.ts` | API route (GET badge count) |
| `src/hooks/use-action-checklist.ts` | React hook for data + toggle + filtering |
| `src/contexts/action-checklist-context.tsx` | React context for sharing summary across sidebar |
| `src/app/actions/page.tsx` | Page shell (auth gate, data loading) |
| `src/app/advanced/actions/actions-section.tsx` | Main UI component |
| `src/app/advanced/actions/action-card.tsx` | Individual action card |
| `src/app/advanced/actions/progress-ring.tsx` | Circular progress ring |
| `src/components/app/dashboard-sidebar.tsx` | Add "Actions" nav item + badge |
| `src/components/app/dashboard-layout.tsx` | Mount `ActionChecklistProvider` |

## Error Handling

- API errors: toast notification, optimistic update reverted
- Sync failure on page load: show scan data without manual statuses (graceful degradation)
- Toggle failure: revert checkbox, show retry toast
- Badge count failure: show no badge (silent degradation)
- No scan data: show empty state prompting user to run their first scan
