# AEO Action Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Optimize" tab to the AISO dashboard with 5 subsystems — AEO Maturity Widget, Content Studio, Source Ecosystem Analysis, Off-Page Action Plan, and Brand Narrative Consistency Checker — that give users actionable tools to improve their AI search visibility, not just measure it.

**Architecture:** Single `/optimize` page using the existing `WorkspaceShell` pattern with client-side tabs. 5 new database tables in one migration. API routes follow existing patterns (`getAuthUserFromRequest` → `getUserAccess` → domain validation). AI content generation reuses the existing provider fallback chain.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres), OpenAI/Anthropic/Google AI APIs, Lucide icons, existing plan gating infrastructure.

**Spec:** `docs/superpowers/specs/2026-03-30-aeo-action-center-design.md`

---

## Phase 1: Foundation (Database + Navigation + Shell)

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/025_optimize_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- AEO Action Center tables
-- Spec: docs/superpowers/specs/2026-03-30-aeo-action-center-design.md

-- 1. Content Studio items (brief → outline → draft pipeline)
CREATE TABLE IF NOT EXISTS content_studio_items (
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

CREATE INDEX IF NOT EXISTS idx_content_studio_user_domain ON content_studio_items(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_content_studio_usage ON content_studio_items(user_id, created_at);

ALTER TABLE content_studio_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON content_studio_items FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 2. Source ecosystem cache
CREATE TABLE IF NOT EXISTS source_ecosystem_cache (
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

CREATE INDEX IF NOT EXISTS idx_source_cache_computed ON source_ecosystem_cache(user_id, computed_at DESC);

ALTER TABLE source_ecosystem_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON source_ecosystem_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 3. Optimization actions (trackable off-page checklist)
CREATE TABLE IF NOT EXISTS optimization_actions (
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

CREATE INDEX IF NOT EXISTS idx_opt_actions_user_domain ON optimization_actions(user_id, domain);

ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON optimization_actions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 4. Brand positioning (user-defined)
CREATE TABLE IF NOT EXISTS brand_positioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  differentiators_json JSONB,
  target_audience TEXT,
  category TEXT,
  negative_associations_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

ALTER TABLE brand_positioning ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON brand_positioning FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 5. Brand consistency cache
CREATE TABLE IF NOT EXISTS brand_consistency_cache (
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

ALTER TABLE brand_consistency_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON brand_consistency_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` (or apply via Supabase dashboard if using remote)
Expected: All 5 tables created with indexes and RLS policies.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/025_optimize_tables.sql
git commit -m "feat: add database tables for AEO Action Center (025)"
```

---

### Task 2: Plan Gating Updates

**Files:**
- Modify: `src/lib/pricing.ts`

- [ ] **Step 1: Add `contentStudioBriefs` and `contentStudioDrafts` to `PlanConfig` interface**

In `src/lib/pricing.ts`, add two fields to the `PlanConfig` interface after `contentPages`:

```typescript
contentStudioBriefs: number;
contentStudioDrafts: number;
```

- [ ] **Step 2: Add values to each tier in `PLANS`**

After the `contentPages` line in each plan object:

```typescript
// free:
contentStudioBriefs: 0,
contentStudioDrafts: 0,

// starter:
contentStudioBriefs: 2,
contentStudioDrafts: 0,

// pro:
contentStudioBriefs: 5,
contentStudioDrafts: 3,

// growth:
contentStudioBriefs: 15,
contentStudioDrafts: 10,
```

- [ ] **Step 3: Add new FEATURE_GATES entries**

Add after the existing `content_generation: 'pro'` line:

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

- [ ] **Step 4: Add NAV_GATES entry**

Add after the `leaderboard` entry:

```typescript
optimize: 'free',
```

- [ ] **Step 5: Add `maxContentStudioBriefs` and `maxContentStudioDrafts` to `AccessInfo` in `src/lib/access.ts`**

Add the fields to the `AccessInfo` interface and set them in `getUserAccess`:

```typescript
// Interface:
maxContentStudioBriefs: number;
maxContentStudioDrafts: number;

// In getUserAccess return:
maxContentStudioBriefs: PLANS[tier].contentStudioBriefs,
maxContentStudioDrafts: PLANS[tier].contentStudioDrafts,
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/pricing.ts src/lib/access.ts
git commit -m "feat: add plan gating for AEO Action Center features"
```

---

### Task 3: Sidebar Navigation

**Files:**
- Modify: `src/components/app/dashboard-sidebar.tsx`

- [ ] **Step 1: Import `Sparkles` icon**

Add `Sparkles` to the lucide-react import at the top of the file.

- [ ] **Step 2: Add Optimize to NAV_ITEMS**

Add after the `leaderboard` entry in the `NAV_ITEMS` array:

```typescript
{
  key: 'optimize',
  label: 'Optimize',
  href: '/optimize',
  icon: Sparkles,
  matchFn: (p) => p.startsWith('/optimize'),
},
```

- [ ] **Step 3: Add to WORKSPACE_KEYS**

Add `'optimize'` to the `WORKSPACE_KEYS` set:

```typescript
const WORKSPACE_KEYS = new Set(['dashboard', 'report', 'brand', 'competitors', 'settings', 'optimize']);
```

- [ ] **Step 4: Verify sidebar renders**

Run: `npm run dev`
Navigate to dashboard. Verify "Optimize" appears in sidebar with sparkles icon.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/dashboard-sidebar.tsx
git commit -m "feat: add Optimize tab to sidebar navigation"
```

---

### Task 4: Page Shell + Tab Navigation

**Files:**
- Create: `src/app/optimize/page.tsx`
- Create: `src/app/optimize/optimize-client.tsx`

- [ ] **Step 1: Create the page component**

Create `src/app/optimize/page.tsx` following the pattern from `src/app/brand/page.tsx`:

```typescript
'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { OptimizeClient } from './optimize-client';

export default function OptimizePage() {
  return (
    <WorkspaceShell sectionKey="optimize">
      {(ctx) => (
        <OptimizeClient domain={ctx.domain} />
      )}
    </WorkspaceShell>
  );
}
```

- [ ] **Step 2: Create the client component with tab navigation**

Create `src/app/optimize/optimize-client.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sparkles, FileText, Globe2, CheckSquare, Shield } from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Sparkles },
  { key: 'content', label: 'Content Studio', icon: FileText },
  { key: 'sources', label: 'Sources', icon: Globe2 },
  { key: 'actions', label: 'Actions', icon: CheckSquare },
  { key: 'brand', label: 'Brand Check', icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function OptimizeClient({ domain }: { domain: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get('tab') as TabKey) || 'overview';

  const setTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors rounded-t-lg',
                isActive
                  ? 'text-white border-b-2 border-[#25c972]'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <div className="text-zinc-400 text-sm">
            {/* Maturity widget will go here */}
            <p>AEO Action Center — Overview coming soon</p>
          </div>
        )}
        {activeTab === 'content' && (
          <div className="text-zinc-400 text-sm">
            <p>Content Studio coming soon</p>
          </div>
        )}
        {activeTab === 'sources' && (
          <div className="text-zinc-400 text-sm">
            <p>Source Ecosystem coming soon</p>
          </div>
        )}
        {activeTab === 'actions' && (
          <div className="text-zinc-400 text-sm">
            <p>Action Plan coming soon</p>
          </div>
        )}
        {activeTab === 'brand' && (
          <div className="text-zinc-400 text-sm">
            <p>Brand Consistency coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify page loads**

Run: `npm run dev`
Navigate to `/optimize`. Verify:
- Page loads inside WorkspaceShell with sidebar
- 5 tabs render and switch correctly
- URL updates with `?tab=content` etc.

- [ ] **Step 4: Commit**

```bash
git add src/app/optimize/
git commit -m "feat: add Optimize page shell with tab navigation"
```

---

## Phase 2: AEO Maturity Widget

### Task 5: Maturity Computation Logic

**Files:**
- Create: `src/lib/optimize/maturity.ts`

- [ ] **Step 1: Create the maturity computation module**

```typescript
import { getSupabaseClient } from '@/lib/supabase';

export interface MaturityCriterion {
  key: string;
  label: string;
  met: boolean;
  tab: string; // which optimize tab to link to
}

export interface MaturityResult {
  stage: 1 | 2 | 3 | 4;
  label: 'Unaware' | 'Auditing' | 'Optimizing' | 'Operationalized';
  criteria: MaturityCriterion[];
}

const STAGE_LABELS: Record<number, MaturityResult['label']> = {
  1: 'Unaware',
  2: 'Auditing',
  3: 'Optimizing',
  4: 'Operationalized',
};

export async function computeMaturity(
  userId: string,
  domain: string
): Promise<MaturityResult> {
  const sb = getSupabaseClient();

  // Parallel queries for all data needed
  const [
    promptsRes,
    platformsRes,
    contentRes,
    studioRes,
    actionsRes,
    brandRes,
  ] = await Promise.all([
    sb.from('monitored_prompts').select('id', { count: 'exact', head: true })
      .eq('domain', domain).eq('user_id', userId).eq('active', true),
    sb.from('user_domains').select('selected_platforms')
      .eq('user_id', userId).eq('domain', domain).single(),
    sb.from('generated_content_pages').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('domain', domain),
    sb.from('content_studio_items').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('domain', domain)
      .in('status', ['brief', 'outline', 'draft', 'published']),
    sb.from('optimization_actions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('domain', domain).eq('status', 'completed'),
    sb.from('brand_consistency_cache').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('domain', domain),
  ]);

  const promptCount = promptsRes.count ?? 0;
  const platformCount = (platformsRes.data?.selected_platforms as string[] | null)?.length ?? 0;
  const contentCount = (contentRes.count ?? 0) + (studioRes.count ?? 0);
  const completedActions = actionsRes.count ?? 0;
  const hasBrandCheck = (brandRes.count ?? 0) > 0;

  // Build criteria
  const criteria: MaturityCriterion[] = [
    // Stage 2 criteria
    { key: 'prompts_5', label: 'Track 5+ prompts', met: promptCount >= 5, tab: 'content' },
    { key: 'platforms_2', label: 'Monitor 2+ AI platforms', met: platformCount >= 2, tab: 'sources' },
    // Stage 3 criteria
    { key: 'content_1', label: 'Generate 1+ content piece', met: contentCount >= 1, tab: 'content' },
    // Stage 4 criteria
    { key: 'content_3', label: 'Create 3+ content pieces', met: contentCount >= 3, tab: 'content' },
    { key: 'brand_check', label: 'Run brand consistency check', met: hasBrandCheck, tab: 'brand' },
    { key: 'actions_5', label: 'Complete 5+ optimization actions', met: completedActions >= 5, tab: 'actions' },
    { key: 'platforms_3', label: 'Monitor 3+ AI platforms', met: platformCount >= 3, tab: 'sources' },
  ];

  // Determine stage
  let stage: 1 | 2 | 3 | 4 = 1;
  const stage2Met = promptCount >= 5 && platformCount >= 2;
  const stage3Met = stage2Met && contentCount >= 1;
  const stage4Met = stage3Met && contentCount >= 3 && hasBrandCheck && completedActions >= 5 && platformCount >= 3;

  if (stage4Met) stage = 4;
  else if (stage3Met) stage = 3;
  else if (stage2Met) stage = 2;

  return { stage, label: STAGE_LABELS[stage], criteria };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/optimize/maturity.ts
git commit -m "feat: add AEO maturity stage computation logic"
```

---

### Task 6: Maturity Widget UI

**Files:**
- Create: `src/app/optimize/components/maturity-widget.tsx`
- Modify: `src/app/optimize/optimize-client.tsx`

- [ ] **Step 1: Create the maturity widget component**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface MaturityCriterion {
  key: string;
  label: string;
  met: boolean;
  tab: string;
}

interface MaturityData {
  stage: number;
  label: string;
  criteria: MaturityCriterion[];
}

const STAGES = [
  { num: 1, label: 'Unaware' },
  { num: 2, label: 'Auditing' },
  { num: 3, label: 'Optimizing' },
  { num: 4, label: 'Operationalized' },
];

export function MaturityWidget({
  domain,
  onTabChange,
}: {
  domain: string;
  onTabChange: (tab: string) => void;
}) {
  const [data, setData] = useState<MaturityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/optimize/maturity?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!data) return null;

  const nextCriteria = data.criteria.filter((c) => !c.met);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">AEO Maturity</h3>
        <span className="text-xs font-medium text-[#25c972]">{data.label}</span>
      </div>

      {/* Stage stepper */}
      <div className="flex items-center gap-1 mb-4">
        {STAGES.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0',
                data.stage >= s.num
                  ? 'bg-[#25c972]/20 text-[#25c972] border border-[#25c972]/40'
                  : 'bg-white/[0.04] text-zinc-600 border border-white/[0.06]'
              )}
            >
              {s.num}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mx-1',
                  data.stage > s.num ? 'bg-[#25c972]/40' : 'bg-white/[0.06]'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Stage labels */}
      <div className="flex gap-1 mb-4">
        {STAGES.map((s) => (
          <div key={s.num} className="flex-1 text-center">
            <span className={cn(
              'text-[10px]',
              data.stage >= s.num ? 'text-zinc-400' : 'text-zinc-600'
            )}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Next steps */}
      {nextCriteria.length > 0 && (
        <div className="border-t border-white/[0.06] pt-3 space-y-2">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Next steps</p>
          {nextCriteria.slice(0, 3).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onTabChange(c.tab)}
              className="flex items-center gap-2 w-full text-left text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Circle className="h-3 w-3 shrink-0 text-zinc-600" />
              {c.label}
            </button>
          ))}
        </div>
      )}

      {nextCriteria.length === 0 && (
        <div className="border-t border-white/[0.06] pt-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#25c972]" />
          <span className="text-xs text-[#25c972]">All milestones complete</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the maturity API endpoint**

Create `src/app/api/optimize/maturity/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { computeMaturity } from '@/lib/optimize/maturity';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required.' }, { status: 400 });
  }

  const result = await computeMaturity(user.id, domain.trim().toLowerCase());
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Wire maturity widget into optimize-client.tsx**

Replace the overview tab placeholder in `optimize-client.tsx` with:

```typescript
import { MaturityWidget } from './components/maturity-widget';

// In the overview tab section:
{activeTab === 'overview' && (
  <MaturityWidget domain={domain} onTabChange={setTab} />
)}
```

- [ ] **Step 4: Verify maturity widget renders**

Run: `npm run dev`
Navigate to `/optimize`. Verify the maturity widget shows with stage stepper and next steps.

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimize/maturity.ts src/app/api/optimize/maturity/route.ts src/app/optimize/components/maturity-widget.tsx src/app/optimize/optimize-client.tsx
git commit -m "feat: add AEO maturity widget with stage stepper"
```

---

## Phase 3: Off-Page Action Plan

Building this before Content Studio because it has no AI API dependency and provides immediate value.

### Task 7: Action Generator Logic

**Files:**
- Create: `src/lib/optimize/action-generator.ts`

- [ ] **Step 1: Create the action generation module**

This module generates optimization actions from scan data and best practices. See spec Section 6 for categories and generation sources.

Key logic:
- `generateBestPracticeActions(domain, scanData)` — universal actions (llms.txt, Organization schema, etc.)
- `generateScanFixActions(domain, fixes)` — convert existing `ScoreResult.fixes` into optimization actions
- Each action returns `{ category, title, description, source, priority, estimated_impact }`

The function should accept the domain's latest scan data (`ScoreResult.fixes`) and return an array of action objects ready for insert.

- [ ] **Step 2: Commit**

```bash
git add src/lib/optimize/action-generator.ts
git commit -m "feat: add optimization action generator logic"
```

---

### Task 8: Action Plan API Endpoints

**Files:**
- Create: `src/app/api/optimize/actions/route.ts`
- Create: `src/app/api/optimize/actions/generate/route.ts`
- Create: `src/app/api/optimize/actions/[id]/route.ts`

- [ ] **Step 1: Create GET /api/optimize/actions**

Lists all optimization actions for a domain. Free users get top 3 only.

Follow the pattern from `src/app/api/prompts/route.ts`:
- `getAuthUserFromRequest` → `getUserAccess` → validate domain → query `optimization_actions`
- If Free tier: `LIMIT 3 ORDER BY priority DESC, created_at ASC`
- Otherwise: return all, ordered by priority then category

- [ ] **Step 2: Create POST /api/optimize/actions/generate**

Generates actions from latest scan data. Min tier: starter.

Logic:
1. Get latest scan for the domain
2. Call `action-generator.ts` to produce action list
3. `INSERT INTO optimization_actions ... ON CONFLICT (user_id, domain, source, title) DO NOTHING`
4. Return the full action list

- [ ] **Step 3: Create PATCH /api/optimize/actions/[id]**

Updates action status. Accepts `{ status, completed_at }` in body.

When status changes to `completed`, set `completed_at = now()`.
When status changes away from `completed`, clear `completed_at`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/optimize/actions/
git commit -m "feat: add action plan API endpoints"
```

---

### Task 9: Action Plan UI

**Files:**
- Create: `src/app/optimize/components/action-plan/action-list.tsx`
- Create: `src/app/optimize/components/action-plan/action-card.tsx`
- Create: `src/app/optimize/components/action-plan/progress-bar.tsx`
- Modify: `src/app/optimize/optimize-client.tsx`

- [ ] **Step 1: Create progress bar component**

Simple bar showing `X of Y actions completed` with percentage fill.

- [ ] **Step 2: Create action card component**

Each card shows: title, description, priority badge (high=red, medium=yellow, low=green), estimated impact, and a status dropdown/toggle (pending → in_progress → completed | dismissed).

- [ ] **Step 3: Create action list component**

Groups actions by category with collapsible sections. Shows progress bar at top. Has "Generate Actions" button that calls POST `/api/optimize/actions/generate`. Completed actions go to a collapsed "Completed" section.

- [ ] **Step 4: Wire into optimize-client.tsx**

Import and render `ActionList` in the `actions` tab:

```typescript
{activeTab === 'actions' && (
  <ActionList domain={domain} />
)}
```

- [ ] **Step 5: Verify actions tab works end-to-end**

Run: `npm run dev`
Navigate to `/optimize?tab=actions`. Click "Generate Actions". Verify actions appear grouped by category. Toggle status on an action. Refresh page — status persists.

- [ ] **Step 6: Commit**

```bash
git add src/app/optimize/components/action-plan/ src/app/optimize/optimize-client.tsx
git commit -m "feat: add action plan UI with grouped checklist"
```

---

## Phase 4: Source Ecosystem Analysis

### Task 10: Source Analyzer Logic

**Files:**
- Create: `src/lib/optimize/source-categories.ts`
- Create: `src/lib/optimize/source-analyzer.ts`

- [ ] **Step 1: Create source categories mapping**

The `SOURCE_CATEGORIES` constant mapping known domains to categories. See spec Section 5 for the full list. Also export a `categorizeSource` function that checks `isOwnDomain`, `isCompetitor`, known domains, and the 3+ citation heuristic.

- [ ] **Step 2: Create source analyzer**

Two main functions:
- `analyzeSourceEcosystem(userId, domain)` — aggregates `prompt_results.citation_urls[]` entries, groups by `.domain`, categorizes, computes percentages
- `analyzeSourceGaps(userId, domain)` — compares user citation domains against competitor scan citation domains (from `scans.mention_summary.results[].citationUrls[]` via `user_competitors`)

Both functions return structured data matching `source_ecosystem_cache.analysis_json` and `top_gaps_json` schemas.

Include caching logic: check `source_ecosystem_cache`, serve if `computed_at` < 60 min, otherwise recompute if hash changed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/optimize/source-categories.ts src/lib/optimize/source-analyzer.ts
git commit -m "feat: add source ecosystem analyzer with gap detection"
```

---

### Task 11: Source Ecosystem API + UI

**Files:**
- Create: `src/app/api/optimize/sources/route.ts`
- Create: `src/app/api/optimize/sources/gaps/route.ts`
- Create: `src/app/optimize/components/source-ecosystem/source-chart.tsx`
- Create: `src/app/optimize/components/source-ecosystem/source-table.tsx`
- Create: `src/app/optimize/components/source-ecosystem/gap-cards.tsx`
- Modify: `src/app/optimize/optimize-client.tsx`

- [ ] **Step 1: Create source API endpoints**

`GET /api/optimize/sources?domain=` — returns source ecosystem analysis. Min tier: starter. Starter gets top 10 only.

`GET /api/optimize/sources/gaps?domain=` — returns gap analysis. Min tier: pro.

Both use `source-analyzer.ts` functions and handle caching.

- [ ] **Step 2: Create source distribution chart**

Donut chart showing own site % vs competitor % vs 3rd party %. Use a simple SVG donut (no external chart library needed — follow any existing charting patterns in the codebase, e.g., the share-of-voice donut at `src/app/competitors/share-of-voice-donut.tsx`).

- [ ] **Step 3: Create source table**

Ranked list of most-cited domains. Each row: domain name, category badge, citation count, "Your brand appears" indicator (checkmark or X).

- [ ] **Step 4: Create gap cards**

Cards for each source gap: source domain, category tag, competitor citation count, and a recommended action with link to the Actions tab.

- [ ] **Step 5: Wire into optimize-client.tsx**

```typescript
{activeTab === 'sources' && (
  <SourceEcosystem domain={domain} />
)}
```

- [ ] **Step 6: Verify sources tab works**

Navigate to `/optimize?tab=sources`. Verify chart renders, table shows sources, gaps show competitor-only sources.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/optimize/sources/ src/app/optimize/components/source-ecosystem/ src/app/optimize/optimize-client.tsx
git commit -m "feat: add source ecosystem analysis with gap detection UI"
```

---

## Phase 5: Content Studio

### Task 12: Content Prompts + Opportunity Detection

**Files:**
- Create: `src/lib/optimize/content-prompts.ts`
- Create: `src/app/api/optimize/content/opportunities/route.ts`

- [ ] **Step 1: Create content type heuristic + AI prompt templates**

`content-prompts.ts` exports:
- `inferContentType(promptText: string): ContentType` — the heuristic from spec Section 4, Step 1
- `buildBriefPrompt(input: BriefInput): string` — the AI prompt template for brief generation
- `buildOutlinePrompt(brief: object, contentType: string): string` — outline template
- `buildDraftPrompt(outline: object, brandContext: object, contentType: string): string` — draft template with per-type customization (case_study, howto, definition, etc.)

- [ ] **Step 2: Create opportunities API endpoint**

`GET /api/optimize/content/opportunities?domain=` — queries `monitored_prompts` joined with `prompt_results`, finds prompts where brand is absent or poorly positioned, returns ranked list with suggested content types. Available to all tiers.

- [ ] **Step 3: Commit**

```bash
git add src/lib/optimize/content-prompts.ts src/app/api/optimize/content/opportunities/route.ts
git commit -m "feat: add content opportunity detection and AI prompt templates"
```

---

### Task 13: Content Generation API Endpoints

**Files:**
- Create: `src/app/api/optimize/content/brief/route.ts`
- Create: `src/app/api/optimize/content/outline/route.ts`
- Create: `src/app/api/optimize/content/draft/route.ts`
- Create: `src/app/api/optimize/content/route.ts`
- Create: `src/app/api/optimize/content/[id]/route.ts`
- Create: `src/app/api/optimize/content/[id]/export/route.ts`

- [ ] **Step 1: Create brief generation endpoint**

`POST /api/optimize/content/brief` — min tier: starter. Accepts `{ domain, promptId, contentType }`.
1. Check monthly usage: count `content_studio_items` where `status IN ('brief','outline','draft','published')` in current billing period
2. If over limit, return 403
3. Fetch prompt + brand positioning + competitor data
4. Call AI with brief prompt template (use existing provider fallback from `src/lib/content-generator.ts` pattern)
5. Insert into `content_studio_items` with `status = 'brief'`, store response in `brief_json`
6. Return the created item

- [ ] **Step 2: Create outline generation endpoint**

`POST /api/optimize/content/outline` — min tier: starter. Accepts `{ id }` (content_studio_item id).
1. Fetch the item, verify status is `brief`
2. Call AI with outline prompt template using `brief_json`
3. Update item: set `outline_json`, change status to `outline`, set `updated_at = now()`
4. Return updated item

- [ ] **Step 3: Create draft generation endpoint**

`POST /api/optimize/content/draft` — min tier: pro. Accepts `{ id }`.
1. Check monthly draft usage limit
2. Fetch item, verify status is `outline`
3. Call AI with draft prompt template using `outline_json` + brand context
4. Update item: set `draft_html`, `draft_markdown`, `meta_title`, `meta_description`, `schema_json`, `word_count`, change status to `draft`, set `updated_at = now()`
5. Return updated item

- [ ] **Step 4: Create list + update + export endpoints**

`GET /api/optimize/content?domain=` — list all content items for domain. Min tier: starter.

`PATCH /api/optimize/content/[id]` — update item (edit title, draft text, status). Always set `updated_at = now()`.

`GET /api/optimize/content/[id]/export?format=html|markdown|schema` — returns `{ content, filename, contentType }`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/optimize/content/
git commit -m "feat: add Content Studio API endpoints (brief/outline/draft/export)"
```

---

### Task 14: Content Studio UI

**Files:**
- Create: `src/app/optimize/components/content-studio/opportunities-list.tsx`
- Create: `src/app/optimize/components/content-studio/content-list.tsx`
- Create: `src/app/optimize/components/content-studio/brief-editor.tsx`
- Create: `src/app/optimize/components/content-studio/outline-editor.tsx`
- Create: `src/app/optimize/components/content-studio/draft-editor.tsx`
- Modify: `src/app/optimize/optimize-client.tsx`

- [ ] **Step 1: Create opportunities list**

Shows content gaps: each card displays prompt text, engines where brand is missing, competitors present, suggested content type badge. "Generate Brief" button on each.

- [ ] **Step 2: Create content list**

Shows all content items with status badges (opportunity → brief → outline → draft → published). Click to expand/view details.

- [ ] **Step 3: Create brief editor**

Displays the generated brief as structured sections (rationale, audience, questions, etc.). "Generate Outline" button. Shows loading state during AI generation.

- [ ] **Step 4: Create outline editor**

Displays the outline as an indented heading tree. "Generate Draft" button (gated to Pro+).

- [ ] **Step 5: Create draft editor**

Displays the draft in a textarea/rich editor. Three export buttons: "Copy HTML", "Download Markdown", "Copy Schema JSON". "Mark as Published" button to update status.

- [ ] **Step 6: Wire Content Studio into optimize-client.tsx**

The Content tab should show opportunities list at top, then existing content items below. When a user clicks into an item, show the appropriate editor (brief/outline/draft) based on its status.

- [ ] **Step 7: Verify Content Studio works end-to-end**

Navigate to `/optimize?tab=content`. Verify opportunities show from prompt data. Generate a brief → outline → draft. Export the draft. Mark as published.

- [ ] **Step 8: Commit**

```bash
git add src/app/optimize/components/content-studio/ src/app/optimize/optimize-client.tsx
git commit -m "feat: add Content Studio UI with full pipeline"
```

---

## Phase 6: Brand Narrative Consistency

### Task 15: Brand Positioning API + Brand Analyzer

**Files:**
- Create: `src/lib/optimize/brand-analyzer.ts`
- Create: `src/app/api/optimize/brand-positioning/route.ts`
- Create: `src/app/api/optimize/brand-consistency/route.ts`

- [ ] **Step 1: Create brand analyzer module**

`analyzeBrandConsistency(userId, domain)`:
1. Fetch `brand_positioning` for the domain
2. Fetch all `prompt_results` where `mentioned = true`, group by engine
3. Extract description snippets, sentiment, descriptionAccuracy per engine
4. Call AI with the consistency analysis prompt (spec Section 7)
5. Parse response into `{ consistency_score, engine_descriptions_json, flags_json, recommendations_json }`
6. Upsert into `brand_consistency_cache`
7. Return the result

- [ ] **Step 2: Create brand positioning endpoint**

`GET /api/optimize/brand-positioning?domain=` — returns the positioning record. Min tier: pro.

`PUT /api/optimize/brand-positioning` — creates or updates (upsert) brand positioning. Body: `{ domain, tagline, description, differentiators, targetAudience, category, negativeAssociations }`. Sets `updated_at = now()`. Min tier: pro.

- [ ] **Step 3: Create brand consistency endpoint**

`GET /api/optimize/brand-consistency?domain=` — returns cached consistency analysis, or computes if stale/missing. Min tier: pro.

- [ ] **Step 4: Commit**

```bash
git add src/lib/optimize/brand-analyzer.ts src/app/api/optimize/brand-positioning/route.ts src/app/api/optimize/brand-consistency/route.ts
git commit -m "feat: add brand positioning and consistency analysis APIs"
```

---

### Task 16: Brand Consistency UI

**Files:**
- Create: `src/app/optimize/components/brand-consistency/positioning-form.tsx`
- Create: `src/app/optimize/components/brand-consistency/consistency-score.tsx`
- Create: `src/app/optimize/components/brand-consistency/engine-grid.tsx`
- Create: `src/app/optimize/components/brand-consistency/flags-list.tsx`
- Modify: `src/app/optimize/optimize-client.tsx`

- [ ] **Step 1: Create positioning form**

Form with fields: tagline (text input), description (textarea), differentiators (list of text inputs, add/remove), target audience (text), category (text), negative associations (list). "Save Positioning" button.

If no positioning exists, show a "Set up your brand positioning" CTA card.

- [ ] **Step 2: Create consistency score display**

Large circle/number showing 0-100 score with color coding:
- 80-100: green (#25c972)
- 50-79: yellow (#ffbb00)
- 0-49: red (#ff5252)

"Analyze Consistency" button to trigger recompute.

- [ ] **Step 3: Create engine comparison grid**

Side-by-side cards for each AI engine showing how it describes the brand. Match/mismatch indicator per engine against intended positioning.

- [ ] **Step 4: Create flags list**

List of specific inconsistencies: engine name, what it says, what's wrong, severity badge. Each flag links to a recommended action (content to publish, profile to update).

- [ ] **Step 5: Wire into optimize-client.tsx**

```typescript
{activeTab === 'brand' && (
  <BrandConsistency domain={domain} />
)}
```

- [ ] **Step 6: Verify brand tab works**

Navigate to `/optimize?tab=brand`. Fill in positioning form. Click analyze. Verify score, engine grid, and flags display correctly.

- [ ] **Step 7: Commit**

```bash
git add src/app/optimize/components/brand-consistency/ src/app/optimize/optimize-client.tsx
git commit -m "feat: add brand narrative consistency checker UI"
```

---

## Phase 7: Documentation + Polish

### Task 17: Documentation

**Files:**
- Create: `docs/25-aeo-action-center.md`
- Modify: `docs/00-overview.md`

- [ ] **Step 1: Write documentation**

Create `docs/25-aeo-action-center.md` following the project's documentation rule (CLAUDE.md):
1. What it does
2. Key files table
3. How it works (logic flow per subsystem)
4. API contracts (all optimize endpoints)
5. Error handling
6. Configuration (plan gates, feature limits)

- [ ] **Step 2: Update overview index**

Add the AEO Action Center entry to `docs/00-overview.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/25-aeo-action-center.md docs/00-overview.md
git commit -m "docs: add AEO Action Center documentation"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Foundation | Tasks 1-4 | Database, plan gates, sidebar nav, page shell |
| 2. Maturity | Tasks 5-6 | AEO maturity widget on overview tab |
| 3. Actions | Tasks 7-9 | Off-page action plan with grouped checklist |
| 4. Sources | Tasks 10-11 | Source ecosystem analysis with gap detection |
| 5. Content | Tasks 12-14 | Full content pipeline (opportunities → briefs → drafts) |
| 6. Brand | Tasks 15-16 | Brand positioning + consistency checker |
| 7. Docs | Task 17 | Documentation per project rules |

Each phase produces a working, committable increment. Phases 2-6 are independent of each other and can be built in any order after Phase 1.
