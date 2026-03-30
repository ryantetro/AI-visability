# AEO Action Center — Design Specification

**Date:** 2026-03-30
**Status:** Approved
**Scope:** New "Optimize" tab in dashboard sidebar with 5 subsystems: AEO Maturity Widget, Content Studio, Source Ecosystem Analysis, Off-Page Action Plan, Brand Narrative Consistency Checker

---

## 1. Overview

AISO currently excels at **measuring** AI search visibility (scans, prompt monitoring, competitor analysis, crawler/referral tracking). This spec adds the **optimization** layer — tools that help users actively improve their visibility based on Answer Engine Optimization (AEO) principles.

The AEO Action Center is a unified "Optimize" tab that combines:
1. AEO Maturity Score — gamified progression widget
2. Content Studio — prompt-targeted content pipeline (brief → outline → draft)
3. Source Ecosystem Analysis — which sources AI engines cite, where gaps exist
4. Off-Page Action Plan — prioritized checklist of actions beyond the website
5. Brand Narrative Consistency — cross-engine brand description alignment

**Key design decisions:**
- Extract source data from existing prompt results (no new AI API calls for source analysis)
- Progressive plan gating across Free → Starter → Pro → Growth
- Single `/optimize` route with internal tabbed sections
- AI content generation uses existing provider fallback chain (OpenAI → Anthropic → Google)
- Content Studio uses a **separate** usage counter (`content_studio_briefs`, `content_studio_drafts`) independent of the existing `contentPages` limit for FAQ generation

---

## 1.1 Prerequisites & Dependencies

This spec depends on the following existing migrations and data structures:

| Migration | Provides | Used By |
|-----------|----------|---------|
| `004_prompt_monitoring.sql` | `monitored_prompts`, `prompt_results` tables | Content opportunities, source analysis, brand consistency |
| `015_platform_selection.sql` | `user_domains.selected_platforms` column | Maturity widget (platform count) |
| `017_generated_content_pages.sql` | `generated_content_pages` table | Maturity widget (content count check) |
| `supabase/schema.sql` | `user_profiles`, `user_domains`, `user_competitors`, `scans` | All subsystems |

---

## 2. Navigation & Routing

### Sidebar Addition

Add `Optimize` to `NAV_ITEMS` in `src/components/app/dashboard-sidebar.tsx`:

```typescript
{
  key: 'optimize',
  label: 'Optimize',
  href: '/optimize',
  icon: Sparkles, // from lucide-react
  matchFn: (p) => p.startsWith('/optimize'),
}
```

Add to `WORKSPACE_KEYS` set so it carries `?report=` param.

Add to `NAV_GATES`:
```typescript
optimize: 'free' // all tiers can see the tab; individual features gated within
```

**Rationale:** The tab is visible to all tiers so Free users can see content opportunities and top-3 actions (teaser/upsell). Individual subsections apply their own plan gates internally.

### Route Structure

- `/optimize` — main page with internal tab navigation
- Tabs within the page: Maturity | Content Studio | Sources | Actions | Brand

No sub-routes. The page uses client-side tab state (URL search param `?tab=content` etc.) to switch between sections.

### Page Component

```
src/app/optimize/layout.tsx         — wraps in WorkspaceShell (provides DomainContext)
src/app/optimize/page.tsx           — server component, auth + data fetch
src/app/optimize/optimize-client.tsx — client component with tab navigation
```

Follows existing patterns from `/report`, `/brand`, `/competitors`. The `layout.tsx` must wrap children in the same `WorkspaceShell` (or equivalent provider) used by other workspace pages so that `useDomainContext()` works in child components.

---

## 3. AEO Maturity Score Widget

### Stages

| Stage | Label | Auto-Calculated Criteria |
|-------|-------|--------------------------|
| 1 | Unaware | Has a scan but no prompts tracked, no content generated |
| 2 | Auditing | 5+ prompts tracked, visibility scores on 2+ platforms |
| 3 | Optimizing | 1+ content pieces generated, active prompt monitoring, source ecosystem viewed |
| 4 | Operationalized | Content cadence active (3+ pieces), brand consistency checked, off-page actions tracked (5+ completed), 3+ platforms monitored |

### Implementation

