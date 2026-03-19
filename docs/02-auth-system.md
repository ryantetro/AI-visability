# Authentication System

## Overview

AISO uses Supabase Auth with email/password authentication. Sessions are managed via httpOnly cookies with automatic background refresh.

## Key Files

| File | Role |
|------|------|
| `src/lib/auth.ts` | Server-side auth functions (session management, token refresh, user lookup) |
| `src/hooks/use-auth.ts` | Client-side auth hook (user state, refresh, logout, cross-tab sync) |
| `src/hooks/use-plan.ts` | Client-side plan/tier state derived from `/api/auth/me` |
| `src/middleware.ts` | Route protection, token refresh on navigation |
| `src/app/login/login-client.tsx` | Login/signup/password-reset UI |
| `src/app/api/auth/me/route.ts` | Returns current user + plan info |
| `src/app/api/auth/login/route.ts` | Email/password sign-in |
| `src/app/api/auth/signup/route.ts` | Account creation |
| `src/app/api/auth/logout/route.ts` | Session destruction |
| `src/app/api/auth/forgot-password/route.ts` | Password reset request |
| `src/app/api/auth/reset-password/route.ts` | Password reset completion |
| `src/app/auth/callback/route.ts` | Email verification callback |

## Cookie Strategy

| Cookie | Purpose | Max Age |
|--------|---------|---------|
| `aiso_auth_session` | Supabase access token | 1 hour |
| `aiso_refresh_token` | Supabase refresh token | 30 days |

Both are `httpOnly`, `sameSite: lax`, and `secure` in production.

## Token Refresh

### Background Refresh (Client-Side)
The `useAuth()` hook runs a 45-minute interval timer that calls `/api/auth/me`. This endpoint refreshes the session if the access token has expired and the refresh token is still valid.

```
Token lifetime:     1 hour
Refresh interval:   45 minutes (15-minute safety margin)
Refresh token:      30 days
```

### Middleware Refresh (Server-Side)
`maybeRefreshSessionInMiddleware()` is called on every protected route navigation. It checks the access token first, then falls back to refresh if expired.

## Error Resilience

The auth system distinguishes between **definitive** and **transient** failures:

### Definitive Failures (clear session)
- No session cookies present (`reason: 'no_session'`)
- Refresh token is invalid/revoked/expired (matches pattern: `invalid.*token`, `token.*revoked`, `already.*used`)

### Transient Failures (keep session)
- Network errors, timeouts, DNS failures
- Supabase returning 5xx errors
- Any unrecognized error during refresh

**Behavior by layer:**

| Layer | Definitive Failure | Transient Failure |
|-------|-------------------|-------------------|
| `useAuth()` hook | Sets `user = null` | Keeps current user state |
| `maybeRefreshSessionInMiddleware()` | Clears cookies | Returns failure but keeps cookies |
| `middleware()` | Redirects to `/login` | Lets request through (route handlers re-check) |

## Cross-Tab Sync

Uses `BroadcastChannel('aiso_auth')` for tab coordination:

- **Logout**: When a user logs out in one tab, all other tabs receive `{ type: 'logout' }` and redirect to `/login`
- **Login**: After successful login, `{ type: 'login' }` is broadcast, causing other tabs to refresh their auth state

Degrades gracefully if `BroadcastChannel` is not supported.

## Auth Flow

```
1. User visits protected route
2. Middleware checks access token cookie
   - Valid? → Allow through
   - Expired? → Try refresh token
     - Refresh succeeds → Set new cookies, allow through
     - Refresh fails (definitive) → Clear cookies, redirect to /login
     - Refresh fails (transient) → Let through, route handler will re-check
   - No cookies → Redirect to /login
3. Route handler calls getAuthUserFromRequest()
   - Returns AuthUser or null (second auth layer)
```

## Key Types

```typescript
interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: string;
}

interface AuthSessionState {
  user: AuthUser | null;
  reason?: 'no_session' | 'token_invalid' | 'refresh_failed' | 'signed_out';
  session: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string | null;
  } | null;
}
```

## `/api/auth/me` Response

```json
{
  "user": { "id": "...", "email": "...", "name": "...", "provider": "email" },
  "plan": "starter_monthly",
  "tier": "starter",
  "isPaid": true,
  "maxDomains": 1,
  "maxPrompts": 25,
  "scans_used": 5,
  "free_scan_limit": 3,
  "session": { "expiresAt": "2025-01-01T00:00:00Z" }
}
```
