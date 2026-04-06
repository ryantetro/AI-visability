# Actions Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Actions" sidebar tab that shows a guided, prioritized action plan with Supabase-backed checklist persistence.

**Architecture:** New `/actions` page using the existing `WorkspaceShell` pattern. A Supabase `action_checklist` table stores manual check-off state per user/domain/check. A React context shares the badge count with the sidebar. The API uses POST for sync/toggle and GET for lightweight badge count.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), React context, lucide-react icons, Framer Motion, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-06-actions-tab-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/027_action_checklist.sql` | Create | DB table + RLS |
| `src/lib/services/supabase-action-checklist.ts` | Create | Supabase service (sync, toggle, count) |
| `src/app/api/action-checklist/route.ts` | Create | POST handler (sync + toggle) |
| `src/app/api/action-checklist/count/route.ts` | Create | GET handler (badge count) |
| `src/types/action-checklist.ts` | Create | Shared TypeScript types |
| `src/hooks/use-action-checklist.ts` | Create | React hook (fetch, toggle, filter) |
| `src/contexts/action-checklist-context.tsx` | Create | Context provider for sidebar badge |
| `src/app/actions/page.tsx` | Create | Page shell |
| `src/app/advanced/actions/actions-section.tsx` | Create | Main UI (progress + filters + list) |
| `src/app/advanced/actions/action-card.tsx` | Create | Individual action card |
| `src/app/advanced/actions/progress-ring.tsx` | Create | SVG progress ring |
| `src/components/app/dashboard-sidebar.tsx` | Modify | Add "Actions" nav item + badge |
| `src/components/app/dashboard-layout.tsx` | Modify | Mount `ActionChecklistProvider` |
| `src/lib/pricing.ts` | Modify | Add `actions: 'free'` to `NAV_GATES` |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/027_action_checklist.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/027_action_checklist.sql
CREATE TABLE IF NOT EXISTS action_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  check_id text NOT NULL,
  action_type text NOT NULL DEFAULT 'fix',
  manual_status text NOT NULL DEFAULT 'pending',
  scan_status text NOT NULL DEFAULT 'unknown',
  last_scan_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT action_checklist_action_type_check CHECK (action_type IN ('fix', 'keep_doing')),
  CONSTRAINT action_checklist_manual_status_check CHECK (manual_status IN ('pending', 'done')),
  CONSTRAINT action_checklist_scan_status_check CHECK (scan_status IN ('pass', 'fail', 'unknown')),
  CONSTRAINT action_checklist_unique UNIQUE (user_id, domain, check_id)
);

ALTER TABLE action_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist"
  ON action_checklist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist"
  ON action_checklist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist"
  ON action_checklist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist"
  ON action_checklist FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_action_checklist_user_domain
  ON action_checklist (user_id, domain);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` (or apply via Supabase dashboard)
Expected: Table created with RLS policies and index.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/027_action_checklist.sql
git commit -m "feat: add action_checklist table migration (027)"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/action-checklist.ts`

- [ ] **Step 1: Define shared types**

```typescript
// src/types/action-checklist.ts
import type { DimensionKey, WebHealthPillarKey, AuditCategory, EffortBand } from './score';

export type ActionType = 'fix' | 'keep_doing';
export type ManualStatus = 'pending' | 'done';
export type ScanStatus = 'pass' | 'fail' | 'unknown';

/** Row shape returned from the API after sync */
export interface ActionChecklistItem {
  checkId: string;
  actionType: ActionType;
  manualStatus: ManualStatus;
  scanStatus: ScanStatus;
  label: string;
  detail: string;
  dimension: DimensionKey | WebHealthPillarKey | null;
  category: AuditCategory | null;
  estimatedLift: number;
  effortBand: EffortBand | null;
  copyPrompt: string | null;
  isComplete: boolean;
  isRegression: boolean;
}

export interface ActionChecklistSummary {
  total: number;
  complete: number;
  remaining: number;
  potentialLift: number;
}

export interface SyncResponse {
  items: ActionChecklistItem[];
  summary: ActionChecklistSummary;
}

export interface ToggleResponse {
  checkId: string;
  manualStatus: ManualStatus;
  scanStatus: ScanStatus;
  isComplete: boolean;
  isRegression: boolean;
  updatedAt: string;
}

export interface CountResponse {
  remaining: number;
}

/** Payload shape sent to sync endpoint */
export interface SyncItemPayload {
  checkId: string;
  actionType: ActionType;
  scanStatus: ScanStatus;
  label: string;
  detail: string;
  dimension: DimensionKey | WebHealthPillarKey | null;
  category: AuditCategory | null;
  estimatedLift: number;
  effortBand: EffortBand | null;
  copyPrompt: string | null;
}

