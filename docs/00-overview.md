# AISO Architecture Overview

This folder documents the core systems implemented in the AISO SaaS platform. Each file covers a specific subsystem and can be used as a reference for future development.

## Document Index

| File | System | Key Files |
|------|--------|-----------|
| [01-database-schema.md](./01-database-schema.md) | Database tables and migrations | `supabase/schema.sql`, `supabase/migrations/` |
| [02-auth-system.md](./02-auth-system.md) | Authentication, sessions, token refresh | `src/lib/auth.ts`, `src/hooks/use-auth.ts`, `src/middleware.ts` |
| [03-domain-persistence.md](./03-domain-persistence.md) | DB-backed domain tracking | `src/app/api/user/domains/route.ts`, `src/contexts/domain-context.tsx` |
| [04-plan-access.md](./04-plan-access.md) | Plan tiers, feature gates, access control | `src/lib/pricing.ts`, `src/lib/access.ts`, `src/hooks/use-plan.ts` |
| [05-stripe-subscriptions.md](./05-stripe-subscriptions.md) | Stripe checkout, webhooks, billing portal | `src/lib/services/stripe-payment.ts`, `src/app/api/webhooks/stripe/route.ts` |
| [06-api-routes.md](./06-api-routes.md) | All API route reference | `src/app/api/` |
| [07-env-variables.md](./07-env-variables.md) | Required environment variables | `.env` |
| [08-competitor-analysis.md](./08-competitor-analysis.md) | Competitor tracking, battle cards, heatmap, SOV | `src/app/competitors/`, `src/app/api/competitors/` |
| [11-ai-traffic-analysis.md](./11-ai-traffic-analysis.md) | AI crawler traffic by provider — chart + leaderboard | `src/app/advanced/panels/ai-crawler-panel.tsx`, `src/app/api/crawler-visits/route.ts` |

## Architecture Principles

- **DB is source of truth**: Domains, plans, and scans are stored in Supabase. localStorage is a fast cache only.
- **Plan-based access**: Feature access is derived from `user_profiles.plan` via `getUserAccess()`, not from individual `scan.paid` flags (legacy fallback still supported).
- **Auth resilience**: Transient network errors do not log users out. Only definitive auth failures (no session, revoked token) clear state.
- **Webhook-driven billing**: Stripe webhooks handle plan changes. The verify endpoint is a thin status check.
- **Mock mode**: When `STRIPE_SECRET_KEY` is not set, the app uses mock payment/billing services for local development.
