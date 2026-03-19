# API Routes Reference

All routes are Next.js App Router API handlers in `src/app/api/`.

## Authentication Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | Cookie | Returns current user, plan, tier, access info |
| POST | `/api/auth/login` | None | Email/password sign-in |
| POST | `/api/auth/signup` | None | Account creation |
| POST | `/api/auth/logout` | Cookie | Destroys session |
| POST | `/api/auth/forgot-password` | None | Sends password reset email |
| POST | `/api/auth/reset-password` | Cookie | Completes password reset |
| GET | `/auth/callback` | None | Email verification redirect handler |

### `GET /api/auth/me` Response
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

---

## User Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user/domains` | Required | List user's non-hidden domains |
| POST | `/api/user/domains` | Required | Add a domain (validates format, enforces plan limit) |
| DELETE | `/api/user/domains` | Required | Soft-delete a domain (sets `hidden=true`) |
| GET | `/api/user/scans` | Required | List user's scans (up to 50, newest first) |

### `POST /api/user/domains` Request/Response
```json
// Request
{ "domain": "example.com", "url": "https://example.com" }

// Success (200)
{ "ok": true, "domain": "example.com" }

// Over limit (403)
{ "error": "Your free plan allows 1 domain. Upgrade for more." }
```

### `GET /api/user/scans` Response
```json
{
  "scans": [
    {
      "id": "scan-id",
      "url": "https://example.com",
      "status": "complete",
      "score": 72,
      "scores": { "aiVisibility": 72, "webHealth": null, "overall": null, "potentialLift": null },
      "previewFixes": [{ "checkId": "...", "label": "..." }],
      "hasEmail": true,
      "hasPaid": true,
      "createdAt": 1704067200000,
      "completedAt": 1704067260000
    }
  ]
}
```

---

## Scan Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/scan` | Required | Start a new scan |
| GET | `/api/scan/[id]` | Required | Get scan status and metadata |
| GET | `/api/scan/[id]/report` | Required | Get full report data |
| GET | `/api/scan/[id]/files` | Required | Get generated fix files |
| GET | `/api/scan/[id]/files/archive` | Required | Download ZIP of generated files |
| POST | `/api/scan/[id]/email` | Required | Associate email with scan |

Note: `/api/scan` prefix is in `PUBLIC_PREFIXES` in middleware (auth checked in route handlers themselves).

---

## Billing Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/checkout` | Required | Create checkout session (Stripe or mock) |
| POST | `/api/checkout/verify` | Required | Verify checkout payment status |
| POST | `/api/billing/portal` | Required | Create Stripe Customer Portal session |
| POST | `/api/webhooks/stripe` | Stripe Sig | Stripe webhook handler (no session auth) |

### `POST /api/checkout` Request/Response
```json
// Request
{ "plan": "starter_monthly" }

// Response (Stripe mode)
{ "id": "cs_...", "scanId": "upgrade_userId", "amount": 2900, "currency": "usd", "url": "https://checkout.stripe.com/..." }

// Response (mock mode)
{ "id": "uuid", "scanId": "upgrade_userId", "amount": 2900, "currency": "usd", "url": "/checkout/uuid" }
```

### `POST /api/billing/portal` Response
```json
{ "url": "https://billing.stripe.com/session/..." }
```

---

## Other Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/monitoring` | Required | Enable/disable score monitoring |
| POST | `/api/crawler-visits` | Secret | Log AI bot visits (internal) |
| GET | `/api/cron/monitor` | Secret | Cron job for monitoring checks |
| GET | `/api/leaderboard` | None | Public leaderboard data |

---

## Middleware Route Protection

### Public Paths (no auth required)
`/`, `/login`, `/pricing`, `/terms`, `/privacy`, `/landing/b`, `/landing/c`

### Public Prefixes (no auth required)
`/auth/`, `/api/auth/`, `/api/scan`, `/api/crawler-visits`, `/api/cron/`, `/api/webhooks/`, `/score/`, `/certified/`, `/_next/`, `/favicon`

### Protected Routes
Everything else requires a valid session. If no session:
- API routes get `401 JSON`
- Page routes get redirected to `/login?next={path}`