export type ActionViewMode = 'priority' | 'category' | 'effort';
export type ActionStatusFilter = 'all' | 'todo' | 'done';
```

- [ ] **Step 2: Commit**

```bash
git add src/types/action-checklist.ts
git commit -m "feat: add ActionChecklist TypeScript types"
```

---

### Task 3: Supabase Service Layer

**Files:**
- Create: `src/lib/services/supabase-action-checklist.ts`

This follows the exact same pattern as `supabase-crawler-visits.ts` — raw `fetch` calls with `supabaseUrl` / `supabaseHeaders` helpers, `fromRow` / `toRow` converters for camelCase ↔ snake_case.

- [ ] **Step 1: Write the service file**

```typescript
// src/lib/services/supabase-action-checklist.ts
import type {
  ActionChecklistItem,
  ActionChecklistSummary,
  SyncItemPayload,
  ManualStatus,
  ScanStatus,
} from '@/types/action-checklist';

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`;
}

function supabaseHeaders(extra?: HeadersInit): HeadersInit {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

interface ChecklistRow {
  id: string;
  user_id: string;
  domain: string;
  check_id: string;
  action_type: string;
  manual_status: string;
  scan_status: string;
  last_scan_id: string | null;
  created_at: string;
  updated_at: string;
}

function deriveCompletion(manualStatus: string, scanStatus: string) {
  const isRegression = manualStatus === 'done' && scanStatus === 'fail';
  const isComplete =
    scanStatus === 'pass' ||
    (manualStatus === 'done' && scanStatus !== 'fail');
  return { isComplete, isRegression };
}

/**
 * Sync: upsert all items from the latest scan, return merged list.
 * Uses service_role key so RLS is bypassed — caller must validate userId.
 */
export async function syncChecklist(
  userId: string,
  domain: string,
  items: SyncItemPayload[],
): Promise<{ items: ActionChecklistItem[]; summary: ActionChecklistSummary }> {
  // Upsert each item
  const upsertRows = items.map((item) => ({
    user_id: userId,
    domain,
    check_id: item.checkId,
    action_type: item.actionType,
    scan_status: item.scanStatus,
    updated_at: new Date().toISOString(),
  }));

  if (upsertRows.length > 0) {
    await fetch(
      supabaseUrl('action_checklist?on_conflict=user_id,domain,check_id'),
      {
        method: 'POST',
        headers: supabaseHeaders({
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(upsertRows),
      },
    );
  }

  // Fetch all rows for this user+domain
  const qs = new URLSearchParams({
    user_id: `eq.${userId}`,
    domain: `eq.${domain}`,
    order: 'created_at.asc',
  });
  const res = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'GET',
    headers: supabaseHeaders(),
  });
  const rows: ChecklistRow[] = await res.json();

  // Build a lookup from sync payload for display fields
  const payloadMap = new Map(items.map((i) => [i.checkId, i]));

  const merged: ActionChecklistItem[] = rows
    .map((row) => {
      const payload = payloadMap.get(row.check_id);
      if (!payload) return null; // stale row not in current scan — skip
      const { isComplete, isRegression } = deriveCompletion(
        row.manual_status,
        row.scan_status,
      );
      return {
        checkId: row.check_id,
        actionType: row.action_type as ActionChecklistItem['actionType'],
        manualStatus: row.manual_status as ActionChecklistItem['manualStatus'],
        scanStatus: row.scan_status as ActionChecklistItem['scanStatus'],
        label: payload.label,
        detail: payload.detail,
        dimension: payload.dimension,
        category: payload.category,
        estimatedLift: payload.estimatedLift,
        effortBand: payload.effortBand,
        copyPrompt: payload.copyPrompt,
        isComplete,
        isRegression,
      };
    })
    .filter((x): x is ActionChecklistItem => x !== null);

  const complete = merged.filter((i) => i.isComplete).length;
  const remaining = merged.length - complete;
  const potentialLift = merged
    .filter((i) => !i.isComplete)
    .reduce((sum, i) => sum + i.estimatedLift, 0);

  return {
    items: merged,
    summary: { total: merged.length, complete, remaining, potentialLift },
  };
}

/**
 * Toggle: update manual_status for a single item.
 */
export async function toggleChecklistItem(
  userId: string,
  domain: string,
  checkId: string,
  manualStatus: ManualStatus,
): Promise<{
  checkId: string;
  manualStatus: ManualStatus;
  scanStatus: ScanStatus;
  isComplete: boolean;
  isRegression: boolean;
  updatedAt: string;
}> {
  const now = new Date().toISOString();
  const qs = new URLSearchParams({
    user_id: `eq.${userId}`,
    domain: `eq.${domain}`,
    check_id: `eq.${checkId}`,
  });

  const res = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'PATCH',
    headers: supabaseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({
      manual_status: manualStatus,
      updated_at: now,
    }),
  });

  const rows: ChecklistRow[] = await res.json();
  if (!rows.length) throw new Error('Item not found');

  const row = rows[0];
  const { isComplete, isRegression } = deriveCompletion(
    row.manual_status,
    row.scan_status,
  );

  return {
    checkId: row.check_id,
    manualStatus: row.manual_status as ManualStatus,
    scanStatus: row.scan_status as ScanStatus,
    isComplete,
    isRegression,
    updatedAt: row.updated_at,
  };
}

/**
 * Count: lightweight remaining count for sidebar badge.
 */
export async function getChecklistCount(
  userId: string,
  domain: string,
): Promise<{ remaining: number }> {
  const qs = new URLSearchParams({
    user_id: `eq.${userId}`,
    domain: `eq.${domain}`,
    select: 'manual_status,scan_status',
  });

  const res = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'GET',
    headers: supabaseHeaders(),
  });
  const rows: Pick<ChecklistRow, 'manual_status' | 'scan_status'>[] =
    await res.json();

  const remaining = rows.filter((row) => {
    const { isComplete } = deriveCompletion(row.manual_status, row.scan_status);
    return !isComplete;
  }).length;

  return { remaining };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/supabase-action-checklist.ts
git commit -m "feat: add Supabase service layer for action checklist"
```

