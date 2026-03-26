# Fix My Site — Service Add-on

## What it does

A $499 one-time service where the AISO team professionally optimizes a customer's AI visibility files: robots.txt, llms.txt, structured data (JSON-LD), sitemap, schema markup, and meta tags. This is a service order flow using Stripe's `payment` mode (not subscription).

## Key files

| File | Role |
|------|------|
| `supabase/migrations/019_fix_my_site_orders.sql` | Database migration for orders table |
| `src/lib/fix-my-site.ts` | Order CRUD functions (create, list, get, update status, set Stripe IDs) |
| `src/lib/services/stripe-payment.ts` | `createFixMySiteCheckout()` — one-time Stripe payment session |
| `src/app/api/webhooks/stripe/route.ts` | Webhook handler for `fix_my_site` checkout completions |
| `src/app/api/fix-my-site/route.ts` | `GET` (list orders) / `POST` (create order + checkout) |
| `src/app/api/fix-my-site/[id]/route.ts` | `GET` single order detail |
| `src/lib/services/resend-alerts.ts` | `sendFixMySiteOrderNotification()` + `sendFixMySiteConfirmation()` |
| `src/components/pricing/pricing-section.tsx` | Add-on section below plan cards |
| `src/app/advanced/panels/fix-my-site-panel.tsx` | Dashboard order form + order history |
| `src/app/advanced/brand/brand-section.tsx` | "Services" tab rendering the panel |

## How it works

### Order flow

1. User visits pricing page or dashboard Services tab
2. User fills in domain, selects files to optimize, adds optional notes
3. Clicks "Order for $499" → `POST /api/fix-my-site` creates a `fix_my_site_orders` row
4. API creates a Stripe Checkout session in `payment` mode (one-time, not subscription)
5. User is redirected to Stripe Checkout
6. On successful payment, Stripe fires `checkout.session.completed` webhook
7. Webhook handler detects `metadata.type === 'fix_my_site'` and:
   - Stores `stripe_session_id` and `stripe_payment_intent_id` on the order
   - Sends internal notification email to the AISO team
   - Sends confirmation email to the customer
8. User sees order with "Ordered" status in the dashboard Services tab

### Status lifecycle

```
ordered → in_progress → delivered
                      ↘ refunded (edge case)
```

- `ordered` (yellow badge): Payment received, awaiting team action
- `in_progress` (blue badge): Team is working on optimization
- `delivered` (green badge): Files delivered to customer
- `refunded` (gray badge): Payment refunded

### Stripe integration

- Uses `mode: 'payment'` (not `mode: 'subscription'`)
- Price: $499 (49900 cents) hardcoded, or uses `STRIPE_PRICE_FIX_MY_SITE` env var if set
- Metadata includes `{ type: 'fix_my_site', userId, orderId }` to distinguish from subscription checkouts
- Webhook handler branches on `session.metadata.type` before falling through to subscription logic

## API contracts

### `GET /api/fix-my-site`

Auth required. Returns all orders for the authenticated user.

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "user_id": "string",
      "domain": "example.com",
      "status": "ordered",
      "notes": "string | null",
      "files_requested": ["robots_txt", "llms_txt"],
      "stripe_session_id": "string | null",
      "stripe_payment_intent_id": "string | null",
      "amount_cents": 49900,
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp | null",
      "completed_at": "ISO timestamp | null"
    }
  ]
}
```

### `POST /api/fix-my-site`

Auth required. Creates an order and returns a Stripe checkout URL.

**Request:**
```json
{
  "domain": "example.com",
  "notes": "Optional notes for the team",
  "filesRequested": ["robots_txt", "llms_txt", "structured_data", "sitemap", "meta_tags", "schema_markup"]
}
```

**Response:**
```json
{
  "order": { /* FixMySiteOrder */ },
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### `GET /api/fix-my-site/[id]`

Auth required. Returns a single order (must belong to the authenticated user).

**Response:**
```json
{
  "order": { /* FixMySiteOrder */ }
}
```

## Error handling

- Missing auth → 401
- Invalid body / missing domain → 400
- Invalid file type in `filesRequested` → 400
- Stripe not configured → 503
- Order not found or doesn't belong to user → 404
- Email sending failures are caught and logged but don't fail the webhook

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API key for creating checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signature verification |
| `STRIPE_PRICE_FIX_MY_SITE` | No | Optional pre-created Stripe Price ID (defaults to inline $499 price_data) |
| `AISO_TEAM_EMAIL` | No | Team notification recipient (defaults to `team@aiso.so`) |
| `RESEND_API_KEY` | No | Required for email notifications (emails silently skipped if not set) |
