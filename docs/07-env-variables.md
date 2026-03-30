# Environment Variables

## Required (Always)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (for auth flows) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side DB access) |

## Required (Production)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g., `https://app.yourwebsitescore.com`) |
| `MONITORING_SECRET` | Secret for cron job and internal API authentication |

### Cron / monitoring tuning (optional)

Used by `GET /api/cron/monitor`. Helps avoid Vercel **504** when Phase 0 rescans or Phase 2 prompt checks run too long in one invocation.

| Variable | Default | Description |
|----------|---------|-------------|
| `CRON_MAX_RESCANS_PER_RUN` | `1` | Full site rescans per cron (0–5). Each rescan can take many minutes. |
| `CRON_MAX_PROMPT_ENGINE_CALLS` | `80` | Cap on AI engine queries in prompt monitoring per invocation (max 400). |

See [12-monitoring-alerts.md](./12-monitoring-alerts.md).

## AI Engine Keys (Optional -- enables live AI visibility testing)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Enables ChatGPT mention testing |
| `ANTHROPIC_API_KEY` | Enables Claude mention testing |
| `GOOGLE_GENAI_API_KEY` | Enables Gemini mention testing |
| `PERPLEXITY_API_KEY` | Enables Perplexity mention testing |
| `GROK_API_KEY` | Enables Grok mention testing |

### AI Engine Models (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_MODEL` | Claude model for mention testing | `claude-haiku-4-5-20251001` |
| `GEMINI_MODEL` | Gemini model for mention testing | `gemini-2.5-flash` |
| `PERPLEXITY_MODEL` | Perplexity Sonar model for mention testing | `sonar` |
| `GROK_MODEL` | Grok model for mention testing | `grok-4-1-fast-non-reasoning` |

## AI visibility engines (Optional but recommended)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Enables ChatGPT mention testing |
| `ANTHROPIC_API_KEY` | Enables Claude mention testing and prompt monitoring |
| `ANTHROPIC_MODEL` | Optional Claude model override. Defaults to `claude-haiku-4-5-20251001` |
| `GOOGLE_GENAI_API_KEY` | Enables Gemini mention testing |
| `GEMINI_MODEL` | Optional Gemini model override. Defaults to `gemini-2.5-flash` |
| `PERPLEXITY_API_KEY` | Enables Perplexity mention testing |
| `GROK_API_KEY` | Enables Grok mention testing |
| `GROK_MODEL` | Optional Grok model override. Defaults to `grok-4-1-fast-non-reasoning` |

## Stripe (Optional -- enables real billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret API key. If not set, app uses mock payment service |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for signature verification |

### Stripe Price IDs (Optional)

If set, checkout uses these pre-created Stripe Prices. If not set, inline `price_data` is created dynamically.

| Variable | Plan |
|----------|------|
| `STRIPE_PRICE_STARTER_MONTHLY` | Starter Monthly ($29/mo) |
| `STRIPE_PRICE_STARTER_ANNUAL` | Starter Annual ($279/yr) |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro Monthly ($79/mo) |
| `STRIPE_PRICE_PRO_ANNUAL` | Pro Annual ($749/yr) |
| `STRIPE_PRICE_GROWTH_MONTHLY` | Growth Monthly ($249/mo) |
| `STRIPE_PRICE_GROWTH_ANNUAL` | Growth Annual ($2,490/yr) |

## Development Defaults

When running locally without env vars:

| Behavior | Default |
|----------|---------|
| App URL | `http://localhost:3000` |
| Payment service | Mock (in-memory sessions, auto-paid on verify) |
| Billing portal | Returns `503 Billing is not configured` |
| Cookies | Non-secure (no HTTPS required) |
| `?debugPaid=1` | Enables paid feature preview (development only) |

## Engine verification and Claude backfill

```bash
# Show which AI visibility engines are configured and which model each is using
node scripts/check-ai-engines.cjs

# Backfill Claude mention data for recent scans and seed a current prompt baseline
node scripts/backfill-claude-ai-visibility.cjs 30
```

## Setting Up Stripe Locally

```bash
# 1. Install Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Log in
stripe login

# 3. Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook signing secret output

# 4. Add to .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 5. (Optional) Create prices in Stripe Dashboard and add IDs
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_GROWTH_MONTHLY=price_...
STRIPE_PRICE_GROWTH_ANNUAL=price_...
```