---

### Task 4: API Routes

**Files:**
- Create: `src/app/api/action-checklist/route.ts`
- Create: `src/app/api/action-checklist/count/route.ts`

- [ ] **Step 1: Write the POST route**

```typescript
// src/app/api/action-checklist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import {
  syncChecklist,
  toggleChecklistItem,
} from '@/lib/services/supabase-action-checklist';
import type { ManualStatus, SyncItemPayload } from '@/types/action-checklist';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { action, domain } = body as {
    action?: string;
    domain?: string;
  };

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json(
      { error: 'domain is required.' },
      { status: 400 },
    );
  }

  if (action === 'sync') {
    const { items } = body as { items?: SyncItemPayload[] };
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items array is required for sync.' },
        { status: 400 },
      );
    }
    try {
      const result = await syncChecklist(user.id, domain, items);
      return NextResponse.json(result);
    } catch (err) {
      console.error('action-checklist sync error:', err);
      return NextResponse.json(
        { error: 'Failed to sync checklist.' },
        { status: 500 },
      );
    }
  }

  if (action === 'toggle') {
    const { checkId, manualStatus } = body as {
      checkId?: string;
      manualStatus?: ManualStatus;
    };
    if (!checkId || !manualStatus) {
      return NextResponse.json(
        { error: 'checkId and manualStatus are required for toggle.' },
        { status: 400 },
      );
    }
    try {
      const result = await toggleChecklistItem(
        user.id,
        domain,
        checkId,
        manualStatus,
      );
      return NextResponse.json(result);
    } catch (err) {
      console.error('action-checklist toggle error:', err);
      return NextResponse.json(
        { error: 'Failed to toggle item.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: 'Invalid action. Use "sync" or "toggle".' },
    { status: 400 },
  );
}
```

- [ ] **Step 2: Write the GET count route**

```typescript
// src/app/api/action-checklist/count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getChecklistCount } from '@/lib/services/supabase-action-checklist';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json(
      { error: 'domain query param is required.' },
      { status: 400 },
    );
  }

  try {
    const result = await getChecklistCount(user.id, domain);
    return NextResponse.json(result);
  } catch (err) {
    console.error('action-checklist count error:', err);
    return NextResponse.json(
      { error: 'Failed to get count.' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/action-checklist/route.ts src/app/api/action-checklist/count/route.ts
git commit -m "feat: add action-checklist API routes (sync, toggle, count)"
```

---

### Task 5: React Context for Sidebar Badge

**Files:**
- Create: `src/contexts/action-checklist-context.tsx`
- Modify: `src/components/app/dashboard-layout.tsx`

- [ ] **Step 1: Write the context provider**

First, add a safe domain context hook to `src/contexts/domain-context.tsx`. Add this export at the bottom of the file:

```typescript
/**
 * Safe variant that returns null instead of throwing when outside DomainProvider.
 * Used by ActionChecklistProvider which may mount above DomainProvider.
 */
export function useDomainContextSafe() {
  const ctx = useContext(DomainContext);
  return ctx; // returns null if outside provider, no throw
}
```