- Computed on page load from existing tables: `scans`, `monitored_prompts`, `prompt_results`, `generated_content_pages`, `content_studio_items`, `optimization_actions`
- Platform count from `user_domains.selected_platforms` (added in migration 015)
- No new database table needed — pure computation
- Returns: `{ stage: 1-4, label: string, criteria: { key: string, met: boolean, link: string }[] }`

### UI

- Horizontal stepper/progress bar showing 4 stages
- Current stage highlighted with accent color
- Below: checklist of criteria for current + next stage
- Incomplete items are clickable links to the relevant feature/section
- Compact — fits in ~120px height at top of Optimize page

---

## 4. Content Studio

### Pipeline

```
Opportunities → Brief → Outline → Draft → Export
```

#### Step 1: Identify Content Opportunities

**Source:** `prompt_results` where `mentioned = false` or `mentionType = 'not_mentioned'` or visibility is low.

**Logic:**
1. Query all `monitored_prompts` for the domain
2. Join with `prompt_results` to find prompts where brand is absent or poorly positioned
3. Group by prompt category/topic
4. Rank by: number of engines missing from × prompt importance (user-tracked = higher)
5. Return as "content opportunities" with: prompt text, engines missing, competitors present, suggested content type

**Suggested content type heuristic:**
- Prompt contains "vs" or "compare" → `comparison`
- Prompt contains "how to" or "steps" → `howto`
- Prompt contains "what is" or "define" → `definition`
- Prompt contains "best" or "top" → `listicle`
- Prompt contains "results" or "outcome" or "success" or "case study" → `case_study`
- Prompt contains brand name directly → `faq`
- Default → `faq`

#### Step 2: Generate Brief

**Input:** Selected opportunity (prompt + context)
**AI prompt template:**
```
You are an AEO content strategist. Generate a content brief for the following:

Brand: {brand_name} ({domain})
Target prompt: "{prompt_text}"
Competitors appearing: {competitors_list}
Brand positioning: {user_tagline} — {user_differentiators}
Suggested content type: {content_type}

Generate a brief including:
1. Strategic rationale (why this content matters for AI visibility)
2. Target audience and search intent
3. Key questions the content must answer
4. Competitor analysis (what competitors say that gets them cited)
5. Recommended content type and structure
6. Target word count (1200-2000 words)
7. Key data points or claims to include
8. Schema markup recommendations
```

**Output:** Structured JSON stored in `content_studio_items.brief_json`

#### Step 3: Generate Outline

**Input:** Brief JSON
**AI prompt template:** Generate H1/H2/H3 hierarchy with key points per section, suggested FAQ questions, schema type recommendations.

For `case_study` type: Structure as Problem → Solution → Implementation → Results → Key Takeaways with emphasis on quantitative outcomes.

**Output:** Structured JSON stored in `content_studio_items.outline_json`

#### Step 4: Generate Draft

**Input:** Outline JSON + brand context
**AI prompt template:** Generate full publication-ready content with:
- Answer-first formatting (answer in first 1-2 sentences of each section)
- Clear H1→H2→H3 heading hierarchy
- FAQ section with JSON-LD schema markup
- Quantitative claims where possible
- Entity-clear brand mentions
- Meta title, meta description, OpenGraph tags
- Estimated 1200-2000 words
- For `case_study`: Include specific metrics, timelines, and before/after comparisons
- For `howto`: Include HowTo JSON-LD schema
- For `definition`: Include DefinedTerm JSON-LD schema

**Output:** HTML + Markdown stored in `content_studio_items.draft_html` and `draft_markdown`

#### Step 5: Edit & Export

- Inline editor for the draft (simple textarea or rich text)
- Export buttons: "Copy HTML" | "Download Markdown" | "Copy Schema JSON"
- Status tracking: mark as "published" when user confirms they've published it

### Content Types

| Type | Template Focus | Schema |
|------|---------------|--------|
| `comparison` | Side-by-side feature/benefit comparison tables | ItemList |
| `howto` | Numbered steps with clear instructions | HowTo |
| `definition` | Clear definition in first paragraph | DefinedTerm |
| `listicle` | Ranked list with criteria | ItemList |
| `faq` | Question-answer pairs | FAQPage |
| `case_study` | Problem → solution → results with quantitative outcomes | Article |

### Database

New table `content_studio_items`:

