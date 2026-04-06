# Actions Tab

Persistent checklist sidebar tab that syncs scan results with manual completion state, giving users a step-by-step action plan for improving their AI visibility score.

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/027_action_checklist.sql` | Database table, RLS policies, unique constraint |
| `src/types/action-checklist.ts` | Shared TypeScript types (items, summary, payloads) |
| `src/lib/services/supabase-action-checklist.ts` | Raw-fetch Supabase service (sync, toggle, count) |
| `src/app/api/action-checklist/route.ts` | POST API — `sync` and `toggle` actions |
| `src/app/api/action-checklist/count/route.ts` | GET API — lightweight remaining count for badge |
| `src/contexts/action-checklist-context.tsx` | React context providing `remainingCount` and `refreshCount` |
| `src/components/app/dashboard-sidebar.tsx` | Sidebar nav item with badge count |
| `src/app/advanced/actions/progress-ring.tsx` | SVG circular progress indicator |
| `src/app/advanced/actions/action-card.tsx` | Individual action card with checkbox, badges, copy prompt |
| `src/app/advanced/actions/actions-section.tsx` | Main UI — progress hero, filter bar, grouped action list |
| `src/app/actions/page.tsx` | Page shell using WorkspaceShell pattern |

## How It Works

### Data Flow

1. **Page load**: `ActionsSection` calls `buildSyncItems()` to extract fix items from the current scan report, passing dimension checks, and five hardcoded "keep doing" items.
2. **Sync**: Items are POSTed to `/api/action-checklist` with `action: 'sync'`. The service upserts rows into `action_checklist`, preserving existing `manual_status` values.
3. **Derive completion**: For each item, `isComplete = scan_status='pass' OR (manual_status='done' AND scan_status!='fail')`. `isRegression = manual_status='done' AND scan_status='fail'`.
4. **Response**: The API returns all items plus a summary (total, complete, remaining, potentialLift).

### Toggle Flow

1. User checks/unchecks an action card.
2. Optimistic UI update applied immediately.
3. POST to `/api/action-checklist` with `action: 'toggle'`, `checkId`, `manualStatus`.
4. Server updates the row and returns derived state.
5. On success, reconcile optimistic state with server response.
6. On failure, re-sync from server.

### Sidebar Badge

`ActionChecklistProvider` wraps the entire dashboard layout (above both sidebar and main content). It fetches `/api/action-checklist/count?domain=X` and exposes `remainingCount` via context. The sidebar reads this to show a badge on the Actions nav item.

## API Contracts

### POST /api/action-checklist

**Sync action:**
```json
{
  "action": "sync",
  "domain": "example.com",
  "items": [{ "checkId": "...", "actionType": "fix", "scanStatus": "fail", "label": "...", "detail": "...", "dimension": "...", "category": "...", "estimatedLift": 5, "effortBand": "quick", "copyPrompt": "..." }]
}
```
Returns: `{ items: ActionChecklistItem[], summary: ActionChecklistSummary }`

**Toggle action:**
```json
{
  "action": "toggle",
  "domain": "example.com",
  "checkId": "robots-txt",
  "manualStatus": "done"
}
```
Returns: `{ checkId, manualStatus, scanStatus, isComplete, isRegression, updatedAt }`

### GET /api/action-checklist/count?domain=example.com

Returns: `{ remaining: number }`

## View Modes

Users can switch between three groupings:
- **By Priority** (default): sorted by completion status then estimated lift
- **By Category**: grouped by dimension (File Presence, Structured Data, etc.)
- **By Effort**: grouped by effort band (Quick Wins, Medium Effort, Technical)

Status filters (All, To Do, Done) work across all view modes.

## Error Handling

- If the sync API fails, the UI falls back to locally derived items (scan status only, no persistence).
- If a toggle API call fails, the full sync is re-triggered to reconcile state.
- The `hasSupabaseConfig()` guard returns empty results when Supabase env vars are missing.

## Configuration

- `NAV_GATES.actions = 'free'` in `src/lib/pricing.ts` — available to all plans.
- No additional env vars beyond existing Supabase configuration.
