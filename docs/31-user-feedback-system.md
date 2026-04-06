# User Feedback System

## What it does

Allows any authenticated user to submit categorized feedback from a floating widget. Submissions are stored in Supabase and viewable by the admin (`ryantetro@gmail.com`) in a dedicated Settings tab.

## Key files

| File | Role |
|------|------|
| `supabase/migrations/026_user_feedback.sql` | Creates `user_feedback` table |
| `src/app/api/feedback/route.ts` | POST (submit) + GET (admin list) API |
| `src/components/ui/floating-feedback.tsx` | Floating feedback widget (client) |
| `src/app/advanced/settings/settings-section.tsx` | Admin "Feedback" tab in Settings |

## How it works

1. User clicks the floating "Feedback" button visible on all workspace pages.
2. Widget opens with category pills (Bug Report, Feature Request, General), a textarea (2000 char limit), and a submit button.
3. On submit, the widget POSTs to `/api/feedback` with `message`, `category`, and `pageUrl`.
4. The API route authenticates via `getAuthUserFromRequest`, validates input, and inserts into `user_feedback` using the `service_role` Supabase client.
5. Admin navigates to Settings, where a conditional "Feedback" tab appears (only for `ryantetro@gmail.com`).
6. The tab fetches `GET /api/feedback` and renders all submissions as cards with date, email, category badge, message, and page URL.

## API contracts

### POST `/api/feedback`

**Request:**
```json
{
  "message": "string (required, max 2000 chars)",
  "category": "bug | feature | general (optional, defaults to general)",
  "pageUrl": "string (optional)"
}
```

**Response (200):**
```json
{ "ok": true }
```

### GET `/api/feedback` (admin only)

**Response (200):**
```json
{
  "feedback": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "string",
      "user_name": "string | null",
      "category": "string",
      "message": "string",
      "page_url": "string | null",
      "created_at": "ISO timestamp"
    }
  ]
}
```

## Error handling

- Unauthenticated requests return 401.
- Non-admin GET requests return 403.
- Invalid/missing message returns 400.
- Supabase insert failures return 500.
- Client-side: submit failures silently stop the loading spinner (no error toast).

## Configuration

- Admin email is hardcoded as `ryantetro@gmail.com` in both the API route and the Settings tab gate.
- No env vars required beyond the existing Supabase `service_role` key.
- RLS is enabled on `user_feedback` with no policies (all access is server-side via `service_role`).