```sql
CREATE TABLE content_studio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  target_prompt_id UUID REFERENCES monitored_prompts(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('comparison','howto','definition','listicle','faq','case_study')),
  status TEXT NOT NULL DEFAULT 'opportunity' CHECK (status IN ('opportunity','brief','outline','draft','published')),
  title TEXT,
  brief_json JSONB,
  outline_json JSONB,
  draft_html TEXT,
  draft_markdown TEXT,
  meta_title TEXT,
  meta_description TEXT,
  schema_json JSONB,
  word_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_studio_user_domain ON content_studio_items(user_id, domain);
CREATE INDEX idx_content_studio_usage ON content_studio_items(user_id, created_at);
```

**`updated_at` handling:** All PATCH endpoints must explicitly set `updated_at = now()` in the Supabase update payload. No Postgres trigger is used, matching the pattern in other tables (`monitored_prompts`, `user_domains`).

### API Endpoints

All endpoints require `?domain=example.com` query parameter for GET requests, or `domain` field in request body for POST/PATCH.

| Method | Path | Purpose | Min Tier |
|--------|------|---------|----------|
| GET | `/api/optimize/content/opportunities?domain=` | List prompt-based content gaps | free |
| POST | `/api/optimize/content/brief` | Generate brief for an opportunity | starter |
| POST | `/api/optimize/content/outline` | Generate outline from brief | starter |
| POST | `/api/optimize/content/draft` | Generate full draft from outline | pro |
| GET | `/api/optimize/content?domain=` | List all content items | starter |
| PATCH | `/api/optimize/content/[id]` | Update/edit content | starter |
| GET | `/api/optimize/content/[id]/export?format=html\|markdown\|schema` | Export content | starter |

**Export endpoint contract:**
- `format` query param: `html` (default), `markdown`, or `schema`
- Returns JSON: `{ content: string, filename: string, contentType: string }`
- `html` → full HTML with meta tags, `markdown` → raw markdown, `schema` → JSON-LD schema object
- Follows the pattern established in `GET /api/export?type=...&format=...`

**Error responses:** All endpoints return `400` with `{ error: 'Domain is required' }` when domain is missing or user does not own the domain.

### Plan Limits (separate from existing `contentPages`)

Content Studio introduces new gate keys in `FEATURE_GATES` and new limit fields in `PLANS`:

```typescript
// FEATURE_GATES additions
content_studio_brief: 'starter',
content_studio_draft: 'pro',

// PLANS additions (new fields)
contentStudioBriefs: number;  // briefs+outlines per month
contentStudioDrafts: number;  // full drafts per month
```

| Tier | Briefs/month | Drafts/month |
|------|-------------|-------------|
| Free | 0 | 0 |
| Starter | 2 | 0 |
| Pro | 5 | 3 |
| Growth | 15 | 10 |

Usage tracked by counting `content_studio_items` rows created in the current billing period (same approach as `generated_content_pages`).

The existing `contentPages` limit (0/0/2/5) continues to gate the existing FAQ page generator independently.

---

## 5. Source Ecosystem Analysis

### Data Pipeline

No new AI API calls. Aggregates from existing `prompt_results` citation data.

**Important:** The `citation_urls` column in `prompt_results` stores a JSONB array of objects, each with `{ url, domain, anchorText, isOwnDomain, isCompetitor }`. The analyzer reads the `domain` property directly — no URL parsing needed.

1. **Collect:** All entries from `prompt_results.citation_urls[]` for the user's monitored prompts, extracting each object's `.domain` field
2. **Group:** By `.domain` value → count citation frequency
3. **Categorize:** Each source domain into: `own_site | competitor | review_platform | publisher | community | directory | other`
4. **Score:** Rank sources by citation frequency across all prompts

### Source Categorization

Automatic categorization using domain matching:

```typescript
const SOURCE_CATEGORIES: Record<string, string> = {
  // Review platforms
  'g2.com': 'review_platform',
  'capterra.com': 'review_platform',
  'trustradius.com': 'review_platform',
  'trustpilot.com': 'review_platform',
  // Community
  'reddit.com': 'community',
  'quora.com': 'community',
  'linkedin.com': 'community',
  'youtube.com': 'community',
  // Directories
  'crunchbase.com': 'directory',
  'producthunt.com': 'directory',
  // Publishers (detect by heuristic — domains appearing as citations but not in above)
};
```

- `citation_urls[].isOwnDomain === true` → `own_site`
- `citation_urls[].isCompetitor === true` → `competitor`
- Domain in `SOURCE_CATEGORIES` → mapped category
- Unknown domains default to `publisher` if cited 3+ times, `other` otherwise

