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
| `action_type` | text | `'fix'` / `'keep_doing'` / `'onboarding'` |
| `manual_status` | text | `'pending'` / `'done'` / `'skipped'` |
| `scan_status` | text | `'pass'` / `'fail'` / `'unknown'` (from latest scan) |
| `last_scan_id` | uuid | Nullable, references the scan that last updated this row |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**Unique constraint:** `(user_id, domain, check_id)`

**Resolution logic:** An action is "complete" when `scan_status = 'pass'` OR `manual_status = 'done'`. If a re-scan flips a previously passing check back to `'fail'`, it overrides manual status (regression detection).

### RLS Policies

- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

## Sidebar Integration

- **Position:** Between Dashboard and Report (the two most-used tabs)
- **Icon:** `ListChecks` from lucide-react
- **Route:** `/actions`
- **Badge:** Small count showing outstanding (incomplete) actions
- **Nav key:** `'actions'` added to `NAV_ITEMS` array and `WORKSPACE_KEYS` set

## API Route

### `POST /api/action-checklist`

Two operations via `action` field:

#### `sync`

Called on page load. Sends the current scan's fix list + keep-doing items. Server upserts rows, updates `scan_status`, returns the full merged list with manual statuses.

**Request:**
```json
{
  "action": "sync",
  "domain": "example.com",
  "items": [
    {
      "check_id": "robots-txt-present",
      "action_type": "fix",
      "scan_status": "fail",
      "label": "Add robots.txt",
      "detail": "...",
      "dimension": "file-presence",
      "category": "ai",
      "estimated_lift": 5,
      "effort_band": "quick",
      "copy_prompt": "..."
    }
  ]
}
```

**Response:**
```json
{
  "items": [
    {
      "check_id": "robots-txt-present",
      "action_type": "fix",
      "manual_status": "pending",
      "scan_status": "fail",
      "label": "Add robots.txt",
      "detail": "...",
      "dimension": "file-presence",
      "category": "ai",
      "estimated_lift": 5,
      "effort_band": "quick",
      "copy_prompt": "...",
      "is_complete": false,
      "is_regression": false
    }
  ],
  "summary": {
    "total": 12,
    "complete": 5,
    "remaining": 7,
    "potential_lift": 23
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
  "check_id": "robots-txt-present",
  "manual_status": "done"
}
```

**Response:**
```json
{
  "check_id": "robots-txt-present",
  "manual_status": "done",
  "scan_status": "fail",
  "is_complete": true,
  "updated_at": "2026-04-06T..."
}
```

## Page Layout

### Top: Progress Hero

- Circular progress ring (SVG, matching existing onboarding ring style)
- Text: "7 of 12 actions complete"
- Subtext: "+23 pts possible" (sum of remaining `estimated_lift` values)

### Filter Bar

**View toggles (pill buttons):**
- `By Priority` (default) — flat list sorted by ROI descending
- `By Category` — grouped by `DimensionKey` sections + "Setup" for keep-doing items
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
  - Regression: amber warning icon, tooltip explains "This was previously complete but the latest scan found a regression"

### Empty State

When all actions are complete: celebratory message with current score and "Re-scan to find new opportunities" CTA.

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/027_action_checklist.sql` | DB table + RLS policies |
| `src/lib/services/supabase-action-checklist.ts` | Supabase service layer |
| `src/app/api/action-checklist/route.ts` | API route (POST handler) |
| `src/hooks/use-action-checklist.ts` | React hook for data + toggle + filtering |
| `src/app/actions/page.tsx` | Page shell (auth gate, data loading) |
| `src/app/advanced/actions/actions-section.tsx` | Main UI component |
| `src/app/advanced/actions/action-card.tsx` | Individual action card |
| `src/app/advanced/actions/progress-ring.tsx` | Circular progress ring |
| `src/components/app/dashboard-sidebar.tsx` | Add "Actions" nav item + badge |

## Error Handling

- API errors: toast notification, optimistic update reverted
- Sync failure on page load: show scan data without manual statuses (graceful degradation)
- Toggle failure: revert checkbox, show retry toast
- No scan data: show empty state prompting user to run their first scan
