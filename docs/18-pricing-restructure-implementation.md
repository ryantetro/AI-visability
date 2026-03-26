# Pricing Restructure Implementation

Covers all features implemented as part of the 4-tier pricing restructure (Phases 1-6 from `17-pricing-restructure-plan.md`).

---

## 1. Pricing Core (Phase 1)

### What it does
Upgraded from 3 tiers (Free/Starter/Pro) to 4 tiers (Free/$49 Starter/$99 Pro/$249 Growth). Added `growth` plan tier, updated all feature gates, access limits, Stripe integration, and pricing UI.

### Key files

| File | Role |
|------|------|
| `src/lib/pricing.ts` | `PlanTier`, `PLANS` config, `FEATURE_GATES`, `NAV_GATES`, price helpers |
| `src/lib/access.ts` | `AccessInfo` interface with new limit fields, `getUserAccess()` |
| `src/lib/user-profile.ts` | `VALID_PLANS` set, `UserUsage` interface, `upgradeUserPlan()` |
| `src/lib/services/stripe-payment.ts` | Growth tier Stripe price IDs, checkout session creation |
| `src/components/pricing/pricing-section.tsx` | 4-card pricing page UI |
| `src/hooks/use-plan.ts` | Client hook exposing `maxPlatforms`, `maxRegions`, `maxSeats`, `maxContentPages` |
| `src/lib/plan-cache.ts` | Plan snapshot with new fields |
| `src/app/api/auth/me/route.ts` | Returns new access fields in auth response |

### Plan limits per tier

| Limit | Free | Starter | Pro | Growth |
|-------|------|---------|-----|--------|
| Domains | 1 | 1 | 3 | 10 |
| Prompts | 5 | 25 | 75 | 200 |
| Platforms | 2 | 2 | 4 | -1 (all) |
| Competitors | 0 | 0 | 3 | 10 |
| Regions | 1 | 1 | 3 | -1 (unlimited) |
| Seats | 1 | 1 | 3 | -1 (unlimited) |
| Content pages/mo | 0 | 0 | 2 | 5 |

### Feature gates

All gates are in `FEATURE_GATES` in `pricing.ts`. Key new gates:
- `content_generation`: `pro`
- `data_export`: `pro`
- `full_export`: `growth`
- `region_targeting`: `pro`
- `team_seats`: `pro`

### Env vars for Stripe

```
STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
STRIPE_PRICE_GROWTH_ANNUAL=price_xxx
```

---

## 2. Platform Selection Gating (Phase 2)

### What it does
Gates which AI engines (ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok) users can track based on their plan tier. Users select platforms in settings; limit enforced in scans and cron monitoring.

### Key files

| File | Role |
|------|------|
| `src/lib/platform-gating.ts` | `PLATFORM_PRIORITY`, `getScannableEngines()`, `getSelectedPlatforms()`, `saveSelectedPlatforms()` |
| `supabase/migrations/015_platform_selection.sql` | Adds `selected_platforms text[]` column to `user_domains` |
| `src/app/api/user/domains/platforms/route.ts` | GET/PATCH for platform selection per domain |
| `src/app/advanced/settings/settings-section.tsx` | Platform picker UI with toggle switches |
| `src/app/api/cron/monitor/route.ts` | Filters engines per domain owner's selected platforms |

### How it works
1. `PLATFORM_PRIORITY` defines the default order: ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok
2. When no platforms are saved, `getScannableEngines()` returns the top N engines from the priority list based on the user's `maxPlatforms` limit
3. Users can customize via the settings UI; selections stored in `user_domains.selected_platforms`
4. The cron monitor resolves each domain owner's platforms before testing prompts

---

## 3. Data Export (Phase 3)

### What it does
CSV and JSON export for scan results, prompt data, crawler visits, and referral visits. Gated behind `data_export` (Pro+) and `full_export` (Growth) feature flags.

### Key files

| File | Role |
|------|------|
| `src/app/api/export/route.ts` | Unified export endpoint supporting `type=scans|prompts|crawler-visits|referral-visits` and `format=csv|json` |
| `src/components/ui/export-button.tsx` | Reusable dropdown button with CSV/JSON options, plan gating, download handling |
| `src/app/advanced/panels/ai-crawler-panel.tsx` | Uses ExportButton for crawler-visits |
| `src/app/advanced/panels/ai-referral-panel.tsx` | Uses ExportButton for referral-visits |
| `src/app/advanced/panels/prompt-library-panel.tsx` | Uses ExportButton for prompts |
| `src/app/advanced/panels/ai-visibility-dashboard.tsx` | Uses ExportButton for scans |

### API contract

```
GET /api/export?type=scans&domain=example.com&format=csv
GET /api/export?type=prompts&domain=example.com&format=json
GET /api/export?type=crawler-visits&domain=example.com&days=30&format=csv
GET /api/export?type=referral-visits&domain=example.com&days=30&format=json
```

Response: Binary file download with `Content-Disposition` header.

### Error handling
- 401 if not authenticated
- 403 if feature gate not met
- 400 for invalid type/format/domain
- Falls back to empty data if DB queries fail

---

## 4. Prompt Volume Analytics (Phase 4)

### What it does
Dedicated analytics panel showing prompt performance trends over time with line charts (mention rate per engine per week), engine comparison bar chart, and KPI cards.

### Key files