### Gap Analysis Logic

**Data source for competitor citations:** Competitor citation data comes from `scans.mention_summary` (JSONB) for each competitor scan stored in `user_competitors`. The `mention_summary.results[]` array contains `citationUrls` for competitor mentions. This is a different data path than the user's own `prompt_results`.

```
1. Collect citation domains from user's prompt_results.citation_urls[]
2. Collect citation domains from competitor scans (scans.mention_summary.results[].citationUrls[])
   — joined via user_competitors.scan_id → scans.id
3. For each source domain cited in competitor scans:
     If that source domain does NOT appear in user's prompt_results citations:
       → Generate gap: "Competitors are cited from {domain} but you are not"
       → Attach recommendation based on source category
```

### Database

```sql
CREATE TABLE source_ecosystem_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  analysis_json JSONB NOT NULL,
  sources_count INT NOT NULL DEFAULT 0,
  own_site_pct NUMERIC(5,2) DEFAULT 0,
  competitor_pct NUMERIC(5,2) DEFAULT 0,
  third_party_pct NUMERIC(5,2) DEFAULT 0,
  top_gaps_json JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prompt_results_hash TEXT,
  UNIQUE(user_id, domain)
);

CREATE INDEX idx_source_cache_computed ON source_ecosystem_cache(user_id, computed_at DESC);
```

**Cache invalidation strategy:**
- Always serve cache if `computed_at` is less than 60 minutes old (minimum TTL), regardless of hash state
- If older than 60 minutes, compute a hash of `MAX(tested_at)` from `prompt_results` for the domain
- If hash differs from `prompt_results_hash`, recompute the full analysis
- If hash matches, serve existing cache

### UI Components

1. **Source Distribution Chart** — Donut chart: own site % vs competitor % vs 3rd party %
2. **Top Sources Table** — Ranked list of most-cited domains with category tags, citation count, and whether user's brand appears on that source
3. **Gap Cards** — Cards for each identified gap: source domain, category, how many competitor citations, recommended action (links to Action Plan)
4. **Per-Engine View** (Growth only) — Which sources each AI engine prefers

### API Endpoints

All endpoints require `?domain=example.com` query parameter.

| Method | Path | Purpose | Min Tier |
|--------|------|---------|----------|
| GET | `/api/optimize/sources?domain=` | Get source ecosystem analysis | starter |
| GET | `/api/optimize/sources/gaps?domain=` | Get gap analysis with recommendations | pro |

### Plan Limits

| Tier | Access |
|------|--------|
| Free | Not available |
| Starter | Source map (top 10 sources only) |
| Pro | Full source map + gap analysis |
| Growth | Full map + gaps + per-engine breakdown |

---

## 6. Off-Page Action Plan

### Action Categories

| Category | Key | Example Actions |
|----------|-----|----------------|
| Review Platforms | `review_platform` | Create/update G2 profile, Claim Capterra listing, Request TrustRadius reviews |
| Community Presence | `community` | Participate in subreddit discussions, LinkedIn thought leadership, Quora answers |
| PR & Media | `pr_media` | Pitch byline to industry publication, Submit expert commentary, Press release |
| Directory Accuracy | `directory` | Update Crunchbase, Verify Google Business, Correct comparison site data |
| Technical AEO | `technical` | Add FAQ schema, Generate llms.txt, Add Organization/HowTo schema |
| Content Distribution | `content_distribution` | Syndicate to Medium/LinkedIn, Create YouTube explainer |

### Action Generation Sources

1. **Source ecosystem gaps** → If competitors cited from G2 but user not → "Create G2 profile" action
2. **Scan fixes** → Existing `ScoreResult.fixes` → surface as technical AEO actions
3. **Prompt insights** → Negative sentiment on a topic → "Publish counter-narrative content"
4. **Best practices** → Universal actions (llms.txt, Organization schema, etc.) if not already done

### Database

```sql
CREATE TABLE optimization_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('review_platform','community','pr_media','directory','technical','content_distribution')),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('gap_analysis','scan_fix','prompt_insight','best_practice')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','dismissed')),
  estimated_impact TEXT CHECK (estimated_impact IN ('high','medium','low')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain, source, title)
);

CREATE INDEX idx_opt_actions_user_domain ON optimization_actions(user_id, domain);
```