Note: This requires checking how `DomainContext` is created. If it uses `createContext<DomainContextValue | null>(null)` and `useDomainContext` does the null check + throw, then `useDomainContextSafe` just returns `useContext(DomainContext)` directly. If `DomainContext` has a non-null default, adjust accordingly.

Then write the context provider:

```typescript
// src/contexts/action-checklist-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDomainContextSafe } from './domain-context';
import type { CountResponse } from '@/types/action-checklist';

interface ActionChecklistContextValue {
  remainingCount: number | null;
  refreshCount: () => void;
}

const ActionChecklistContext = createContext<ActionChecklistContextValue>({
  remainingCount: null,
  refreshCount: () => {},
});

export function ActionChecklistProvider({ children }: { children: React.ReactNode }) {
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const domainCtx = useDomainContextSafe();
  const selectedDomain = domainCtx?.selectedDomain ?? null;

  const fetchCount = useCallback(async () => {
    if (!selectedDomain) {
      setRemainingCount(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/action-checklist/count?domain=${encodeURIComponent(selectedDomain)}`,
      );
      if (res.ok) {
        const data: CountResponse = await res.json();
        setRemainingCount(data.remaining);
      }
    } catch {
      // silent — badge just won't show
    }
  }, [selectedDomain]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return (
    <ActionChecklistContext.Provider
      value={{ remainingCount, refreshCount: fetchCount }}
    >
      {children}
    </ActionChecklistContext.Provider>
  );
}

export function useActionChecklistCount() {
  return useContext(ActionChecklistContext);
}
```

- [ ] **Step 2: Mount provider in dashboard layout — ABOVE sidebar**

In `src/components/app/dashboard-layout.tsx`, wrap the **entire layout** (not just `<main>`) with `ActionChecklistProvider` so both the sidebar and page content can read the context:

```typescript
// Add import at top:
import { ActionChecklistProvider } from '@/contexts/action-checklist-context';
```

The component changes from:
```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <Suspense>
        <DashboardSidebar />
      </Suspense>
      ...
    </div>
  );
}
```
to:
```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActionChecklistProvider>
      <div className="min-h-screen bg-[var(--surface-page)]">
        <Suspense>
          <DashboardSidebar />
        </Suspense>
        ...
      </div>
    </ActionChecklistProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/action-checklist-context.tsx src/components/app/dashboard-layout.tsx
git commit -m "feat: add ActionChecklistProvider context for sidebar badge"
```

---

### Task 6: Sidebar Nav Item + Badge

**Files:**
- Modify: `src/components/app/dashboard-sidebar.tsx` (lines 7-26 imports, lines 57-100 NAV_ITEMS, lines 119 WORKSPACE_KEYS, lines 1013-1058 render)
- Modify: `src/lib/pricing.ts` (line 151 NAV_GATES)

- [ ] **Step 1: Add `ListChecks` to imports in sidebar**

In `src/components/app/dashboard-sidebar.tsx`, add `ListChecks` to the lucide-react import block (line 7-26).

- [ ] **Step 2: Add Actions to NAV_ITEMS at index 2**

Insert after the Report entry (currently index 1) and before Competitors (currently index 2):

```typescript
{
  key: 'actions',
  label: 'Actions',
  href: '/actions',
  icon: ListChecks,
  matchFn: (p) => p === '/actions',
},
```

- [ ] **Step 3: Add 'actions' to WORKSPACE_KEYS set**

In `src/components/app/dashboard-sidebar.tsx` line 119, add `'actions'`:

```typescript
const WORKSPACE_KEYS = new Set(['dashboard', 'report', 'actions', 'brand', 'competitors', 'settings']);
```

- [ ] **Step 4: Update slice boundary from (0, 2) to (0, 3)**

In the `renderSidebarContent` function, change `NAV_ITEMS.slice(0, 2)` to `NAV_ITEMS.slice(0, 3)` (so Dashboard, Report, AND Actions render before the Brand sub-nav injection).

Also change `NAV_ITEMS.slice(2)` to `NAV_ITEMS.slice(3)` for the items after Brand.

- [ ] **Step 5: Add badge rendering to NavItem for Actions**

Import `useActionChecklistCount` and render a badge. In the `NavItem` component, after the label `<span>`, add a badge when the item key is `'actions'`. The simplest approach: in the parent render loop, pass a `badge` prop to `NavItem` when `item.key === 'actions'`.

Add a `badge?: number | null` prop to `NavItem` and render it:

```tsx
{!collapsed && badge != null && badge > 0 && (
  <span className="ml-auto shrink-0 rounded-full bg-[#ffbb00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#ffbb00]">
    {badge}
  </span>
)}
```

In the render loop, read the count from context using `useActionChecklistCount()` at the top of `renderSidebarContent`, and pass `badge={item.key === 'actions' ? remainingCount : undefined}` to `NavItem`.

- [ ] **Step 6: Add `actions: 'free'` to NAV_GATES**

In `src/lib/pricing.ts`, add to the `NAV_GATES` object:

```typescript
actions: 'free',
```

- [ ] **Step 7: Verify the sidebar renders correctly**

Run: `npm run dev` and check:
- "Actions" tab appears between Report and Brand
- Badge shows (may be 0 initially with no data)
- Collapsed mode shows tooltip
- All other tabs still work

- [ ] **Step 8: Commit**

```bash
git add src/components/app/dashboard-sidebar.tsx src/lib/pricing.ts
git commit -m "feat: add Actions nav item to sidebar with badge count"
```

---

### Task 7: Progress Ring Component

**Files:**
- Create: `src/app/advanced/actions/progress-ring.tsx`

- [ ] **Step 1: Write the progress ring**

```tsx
// src/app/advanced/actions/progress-ring.tsx
'use client';

