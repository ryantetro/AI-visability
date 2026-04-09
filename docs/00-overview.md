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
| [12-monitoring-alerts.md](./12-monitoring-alerts.md) | Monitoring, cron rescans, Resend email alerts | `src/lib/services/resend-alerts.ts`, `src/app/api/cron/monitor/route.ts` |
| [13-onboarding-flow.md](./13-onboarding-flow.md) | Onboarding checklist and guided setup flow | `src/hooks/use-onboarding.ts`, `src/components/app/onboarding-checklist.tsx` |
| [14-ai-referral-tracking.md](./14-ai-referral-tracking.md) | AI referral attribution — click-through tracking from AI engines | `src/app/advanced/panels/ai-referral-panel.tsx`, `src/app/api/referral-visits/route.ts` |
| [15-ux-audit-improvements.md](./15-ux-audit-improvements.md) | UX audit — copy fixes, tooltips, score context, interaction fixes | `src/components/ui/info-tooltip.tsx`, `src/components/app/score-summary-hero.tsx` |
| [16-pre-launch-hardening.md](./16-pre-launch-hardening.md) | Pre-launch security hardening — P0/P1 fixes for auth, payments, API validation | `src/lib/auth.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/middleware.ts` |
| [17-pricing-restructure-plan.md](./17-pricing-restructure-plan.md) | Pricing restructure & feature implementation plan — 4-tier model, new features | `src/lib/pricing.ts`, `src/lib/access.ts`, `src/components/pricing/` |
| [18-pricing-restructure-implementation.md](./18-pricing-restructure-implementation.md) | Pricing restructure implementation — platform gating, data export, analytics, regions, content generator | `src/lib/platform-gating.ts`, `src/lib/region-gating.ts`, `src/lib/content-generator.ts` |
| [19-team-management.md](./19-team-management.md) | Multi-seat team management — invitations, shared domains, plan resolution | `src/lib/team-management.ts`, `src/app/api/teams/` |
| [20-fix-my-site.md](./20-fix-my-site.md) | Fix My Site $499 service add-on — one-time Stripe payment, order tracking, email notifications | `src/lib/fix-my-site.ts`, `src/app/api/fix-my-site/` |
| [21-payment-flow-fixes-upsells.md](./21-payment-flow-fixes-upsells.md) | Payment flow bug fixes + tier-contextual upgrade upsells | `src/contexts/domain-context.tsx`, `src/app/api/webhooks/stripe/route.ts` |
| [22-graceful-downgrade-flow.md](./22-graceful-downgrade-flow.md) | Graceful plan downgrade — grace period, auto-trim, advisory issues | `src/lib/billing.ts`, `src/app/api/webhooks/stripe/route.ts` |
| [23-score-page-overhaul.md](./23-score-page-overhaul.md) | Score page overhaul — reweighted formula, clear labels, marketing CTAs | `src/lib/public-score.ts`, `src/lib/scorer/index.ts`, `src/app/score/[id]/page.tsx` |
| [24-prompt-library-suggest.md](./24-prompt-library-suggest.md) | Prompt Library — AI/heuristic suggested prompts from latest scan | `src/app/api/prompts/suggest/route.ts`, `src/app/advanced/panels/prompt-library-panel.tsx` |
| [25-favicon-opengraph.md](./25-favicon-opengraph.md) | Default favicon, Apple icon, and Open Graph image | `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/app/opengraph-image.tsx` |
| [26-landing-marketing-sections.md](./26-landing-marketing-sections.md) | Home landing marketing bands + Framer Motion | `src/components/marketing/`, `src/app/page.tsx` |
| [27-dashboard-redesign.md](./27-dashboard-redesign.md) | Dashboard 5-zone redesign — KPI header, action center, prompt table, platform chips | `src/app/advanced/dashboard/dashboard-section.tsx`, `src/app/advanced/dashboard/score-header.tsx` |
| [30-dashboard-conversion-ux.md](./30-dashboard-conversion-ux.md) | Next steps strip, mention “why this score”, workspace URLs, shared scoring weights | `src/lib/scoring-weights.ts`, `src/lib/workspace-nav.ts`, `src/lib/mention-insights.ts`, `src/app/advanced/dashboard/next-steps-strip.tsx` |
| [28-analytics-page.md](./28-analytics-page.md) | Full-page analytics dashboard — KPI row, crawler/referral charts, score trends, prompt analytics | `src/app/analytics/page.tsx`, `src/app/advanced/analytics/analytics-section.tsx` |
| [29-brand-improve-redesign.md](./29-brand-improve-redesign.md) | Brand Improve tab — 4-zone layout (KPIs, action center, filterable fixes, collapsible prompt library) | `src/app/advanced/brand/improve-section.tsx`, `use-content-gaps.ts` |
| [31-user-feedback-system.md](./31-user-feedback-system.md) | User feedback widget + admin viewer — categorized submissions, admin-only Settings tab | `src/components/ui/floating-feedback.tsx`, `src/app/api/feedback/route.ts` |
| [32-actions-tab.md](./32-actions-tab.md) | Actions checklist sidebar tab — persistent action plan with progress tracking and scan sync | `src/app/advanced/actions/actions-section.tsx`, `src/app/api/action-checklist/route.ts` |
| [33-prompts-tab.md](./33-prompts-tab.md) | Dedicated prompt monitoring dashboard — Active/Inactive/Suggestions tabs, CRUD, engine mentions | `src/app/advanced/prompts/prompts-section.tsx`, `src/app/prompts/page.tsx` |
| [34-content-studio-tab.md](./34-content-studio-tab.md) | Content Studio — 4-step content creation wizard, audience management, brief/article generation | `src/app/advanced/content-studio/`, `src/app/api/content-studio/` |
| [35-managed-agents-integration.md](./35-managed-agents-integration.md) | Claude Managed Agents — feature suggestions for autonomous content, scanning, monitoring, and onboarding | `@anthropic-ai/claude-agent-sdk` |
| [36-content-studio-pipeline.md](./36-content-studio-pipeline.md) | Content Studio AI Pipeline — Agent SDK autonomous brief/article generation with WebSearch | `src/lib/content-studio/`, `src/app/api/content-studio/[id]/generate/` |
| [37-fix-my-site-agent.md](./37-fix-my-site-agent.md) | Fix My Site Agent — autonomous file generation after payment via Agent SDK | `src/lib/fix-my-site/`, `src/app/api/fix-my-site/[id]/download/` |

## Architecture Principles

- **DB is source of truth**: Domains, plans, and scans are stored in Supabase. localStorage is a fast cache only.
- **Plan-based access**: Feature access is derived from `user_profiles.plan` via `getUserAccess()`, not from individual `scan.paid` flags (legacy fallback still supported).
- **Auth resilience**: Transient network errors do not log users out. Only definitive auth failures (no session, revoked token) clear state.
- **Webhook-driven billing**: Stripe webhooks handle plan changes. The verify endpoint is a thin status check.
- **Mock mode**: When `STRIPE_SECRET_KEY` is not set, the app uses mock payment/billing services for local development.