**Idempotency:** The `UNIQUE(user_id, domain, source, title)` constraint prevents duplicate actions. The generate endpoint uses `INSERT ... ON CONFLICT DO NOTHING` to skip already-existing actions. When refreshing:
- New actions are inserted (duplicates skipped via constraint)
- Existing `pending` actions that no longer apply (gap resolved, fix completed) are set to `dismissed`
- `in_progress`, `completed`, and `dismissed` actions are never deleted or overwritten

### API Endpoints

All endpoints require `?domain=example.com` query parameter for GET, or `domain` in body for POST/PATCH.

| Method | Path | Purpose | Min Tier |
|--------|------|---------|----------|
| GET | `/api/optimize/actions?domain=` | List all actions for domain | free (top 3 only) |
| POST | `/api/optimize/actions/generate` | Generate/refresh actions from latest data | starter |
| PATCH | `/api/optimize/actions/[id]` | Update action status | starter |

### Plan Limits

| Tier | Access |
|------|--------|
| Free | View top 3 actions only (read-only) |
| Starter | View all actions, track status |
| Pro | Full actions + auto-generation from source gaps |
| Growth | Everything + custom action creation |

### UI

- Grouped checklist by category with collapsible sections
- Each action: title, description, priority badge, impact estimate, status toggle
- Progress bar at top: X of Y actions completed
- "Refresh actions" button to regenerate from latest scan/prompt data
- Completed actions move to a "Completed" collapsed section

---

## 7. Brand Narrative Consistency Checker

### User-Defined Positioning

Form fields stored in `brand_positioning` table:

```sql
CREATE TABLE brand_positioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  differentiators_json JSONB, -- string array of 3-5 key differentiators
  target_audience TEXT,
  category TEXT,
  negative_associations_json JSONB, -- string array of what NOT to be associated with
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);
```

**`updated_at` handling:** PUT endpoint must explicitly set `updated_at = now()` in the update payload.

### Consistency Analysis

**Input:** Brand positioning + all `prompt_results` containing mention data

**Process (AI-assisted):**
1. Collect all `MentionResult` entries where `mentioned = true`
2. Group by engine → extract description snippets, sentiment, descriptionAccuracy
3. Send to AI with prompt:

```
Compare these AI engine descriptions of {brand_name} against the user's intended positioning:

Intended: {tagline}, {description}, differentiators: {differentiators}
Category: {category}
Should NOT be associated with: {negative_associations}

Engine descriptions:
- ChatGPT: {descriptions}
- Perplexity: {descriptions}
- Gemini: {descriptions}
...

Analyze:
1. Consistency score (0-100): how well do AI descriptions match intended positioning?
2. Cross-engine consistency: do engines agree with each other?
3. Specific flags: list each inconsistency with engine, what it says, what's wrong
4. Recommendations: how to fix each inconsistency
```

**Output:** Cached in `brand_consistency_cache`:

```sql
CREATE TABLE brand_consistency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  consistency_score INT NOT NULL DEFAULT 0,
  engine_descriptions_json JSONB,
  flags_json JSONB,
  recommendations_json JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);
```

### UI Components

1. **Positioning Card** — Editable card showing user's brand positioning definition. "Set up your brand positioning" CTA if not yet defined.
2. **Consistency Score** — Large number (0-100%) with color coding (green/yellow/red)
3. **Engine Comparison Grid** — Side-by-side cards for each engine showing how they describe the brand, with match/mismatch indicators
4. **Flags List** — Specific inconsistencies: engine name, what it says, how it differs from intended positioning, severity
5. **Recommendations** — Each flag has a linked recommendation (content to publish, profile to update, etc.)

### API Endpoints

All endpoints require `?domain=example.com` query parameter for GET, or `domain` in body for PUT.

| Method | Path | Purpose | Min Tier |
|--------|------|---------|----------|
| GET | `/api/optimize/brand-positioning?domain=` | Get brand positioning | pro |
| PUT | `/api/optimize/brand-positioning` | Set/update brand positioning | pro |
| GET | `/api/optimize/brand-consistency?domain=` | Get consistency analysis | pro |

### Plan Limits

| Tier | Access |
|------|--------|
| Free/Starter | Not available |
| Pro | Positioning + consistency score + flags |
| Growth | Everything + per-engine breakdown + historical tracking |

---

## 8. Plan Gating Summary