interface ProgressRingProps {
  complete: number;
  total: number;
  size?: number;
}

export function ProgressRing({ complete, total, size = 80 }: ProgressRingProps) {
  const pct = total > 0 ? (complete / total) * 100 : 0;
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={6}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="#25c972"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-500 ease-out"
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-[16px] font-bold"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/advanced/actions/progress-ring.tsx
git commit -m "feat: add ProgressRing SVG component for actions page"
```

---

### Task 8: Action Card Component

**Files:**
- Create: `src/app/advanced/actions/action-card.tsx`

- [ ] **Step 1: Write the action card**

```tsx
// src/app/advanced/actions/action-card.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionChecklistItem } from '@/types/action-checklist';

interface ActionCardProps {
  item: ActionChecklistItem;
  onToggle: (checkId: string, newStatus: 'done' | 'pending') => void;
}

export function ActionCard({ item, onToggle }: ActionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!item.copyPrompt) return;
    void navigator.clipboard.writeText(item.copyPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scanVerified = item.scanStatus === 'pass';
  const isDone = item.isComplete && !item.isRegression;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
        item.isRegression
          ? 'border-[#ffbb00]/20 bg-[#ffbb00]/[0.03]'
          : isDone
            ? 'border-white/5 bg-white/[0.01] opacity-60'
            : 'border-white/8 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.035]',
      )}
    >
      {/* Checkbox / status icon */}
      <div className="mt-0.5 shrink-0">
        {scanVerified ? (
          <CheckCircle2 className="h-5 w-5 text-[#25c972]" />
        ) : item.isRegression ? (
          <div className="relative" title="Regression: latest scan found this still failing">
            <AlertTriangle className="h-5 w-5 text-[#ffbb00]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              onToggle(item.checkId, item.manualStatus === 'done' ? 'pending' : 'done')
            }
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
              item.manualStatus === 'done'
                ? 'border-[#25c972] bg-[#25c972]/20'
                : 'border-zinc-600 hover:border-zinc-400',
            )}
          >
            {item.manualStatus === 'done' && (
              <Check className="h-3 w-3 text-[#25c972]" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-[13px] font-medium',
          isDone ? 'text-zinc-500 line-through' : 'text-zinc-200',
        )}>
          {item.label}
        </p>
        {item.detail && (
          <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2">
            {item.detail}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {item.category && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                item.category === 'ai'
                  ? 'bg-[#a855f7]/15 text-[#a855f7]'
                  : 'bg-[#3b82f6]/15 text-[#3b82f6]',
              )}
            >
              {item.category === 'ai' ? 'AI' : 'Web'}
            </span>
          )}
          {item.effortBand && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                item.effortBand === 'quick'
                  ? 'bg-[#25c972]/10 text-[#25c972]'
                  : item.effortBand === 'medium'
                    ? 'bg-[#ffbb00]/10 text-[#ffbb00]'
                    : 'bg-[#ff8a1e]/10 text-[#ff8a1e]',
              )}
            >
              {item.effortBand.charAt(0).toUpperCase() + item.effortBand.slice(1)}
            </span>
          )}
          {item.isRegression && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-[#ffbb00]/10 text-[#ffbb00]">
              Regression
            </span>
          )}
        </div>
      </div>

      {/* Right side: points + copy */}
      <div className="flex shrink-0 items-center gap-2">
        {item.estimatedLift > 0 && !isDone && (
          <span className="text-[11px] font-semibold text-[#25c972]">
            +{item.estimatedLift}pts
          </span>
        )}
        {item.copyPrompt && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
            aria-label="Copy fix prompt"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#25c972]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/advanced/actions/action-card.tsx
git commit -m "feat: add ActionCard component with toggle, copy, and regression states"
```

---

### Task 9: Actions Section (Main UI)

**Files:**
- Create: `src/app/advanced/actions/actions-section.tsx`

- [ ] **Step 1: Write the actions section**

This is the main component. It receives the `WorkspaceContext`, extracts `PrioritizedFix[]` from the report, builds `SyncItemPayload[]`, calls sync on mount, and renders the progress hero + filter bar + grouped action list.

```tsx
// src/app/advanced/actions/actions-section.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ListChecks, PartyPopper, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressRing } from './progress-ring';
import { ActionCard } from './action-card';
import { useActionChecklistCount } from '@/contexts/action-checklist-context';
import type {
  ActionChecklistItem,
  ActionChecklistSummary,
  ActionViewMode,
  ActionStatusFilter,
  SyncItemPayload,
  SyncResponse,
  ToggleResponse,
} from '@/types/action-checklist';
import type { DashboardReportData } from '../lib/types';
import type { PrioritizedFix } from '@/types/score';

// Dimension display labels
const DIMENSION_LABELS: Record<string, string> = {
  'file-presence': 'File Presence',
  'structured-data': 'Structured Data',
  'content-signals': 'Content Signals',
  'topical-authority': 'Topical Authority',
  'entity-clarity': 'Entity Clarity',
  'ai-registration': 'AI Registration',
  performance: 'Performance',
  quality: 'Quality',
  security: 'Security',
};

const EFFORT_LABELS: Record<string, string> = {
  quick: 'Quick Wins',
  medium: 'Medium Effort',
  technical: 'Technical',
};

/** Keep-doing items that represent ongoing best practices / setup tasks */
const KEEP_DOING_ITEMS: Omit<SyncItemPayload, 'scanStatus'>[] = [
  {
    checkId: 'kd-articles',
    actionType: 'keep_doing',
    label: 'Get AI-optimized articles',
    detail: 'Content designed to boost your AI engine rankings',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
  },
  {
    checkId: 'kd-monitoring',
    actionType: 'keep_doing',
    label: 'Monitor rankings weekly',
    detail: 'Track how AI engines rank your brand over time',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
  },
  {
    checkId: 'kd-structured-data',
    actionType: 'keep_doing',
    label: 'Add structured data',
    detail: 'Help AI engines understand your business identity',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
  },
  {
    checkId: 'kd-tracking',
    actionType: 'keep_doing',
    label: 'Install AI bot tracking',
    detail: 'See which AI crawlers visit your site',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
  },
  {
    checkId: 'kd-competitors',
    actionType: 'keep_doing',
    label: 'Track your competitors',
    detail: 'Compare AI visibility scores side-by-side',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
  },
];

function buildSyncItems(
  report: DashboardReportData,
  monitoringConnected: boolean,
  trackingReady: boolean,
): SyncItemPayload[] {
  const items: SyncItemPayload[] = [];

  // Add all fixes from the score
  for (const fix of report.score.fixes) {
    items.push({
      checkId: fix.checkId,
      actionType: 'fix',
      scanStatus: 'fail', // fixes are always failing checks
      label: fix.label,
      detail: fix.detail,
      dimension: fix.dimension,
      category: fix.category,
      estimatedLift: fix.estimatedLift,
      effortBand: fix.effortBand,
      copyPrompt: fix.copyPrompt,
    });
  }

  // Add passing checks as completed items
  for (const dim of report.score.dimensions) {
    for (const check of dim.checks) {
      if (check.verdict === 'pass') {
        const alreadyInFixes = report.score.fixes.some(
          (f) => f.checkId === check.id,
        );
        if (!alreadyInFixes) {
          items.push({
            checkId: check.id,
            actionType: 'fix',
            scanStatus: 'pass',
            label: check.label,
            detail: check.detail,
            dimension: check.dimension,
            category: check.category,
            estimatedLift: 0,
            effortBand: null,
            copyPrompt: null,
          });
        }
      }
    }
  }

  // Add keep-doing items with contextual scan_status
  const hasStructuredDataFixes = report.score.fixes.some(
    (f) => f.dimension === 'structured-data' || f.dimension === 'entity-clarity',
  );

  for (const kd of KEEP_DOING_ITEMS) {
    let scanStatus: 'pass' | 'fail' | 'unknown' = 'unknown';
    if (kd.checkId === 'kd-monitoring') scanStatus = monitoringConnected ? 'pass' : 'fail';
    else if (kd.checkId === 'kd-tracking') scanStatus = trackingReady ? 'pass' : 'fail';
    else if (kd.checkId === 'kd-structured-data') scanStatus = hasStructuredDataFixes ? 'fail' : 'pass';

    items.push({ ...kd, scanStatus });
  }

  return items;
}

function filterItems(
  items: ActionChecklistItem[],
  statusFilter: ActionStatusFilter,
): ActionChecklistItem[] {
  if (statusFilter === 'todo') return items.filter((i) => !i.isComplete || i.isRegression);
  if (statusFilter === 'done') return items.filter((i) => i.isComplete && !i.isRegression);
  return items;
}

function groupByCategory(items: ActionChecklistItem[]): Map<string, ActionChecklistItem[]> {
  const groups = new Map<string, ActionChecklistItem[]>();
  for (const item of items) {
    const key = item.dimension ?? 'setup';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

function groupByEffort(items: ActionChecklistItem[]): Map<string, ActionChecklistItem[]> {
  const groups = new Map<string, ActionChecklistItem[]>();
  for (const band of ['quick', 'medium', 'technical']) {
    groups.set(band, []);
  }
  for (const item of items) {
    const key = item.effortBand ?? 'technical';
    groups.get(key)!.push(item);
  }
  return groups;
}

interface ActionsSectionProps {
  report: DashboardReportData;
  domain: string;
  monitoringConnected: boolean;
  trackingReady: boolean;
  onReaudit?: () => void;
  reauditing?: boolean;
}

export function ActionsSection({
  report,
  domain,
  monitoringConnected,
  trackingReady,
  onReaudit,
  reauditing,
}: ActionsSectionProps) {
  const [items, setItems] = useState<ActionChecklistItem[]>([]);
  const [summary, setSummary] = useState<ActionChecklistSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ActionViewMode>('priority');
  const [statusFilter, setStatusFilter] = useState<ActionStatusFilter>('all');
  const { refreshCount } = useActionChecklistCount();

  const syncData = useCallback(async () => {
    const syncItems = buildSyncItems(report, monitoringConnected, trackingReady);
    try {
      const res = await fetch('/api/action-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          domain,
          items: syncItems,
        }),
      });
      if (res.ok) {
        const data: SyncResponse = await res.json();
        setItems(data.items);
        setSummary(data.summary);
        refreshCount();
      }
    } catch {
      // fallback: show sync items without manual statuses
      setItems(
        syncItems.map((i) => ({
          ...i,
          manualStatus: 'pending' as const,
          isComplete: i.scanStatus === 'pass',
          isRegression: false,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [report, domain, monitoringConnected, trackingReady, refreshCount]);

  useEffect(() => {
    syncData();
  }, [syncData]);

  const handleToggle = async (checkId: string, newStatus: 'done' | 'pending') => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (item.checkId !== checkId) return item;
        const manualStatus = newStatus;
        const isRegression = manualStatus === 'done' && item.scanStatus === 'fail';
        const isComplete =
          item.scanStatus === 'pass' ||
          (manualStatus === 'done' && item.scanStatus !== 'fail');
        return { ...item, manualStatus, isComplete, isRegression };
      }),
    );

    try {
      const res = await fetch('/api/action-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          domain,
          checkId,
          manualStatus: newStatus,
        }),
      });
      if (res.ok) {
        const data: ToggleResponse = await res.json();
        setItems((prev) => {
          const updated = prev.map((item) =>
            item.checkId === data.checkId
              ? {
                  ...item,
                  manualStatus: data.manualStatus,
                  scanStatus: data.scanStatus,
                  isComplete: data.isComplete,
                  isRegression: data.isRegression,
                }
              : item,
          );
          // Recompute summary from the freshly updated array (avoids stale closure)
          const complete = updated.filter((i) => i.isComplete).length;
          setSummary((prev) =>
            prev
              ? {
                  ...prev,
                  complete,
                  remaining: prev.total - complete,
                }
              : null,
          );
          return updated;
        });
        refreshCount();
      }
    } catch {
      // Revert optimistic update
      syncData();
    }
  };

  // Filter + group
  const filtered = filterItems(items, statusFilter);

  const sortedByPriority = [...filtered].sort((a, b) => {
    // Incomplete first, then by estimatedLift desc
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
    return b.estimatedLift - a.estimatedLift;
  });

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="h-20 w-20 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  // All complete state
  if (summary && summary.remaining === 0 && items.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PartyPopper className="h-12 w-12 text-[#25c972] mb-4" />
        <h2 className="text-[18px] font-semibold text-white">All actions complete!</h2>
        <p className="mt-1 text-[13px] text-zinc-400">
          Your site is fully optimized based on the latest scan.
        </p>
        {onReaudit && (
          <button
            type="button"
            onClick={onReaudit}
            disabled={reauditing}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.12] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', reauditing && 'animate-spin')} />
            Re-scan to find new opportunities
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Hero */}
      {summary && (
        <div className="flex items-center gap-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <ProgressRing complete={summary.complete} total={summary.total} />
          <div>
            <p className="text-[16px] font-semibold text-white">
              {summary.complete} of {summary.total} actions complete
            </p>
            {summary.potentialLift > 0 && (
              <p className="mt-0.5 text-[12px] text-zinc-400">
                +{summary.potentialLift} pts possible
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View mode */}
        <div className="flex rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
          {([
            ['priority', 'By Priority'],
            ['category', 'By Category'],
            ['effort', 'By Effort'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                viewMode === mode
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
          {([
            ['all', 'All'],
            ['todo', 'To Do'],
            ['done', 'Done'],
          ] as const).map(([filter, label]) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                statusFilter === filter
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Action List */}
      {viewMode === 'priority' && (
        <div className="space-y-2">
          {sortedByPriority.map((item) => (
            <ActionCard key={item.checkId} item={item} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {viewMode === 'category' && (
        <div className="space-y-6">
          {Array.from(groupByCategory(filtered)).map(([key, groupItems]) => (
            <div key={key}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {DIMENSION_LABELS[key] ?? 'Setup'}
              </p>
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <ActionCard key={item.checkId} item={item} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'effort' && (
        <div className="space-y-6">
          {Array.from(groupByEffort(filtered)).map(([key, groupItems]) =>
            groupItems.length > 0 ? (
              <div key={key}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {EFFORT_LABELS[key] ?? key}
                </p>
                <div className="space-y-2">
                  {groupItems.map((item) => (
                    <ActionCard key={item.checkId} item={item} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-[13px] text-zinc-500">
          {statusFilter === 'done'
            ? 'No completed actions yet.'
            : statusFilter === 'todo'
              ? 'All actions are complete!'
              : 'No actions to display.'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/advanced/actions/actions-section.tsx
git commit -m "feat: add ActionsSection main UI with progress, filters, and grouped list"
```

---

### Task 10: Actions Page Shell

**Files:**
- Create: `src/app/actions/page.tsx`

- [ ] **Step 1: Write the page using WorkspaceShell**

```tsx
// src/app/actions/page.tsx
'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ActionsSection } from '@/app/advanced/actions/actions-section';

export default function ActionsPage() {
  return (
    <WorkspaceShell sectionKey="actions">
      {(ctx) => (
        <ActionsSection
          report={ctx.report}
          domain={ctx.domain}
          monitoringConnected={ctx.monitoringConnected}
          trackingReady={false} /* TODO: wire up from tracking panel state */
          onReaudit={ctx.handleReaudit}
          reauditing={ctx.reauditing}
        />
      )}
    </WorkspaceShell>
  );
}
```

Note: `trackingReady` is not currently on `WorkspaceContext` — it's computed inside `DashboardSection` via a local effect. For the initial implementation, pass `false` and wire it up properly in a follow-up (or add `trackingReady` to `WorkspaceContext` during implementation).

- [ ] **Step 2: Verify the page loads**

Run: `npm run dev`, navigate to `/actions`.
Expected: Page loads with WorkspaceShell chrome, shows loading skeleton then actions list.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/page.tsx
git commit -m "feat: add /actions page shell using WorkspaceShell"
```

---

### Task 11: End-to-End Verification

- [ ] **Step 1: Test full flow**

1. Navigate to `/actions` — should see progress ring + action cards from the latest scan
2. Click a checkbox — should toggle optimistically, badge in sidebar should update
3. Switch filter modes (By Priority / By Category / By Effort) — items re-group correctly
4. Switch status filter (All / To Do / Done) — items filter correctly
5. Copy prompt button works
6. Sidebar badge shows correct remaining count
7. Collapsed sidebar shows "Actions" tooltip on hover

- [ ] **Step 2: Test edge cases**

1. No scan data: empty state should show
2. All items complete: celebratory state with re-scan CTA
3. API failure on toggle: optimistic update should revert
4. Page works on mobile (sidebar overlay)

- [ ] **Step 3: Commit any fixes discovered**

---

### Task 12: Documentation

**Files:**
- Create: `docs/actions-tab.md`
- Modify: `docs/00-overview.md`

- [ ] **Step 1: Write feature documentation**

Document what the actions tab does, key files, API contracts, data flow, error handling, and configuration — following the project's documentation rule in CLAUDE.md.

- [ ] **Step 2: Update docs/00-overview.md**

Add a link to the new `actions-tab.md` in the index.

- [ ] **Step 3: Commit**

```bash
git add docs/actions-tab.md docs/00-overview.md
git commit -m "docs: add Actions tab feature documentation"
```
