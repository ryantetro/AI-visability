# UX Audit Improvements

Comprehensive UX audit and improvements to reduce friction, clarify jargon, and make the app easier to understand and gain value from.

## Key Files

| File | Role |
|------|------|
| `src/components/ui/info-tooltip.tsx` | New reusable tooltip component for contextual help |
| `src/components/app/score-summary-hero.tsx` | Score band legend + supporting score tooltips |
| `src/components/ui/yws-breakdown-section.tsx` | Added `tooltip` prop for section-level help text |
| `src/app/page.tsx` | Landing page copy improvements |
| `src/components/ui/url-input.tsx` | Clearer CTA, placeholder, and error messages |
| `src/app/login/login-client.tsx` | Sign-up subtitle and email confirmation copy |
| `src/hooks/use-onboarding.ts` | Clearer onboarding step labels |
| `src/components/app/next-steps-card.tsx` | Improved card titles, descriptions, CTAs |
| `src/components/ui/aiso-brand.tsx` | Shared AISO brand mark/wordmark used across dashboard + landing/auth headers |
| `src/app/advanced/report/report-section.tsx` | Renamed sections, added tooltips, section-specific copy labels |
| `src/app/advanced/panels/ai-crawler-panel.tsx` | Plain-language descriptions |
| `src/app/advanced/panels/ai-referral-panel.tsx` | Jargon-free descriptions |
| `src/app/advanced/dashboard/dashboard-section.tsx` | KPI card tooltips (Visibility Score, Average Rank, AI Mentions) |
| `src/app/advanced/settings/settings-section.tsx` | Cancel Plan confirmation dialog |

## What Changed

### Batch 1 — Copy & Label Fixes

- **Landing page**: Hero headline mentions ChatGPT/Perplexity by name, subtitle is outcome-focused, 3-step descriptions rewritten, 6 dimensions renamed to plain language, FAQ reordered with practical questions first, bottom CTA simplified
- **URL input**: CTA button says "Free Audit - 30 Seconds", placeholder shows example domains, error messages are more helpful
- **Login**: Sign-up subtitle says "Free account. No credit card required.", email confirmation mentions checking spam
- **Onboarding steps**: Labels include time estimates and "(optional)" where appropriate
- **Next-steps cards**: Titles/descriptions/CTAs rewritten to be specific and actionable
- **Report sections**: "Repair Queue" renamed to "Priority Fixes", "AI Readiness" to "AI Discoverability", "Content & Authority" to "Content & Expertise", copy buttons made section-specific
- **Crawler panel**: "armed" changed to "installed", "Server-side middleware" to "Auto-detection", descriptions in plain language with time expectations
- **Referral panel**: Descriptions mention specific AI engines and "real visitors"

### Batch 2 — Tooltips & Context

- **InfoTooltip component**: Lightweight hover/click tooltip with dark theme, 240px width, positioned below trigger
- **Score band legend**: Color-coded legend (red 0-59, orange 60-79, green 80-100) appears below the main score ring on every ScoreSummaryHero usage
- **Supporting score tooltips**: Each supporting metric (Website Quality, Trust & Security, PageSpeed, AI Mentions) gets a help icon explaining what it measures
- **Report section tooltips**: Each breakdown section (AI Mentions, AI Discoverability, Content & Expertise, Website Quality, Performance & Security) has a tooltip explaining what it checks
- **Dashboard KPI tooltips**: Visibility Score, Average Rank, and AI Mentions cards each have tooltips

### Batch 3 — Interaction Fixes

- **Cancel Plan confirmation**: Added `window.confirm()` dialog before opening Stripe billing portal, warns about losing access to advanced features

### Batch 4 — Pre-Launch UX Trust Hardening

- **Checkout success page**: Button always renders (not gated on `scanId`); shows "Go to Dashboard" for plan upgrades, "Open Advanced Tools" for scan-based checkouts; added error state with recovery link; added plan upgrade timing note ("within 30 seconds")
- **AI Referral panel**: Renders unconditionally (was hidden behind `trackingReady` gate, preventing users from discovering it)
- **Score alerts toggle**: Replaced non-functional toggle with "Coming soon" label (state was never persisted)
- **Prompts tracked count**: Changed hardcoded `0` to `--` to signal the count isn't loaded
- **Average Rank null state**: Shows "No citations detected yet" instead of "When mentioned by a model" when no data exists
- **AI Mentions null state**: Shows "No prompts configured yet" vs "Awaiting first scan" depending on whether scan data exists
- **Workspace shell error**: Replaced raw error string with user-friendly message and refresh prompt
- **Platform Performance toggles**: Removed non-functional 7d/30d/3m period toggles (state was never consumed)

### Batch 5 — Brand Consistency

- **Unified logo usage**: Landing header, dashboard sidebar/app-shell nav, and login now all use the same shared `AisoLogo` mark and `AisoBrand` lockup

## Design Decisions

- Used native `window.confirm()` for the cancel dialog rather than a custom modal, since Stripe's own portal handles the actual cancellation flow
- Tooltips use `<span>` wrapper (not `<div>`) to work inline within `<p>` and `<h3>` elements without breaking HTML nesting rules
- Score band legend uses the same color values as `scoreColor()` for consistency
- Tooltip text is kept under ~30 words to be scannable