| File | Role |
|------|------|
| `src/app/advanced/panels/prompt-analytics-panel.tsx` | Full analytics panel with Recharts line/bar charts, KPI cards |
| `src/app/api/prompts/trends/route.ts` | Aggregation endpoint returning weekly trends per engine |
| `src/app/advanced/dashboard/dashboard-section.tsx` | Renders PromptAnalyticsPanel on main dashboard |
| `src/app/advanced/brand/brand-section.tsx` | Renders PromptAnalyticsPanel in Traffic tab |

### How it works
1. Panel fetches `/api/prompts/trends?domain=...`
2. Computes derived data: active engines, weekly chart rows, summary KPIs, engine comparison
3. Renders 4 KPI cards: Total Checks, Mention Rate, Best Engine, Weekly Trend
4. Line chart shows mention rate over time (one line per engine)
5. Bar chart compares engines side by side
6. Gated: locked for `free` tier users

---

## 5. Region & Language Targeting (Phase 5)

### What it does
Allows users to specify geographic regions for prompt testing. AI engines receive region context hints (e.g., "Answer as if user is in Germany. Respond in German.") to simulate localized AI responses.

### Key files

| File | Role |
|------|------|
| `src/lib/region-gating.ts` | `REGIONS` list (10 regions), `applyRegionContext()`, `validateRegionSelection()`, `getSelectedRegions()`, `saveSelectedRegions()` |
| `supabase/migrations/016_region_selection.sql` | Adds `selected_regions text[]` column to `user_domains` |
| `src/app/api/user/domains/regions/route.ts` | GET/PATCH for region selection per domain |
| `src/app/advanced/settings/settings-section.tsx` | Region picker UI with flag emojis and toggle switches |
| `src/app/api/cron/monitor/route.ts` | Applies region context to prompts before AI engine testing |

### Supported regions
US (en), UK (en), Canada (en), Australia (en), Germany (de), France (fr), Spain (es), Brazil (pt), Japan (ja), India (en)

### How it works
1. Users select regions in settings; stored in `user_domains.selected_regions`
2. `validateRegionSelection()` enforces plan limits (`maxRegions`)
3. During cron monitoring, the primary region is resolved per domain
4. `applyRegionContext()` appends the region's `contextHint` to prompt text for non-US regions
5. Default region is `us-en` (no modification to prompt)

---

## 6. AI-Optimized Page Generator (Phase 6)

### What it does
Generates structured, AI-optimized content pages designed to maximize visibility in AI engine responses. Includes FAQ sections with schema markup, structured data, and citation-friendly formatting.

### Key files

| File | Role |
|------|------|
| `src/lib/content-generator.ts` | Content generation logic: system prompt, AI provider fallback (OpenAI > Anthropic > Google), FAQ schema extraction, HTML head generation |
| `src/app/api/content-generate/route.ts` | POST (generate page) and GET (list history + usage) endpoints |
| `supabase/migrations/017_generated_content_pages.sql` | `generated_content_pages` table for tracking |
| `src/app/advanced/panels/content-generator-panel.tsx` | UI panel with topic form, generation trigger, markdown preview, copy/download actions, usage meter, history |
| `src/app/advanced/brand/brand-section.tsx` | Renders ContentGeneratorPanel in new "Content" tab |

### API contracts

**POST /api/content-generate**
```json
Request:
{
  "topic": "Best practices for local SEO",
  "domain": "example.com",
  "brand": "Example Co",
  "industry": "SaaS",
  "keywords": ["SEO", "local search"],
  "tone": "professional"
}

Response:
{
  "title": "...",
  "slug": "...",
  "markdown": "...",
  "htmlHead": "...",
  "faqSchema": "...",
  "wordCount": 1500,
  "generatedAt": "2026-03-25T..."
}
```

**GET /api/content-generate?domain=example.com**
```json
Response:
{
  "pages": [{ "id", "title", "slug", "topic", "word_count", "created_at" }],
  "usage": { "used": 1, "limit": 2 }
}
```

### How it works
1. User fills in topic (required), brand, industry, keywords, tone
2. API validates input, checks feature gate (`content_generation` / Pro+), checks monthly usage limit
3. `generateContentPage()` builds a detailed prompt and calls AI providers in fallback order:
   - OpenAI (`gpt-4o-mini`) if `OPENAI_API_KEY` is set
   - Anthropic (`claude-haiku-4-5`) if `ANTHROPIC_API_KEY` is set
   - Google (`gemini-2.5-flash`) if `GOOGLE_GENAI_API_KEY` is set
4. Post-processes: extracts title from H1, generates slug, builds FAQ schema from markdown, generates HTML head meta tags
5. Saves to `generated_content_pages` table for tracking
6. UI shows markdown preview with copy (Markdown, HTML Head, FAQ Schema) and download (.md) actions

### Error handling
- 401/403 for auth/feature gate failures
- 400 for invalid input (topic too short/long, missing domain)
- 403 with usage details when monthly limit reached
- 500 if all AI providers fail
- DB save failure is non-critical (page still returned)

### Configuration

Requires at least one AI provider API key:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENAI_API_KEY=AI...
```

---

## Database Migrations Summary

| Migration | Description |
|-----------|-------------|
| `015_platform_selection.sql` | Adds `selected_platforms text[]` to `user_domains` |
| `016_region_selection.sql` | Adds `selected_regions text[]` to `user_domains` |
| `017_generated_content_pages.sql` | Creates `generated_content_pages` table with RLS |
