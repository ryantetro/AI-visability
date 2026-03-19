# Domain Persistence

## Problem Solved

Previously, monitored domains were stored only in `localStorage`. This meant domains disappeared after clearing browser data, switching browsers, or logging in on a new device.

## Solution: DB-Backed Domains with localStorage Cache

Domains are now persisted in the `user_domains` Supabase table. localStorage serves as a fast cache for instant rendering on page load.

## Key Files

| File | Role |
|------|------|
| `src/app/api/user/domains/route.ts` | REST API for domain CRUD |
| `src/app/api/user/scans/route.ts` | Returns all user scans from DB |
| `src/contexts/domain-context.tsx` | Client-side domain state management |
| `src/app/advanced/lib/storage.ts` | localStorage cache helpers |
| `supabase/migrations/009_user_domains.sql` | Table creation |

## API: `/api/user/domains`

All endpoints require authentication via `getAuthUserFromRequest()`.

### GET -- List Domains
Returns non-hidden domains for the authenticated user.

```json
{
  "domains": [
    { "domain": "example.com", "url": null, "created_at": "2025-01-01T00:00:00Z" }
  ]
}
```

### POST -- Add Domain
Validates domain format, enforces plan-based limits, and upserts (re-shows hidden domains).

**Request:**
```json
{ "domain": "example.com", "url": "https://example.com" }
```

**Plan limits:**
- Free: 1 domain
- Starter: 1 domain
- Pro: 5 domains

Returns `403` with error message if limit is reached.

### DELETE -- Remove Domain
Soft-deletes by setting `hidden = true`. Domain data is preserved for potential re-add.

**Request:**
```json
{ "domain": "example.com" }
```

## API: `/api/user/scans`

### GET -- List User Scans
Returns up to 50 scans for the authenticated user, ordered by `created_at DESC`.

```json
{
  "scans": [
    {
      "id": "scan-id",
      "url": "https://example.com",
      "status": "complete",
      "score": 72,
      "hasEmail": true,
      "hasPaid": true,
      "createdAt": 1704067200000,
      "completedAt": 1704067260000
    }
  ]
}
```

This replaces the old pattern of storing scan IDs in localStorage and fetching each one individually.

## Client-Side: DomainContextProvider

### Load Sequence (on mount)
1. Load `localStorage` domains immediately (fast, prevents flash of empty state)
2. Fetch `GET /api/user/domains` from DB
3. Reconcile:
   - If DB has domains → DB wins, update localStorage cache
   - If DB is empty but localStorage has domains → One-time migration: push each domain to DB via `POST /api/user/domains`

### Load Scans
1. Fetch `GET /api/user/scans` for all scans in a single request
2. If `initialReportId` (from URL) is not in the list, fetch it individually as fallback
3. On failure, falls back to the old localStorage + per-ID fetch pattern

### Write-Through Pattern
- **Add domain**: `POST /api/user/domains` first, then update local state + localStorage cache
- **Remove domain**: `DELETE /api/user/domains` (fire-and-forget), then update local state + localStorage cache

### Error Handling
- If DB API fails during add → shows error, does not update local state
- If DB API fails during remove → best-effort (domain removed locally even if DB call fails)
- If DB API fails during load → keeps localStorage data

## Data Flow

```
User adds domain
  → POST /api/user/domains (validates format, checks plan limit)
  → On success: update React state + localStorage cache
  → On 403 (limit): show upgrade modal

User removes domain
  → DELETE /api/user/domains (soft-delete in DB)
  → Update React state + localStorage cache

Page load
  → Read localStorage (instant)
  → Fetch /api/user/domains (reconcile)
  → Fetch /api/user/scans (single request)
```