| Feature | Free | Starter | Pro | Growth |
|---------|------|---------|-----|--------|
| Optimize tab visible | Yes | Yes | Yes | Yes |
| AEO Maturity Widget | View only | Full | Full | Full |
| Content Opportunities | View list | View list | View list | View list |
| Content Briefs | - | 2/month | 5/month | 15/month |
| Content Outlines | - | 2/month | 5/month | 15/month |
| Content Drafts | - | - | 3/month | 10/month |
| Source Map | - | Top 10 | Full | Full + per-engine |
| Source Gaps | - | - | Full | Full |
| Action Plan | Top 3 (read-only) | Full + tracking | Full + auto-gen | Full + custom |
| Brand Positioning | - | - | Full | Full |
| Brand Consistency | - | - | Score + flags | Full + history |

New `FEATURE_GATES` entries:
```typescript
content_studio_brief: 'starter',
content_studio_draft: 'pro',
source_ecosystem: 'starter',
source_gaps: 'pro',
action_plan_full: 'starter',
action_plan_autogen: 'pro',
brand_positioning: 'pro',
brand_consistency: 'pro',
```

---

## 9. Database Migration Summary

New migration file `025_optimize_tables.sql` creates 5 tables:

1. `content_studio_items` — content pipeline artifacts (`user_id TEXT REFERENCES user_profiles`)
2. `source_ecosystem_cache` — aggregated source analysis
3. `optimization_actions` — trackable action items (with `UNIQUE(user_id, domain, source, title)`)
4. `brand_positioning` — user-defined brand positioning
5. `brand_consistency_cache` — consistency analysis results

All tables:
- Use `user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE` (matching existing codebase convention)
- Include `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Enable RLS with service-role-only policy (matching `017_generated_content_pages.sql` pattern)

---

## 10. File Structure

```
src/app/optimize/
  layout.tsx                  — wraps in WorkspaceShell (provides DomainContext)
  page.tsx                    — server component (auth, data fetch)
  optimize-client.tsx         — client component (tab navigation, layout)
  components/
    maturity-widget.tsx       — AEO maturity score stepper
    content-studio/
      opportunities-list.tsx  — content gap cards
      brief-editor.tsx        — brief view/generate
      outline-editor.tsx      — outline view/generate
      draft-editor.tsx        — draft view/edit/export
      content-list.tsx        — all content items list
    source-ecosystem/
      source-chart.tsx        — donut chart of source distribution
      source-table.tsx        — top sources ranked table
      gap-cards.tsx           — source gap cards
    action-plan/
      action-list.tsx         — grouped checklist
      action-card.tsx         — individual action item
      progress-bar.tsx        — completion progress
    brand-consistency/
      positioning-form.tsx    — brand positioning editor
      consistency-score.tsx   — score display
      engine-grid.tsx         — cross-engine comparison
      flags-list.tsx          — inconsistency flags

src/app/api/optimize/
  content/
    opportunities/route.ts
    brief/route.ts
    outline/route.ts
    draft/route.ts
    route.ts                  — list all content items
    [id]/route.ts             — update content item
    [id]/export/route.ts      — export content (format=html|markdown|schema)
  sources/
    route.ts                  — source ecosystem analysis
    gaps/route.ts             — gap analysis
  actions/
    route.ts                  — list actions
    generate/route.ts         — generate actions (idempotent via UNIQUE constraint)
    [id]/route.ts             — update action status
  brand-positioning/route.ts  — get/set brand positioning
  brand-consistency/route.ts  — get consistency analysis

src/lib/optimize/
  maturity.ts                 — maturity stage computation
  content-prompts.ts          — AI prompt templates for content generation
  source-analyzer.ts          — citation aggregation + gap detection
  action-generator.ts         — action generation logic
  brand-analyzer.ts           — brand consistency analysis
  source-categories.ts        — domain → category mapping

supabase/migrations/
  025_optimize_tables.sql     — all 5 new tables + indexes + RLS
```

---

## 11. Dependencies

- No new npm packages required
- Uses existing AI provider chain (OpenAI → Anthropic → Google)
- Uses existing Supabase client patterns
- Uses existing plan gating infrastructure (`FEATURE_GATES`, `canAccess`, `PLANS`)
- Chart library: use existing charting approach from competitor analysis (or add recharts if not already present)
- `WorkspaceShell` (or equivalent layout wrapper) from existing workspace pages
