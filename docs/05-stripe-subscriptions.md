# Stripe Subscriptions

## Overview

AISO uses Stripe for subscription billing. The system supports creating subscription checkouts, processing webhooks for plan changes, and managing billing through the Stripe Customer Portal.

## Key Files

| File | Role |
|------|------|
| `src/lib/services/stripe-payment.ts` | Stripe SDK integration, customer management, checkout creation |
| `src/lib/services/mock-payment.ts` | Mock payment service for development without Stripe |
| `src/app/api/checkout/route.ts` | Creates checkout sessions |
| `src/app/api/checkout/verify/route.ts` | Verifies checkout completion (thin check -- webhook does real work) |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/billing/portal/route.ts` | Creates Stripe Customer Portal sessions |
| `src/types/services.ts` | PaymentService interface |
| `supabase/migrations/010_stripe_fields.sql` | Adds stripe fields to user_profiles |

## Stripe Customer Lifecycle

### 1. Customer Creation
On first checkout, `getOrCreateStripeCustomer()` is called:
1. Check `user_profiles.stripe_customer_id`
2. If exists, return it
3. If not, create a Stripe Customer with `metadata: { userId }`
4. Store the `stripe_customer_id` in `user_profiles`

### 2. Subscription Checkout
`createSubscriptionCheckout(userId, email, plan)`:
1. Get or create Stripe Customer
2. Look up Price ID from env var (e.g., `STRIPE_PRICE_STARTER_MONTHLY`)
3. If no Price ID configured, create inline price_data
4. Create Checkout Session in `subscription` mode
5. Return session URL for redirect

### 3. Webhook Processing
After checkout completes, Stripe sends events to `/api/webhooks/stripe`:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | `upgradeUserPlan(userId, plan)`, store `stripe_subscription_id` |
| `customer.subscription.updated` | Update plan from Price ID, update `plan_expires_at` |
| `customer.subscription.deleted` | Downgrade to `free`, clear stripe fields |
| `invoice.payment_failed` | (Future: email notification) |

### 4. Customer Portal
`POST /api/billing/portal` creates a Stripe Billing Portal session where users can:
- Update payment methods
- View invoices
- Cancel subscriptions

## Checkout Flow

```
User clicks "Upgrade" in UI
  → POST /api/checkout { plan: "starter_monthly" }
  → If Stripe configured:
      → createSubscriptionCheckout(userId, email, plan)
      → Returns { url: "https://checkout.stripe.com/..." }
  → If mock mode:
      → mockPayment.createCheckout(scanId, plan)
      → Returns { url: "/checkout/{sessionId}" }

User completes Stripe Checkout
  → Stripe sends checkout.session.completed webhook
  → Webhook handler:
      1. Reads userId and plan from session.metadata
      2. Calls upgradeUserPlan(userId, plan)
      3. Stores stripe_subscription_id

User returns to app
  → /dashboard?checkout=success&session_id={id}
  → POST /api/checkout/verify { sessionId }
  → Verifies payment status (thin check, webhook already handled the upgrade)
  → Returns { paid: true, plan: "starter_monthly" }
```

## Webhook Security

Webhooks are verified using `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET`:

1. Raw request body is read as text (not parsed as JSON)
2. `stripe-signature` header is extracted
3. Signature is verified against the webhook secret
4. If verification fails, returns `400`

The `/api/webhooks/` prefix is in `PUBLIC_PREFIXES` in middleware -- no session auth required.

## Price ID Mapping

The webhook maps Stripe Price IDs back to plan strings:

| Env Variable | Plan String |
|-------------|-------------|
| `STRIPE_PRICE_STARTER_MONTHLY` | `starter_monthly` |
| `STRIPE_PRICE_STARTER_ANNUAL` | `starter_annual` |
| `STRIPE_PRICE_PRO_MONTHLY` | `pro_monthly` |
| `STRIPE_PRICE_PRO_ANNUAL` | `pro_annual` |

If Price IDs are not configured in env vars, the checkout creates inline `price_data` with amounts from `getPlanPriceCents()`.

## Mock Mode

When `STRIPE_SECRET_KEY` is not set:

- `POST /api/checkout` falls back to `mockPayment.createCheckout()` which returns a local `/checkout/{id}` URL
- `POST /api/checkout/verify` auto-marks mock sessions as paid and calls `upgradeUserPlan()`
- `POST /api/billing/portal` returns `503 Billing is not configured`

Mock sessions are stored in an in-memory Map and survive for the lifetime of the server process.

## Database Fields

Added by `supabase/migrations/010_stripe_fields.sql`:

| Column | Type | Purpose |
|--------|------|---------|
| `stripe_customer_id` | `text UNIQUE` | Links user to Stripe Customer |
| `stripe_subscription_id` | `text` | Active subscription ID |
| `plan_expires_at` | `timestamptz` | Current billing period end |
| `plan_updated_at` | `timestamptz` | Last plan change timestamp |

## Testing Locally

```bash
# Forward Stripe webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret and set it as STRIPE_WEBHOOK_SECRET

# Trigger a test checkout
stripe trigger checkout.session.completed
```
