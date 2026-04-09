# Fix My Site Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual Fix My Site $499 service with an autonomous Claude Agent that generates production-ready AI visibility files immediately after Stripe payment.

**Architecture:** Agent SDK pipeline (same pattern as Content Studio) — Stripe webhook triggers a background agent via `after()`. The agent reads scan data, inspects the live site via WebFetch, generates files, and saves them to the order's JSONB columns. Frontend shows real-time progress and delivers results as inline viewer + downloadable ZIP.

**Tech Stack:** Next.js App Router, Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), Supabase (Postgres), Stripe webhooks, JSZip

**Spec:** `docs/superpowers/specs/2026-04-09-fix-my-site-agent-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/030_fix_my_site_agent.sql` | Migration: add `generated_files`, `guide_markdown`, `agent_progress`, `scan_id` columns |
| `src/lib/fix-my-site/agent-tools.ts` | 3 custom MCP tools: `update_order_progress`, `save_generated_file`, `complete_order` |
| `src/lib/fix-my-site/agent-prompts.ts` | System prompt builder — assembles scan data, fixes, check context |
| `src/lib/fix-my-site/pipeline.ts` | Agent SDK orchestrator — `triggerFixMySiteAgent()` |
| `src/app/api/fix-my-site/[id]/download/route.ts` | GET — ZIP generation from JSONB data |
| `src/app/api/fix-my-site/[id]/retry/route.ts` | POST — re-trigger agent for failed orders |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/fix-my-site.ts` | Extend `FixMySiteOrder` interface + add DB update helpers |
| `src/app/api/webhooks/stripe/route.ts` | Add `after()` call to trigger agent after fix_my_site payment |
| `src/app/api/fix-my-site/[id]/route.ts` | Include new columns in GET response |
| `src/app/advanced/panels/fix-my-site-panel.tsx` | Progress display, results viewer, file tabs, ZIP download |
| `package.json` | Add `jszip` dependency |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/030_fix_my_site_agent.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 030_fix_my_site_agent.sql
-- Add columns for agent-generated Fix My Site deliverables

ALTER TABLE fix_my_site_orders
  ADD COLUMN IF NOT EXISTS generated_files  JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guide_markdown   TEXT,
  ADD COLUMN IF NOT EXISTS agent_progress   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scan_id          TEXT REFERENCES scans(id);
```

- [ ] **Step 2: Run the migration locally**

Run: `npx supabase db push` or apply via Supabase dashboard.
Expected: Migration applies cleanly with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/030_fix_my_site_agent.sql
git commit -m "feat(db): add agent columns to fix_my_site_orders"
```

---

## Task 2: Extend FixMySiteOrder Types + DB Helpers

**Files:**
- Modify: `src/lib/fix-my-site.ts`

- [ ] **Step 1: Extend the `FixMySiteOrder` interface**

Add these fields after the existing `completed_at` field:

```typescript
  generated_files: Record<string, GeneratedFile> | null;
  guide_markdown: string | null;
  agent_progress: AgentProgress | null;
  scan_id: string | null;
```

Add these new interfaces above `FixMySiteOrder`:

```typescript
export interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
}

export interface AgentProgress {
  step: number;
  totalSteps: number;
  progress: number;
  currentTask: string;
  filesCompleted: string[];
  error: string | null;
  startedAt: string | null;
}
```

- [ ] **Step 2: Add DB helper — `updateOrderProgress`**

Add after the existing `setStripeIds` function:

```typescript
export async function updateOrderProgress(
  orderId: string,
  progress: Partial<AgentProgress>,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: current } = await supabase
    .from('fix_my_site_orders')
    .select('agent_progress, status')
    .eq('id', orderId)
    .single();

  const existing = (current?.agent_progress ?? {}) as AgentProgress;
  const merged = { ...existing, ...progress };

  const updates: Record<string, unknown> = {
    agent_progress: merged,
    updated_at: new Date().toISOString(),
  };

  // Set status to in_progress if not already
  if (current?.status === 'ordered') {
    updates.status = 'in_progress';
  }

  const { error } = await supabase
    .from('fix_my_site_orders')
    .update(updates)
    .eq('id', orderId);

  if (error) {
    console.error(`[fix-my-site] Failed to update progress for ${orderId}:`, error.message);
  }
}
```

- [ ] **Step 3: Add DB helper — `saveGeneratedFile`**

```typescript
export async function saveGeneratedFile(
  orderId: string,
  fileType: string,
  file: GeneratedFile,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: current } = await supabase
    .from('fix_my_site_orders')
    .select('generated_files, agent_progress')
    .eq('id', orderId)
    .single();

  const files = (current?.generated_files ?? {}) as Record<string, GeneratedFile>;
  files[fileType] = file;

  const progress = (current?.agent_progress ?? {}) as AgentProgress;
  const completed = progress.filesCompleted ?? [];
  if (!completed.includes(fileType)) {
    completed.push(fileType);
  }
  progress.filesCompleted = completed;

  const { error } = await supabase
    .from('fix_my_site_orders')
    .update({
      generated_files: files,
      agent_progress: progress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error(`[fix-my-site] Failed to save file ${fileType} for ${orderId}:`, error.message);
  }
}
```

- [ ] **Step 4: Add DB helper — `completeOrder`**

```typescript
export async function completeOrder(
  orderId: string,
  guideMarkdown: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from('fix_my_site_orders')
    .select('agent_progress')
    .eq('id', orderId)
    .single();

  const progress = (current?.agent_progress ?? {}) as AgentProgress;
  progress.progress = 100;
  progress.currentTask = 'Complete';

  const { error } = await supabase
    .from('fix_my_site_orders')
    .update({
      status: 'delivered',
      guide_markdown: guideMarkdown,
      agent_progress: progress,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', orderId);

  if (error) {
    throw new Error(`Failed to complete order ${orderId}: ${error.message}`);
  }
}
```

- [ ] **Step 5: Add DB helper — `setScanId`**

```typescript
export async function setScanId(orderId: string, scanId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('fix_my_site_orders')
    .update({ scan_id: scanId, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) {
    console.error(`[fix-my-site] Failed to set scan_id for ${orderId}:`, error.message);
  }
}
```

- [ ] **Step 6: Verify the module compiles**

Run: `npx tsc --noEmit src/lib/fix-my-site.ts` (or just run `npm run build` if quicker)
Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/fix-my-site.ts
git commit -m "feat(fix-my-site): extend types and add DB helpers for agent pipeline"
```

---

## Task 3: Custom MCP Tools

**Files:**
- Create: `src/lib/fix-my-site/agent-tools.ts`

Reference pattern: `src/lib/content-studio/agent-tools.ts`

- [ ] **Step 1: Create the agent-tools file**

```typescript
/**
 * Custom MCP tools for the Fix My Site agent.
 *
 * Run in-process via createSdkMcpServer() so the agent can update
 * order progress, save generated files, and complete the order.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod/v4';
import {
  updateOrderProgress,
  saveGeneratedFile,
  completeOrder as dbCompleteOrder,
  VALID_FILES_REQUESTED,
} from '@/lib/fix-my-site';

/* ── update_order_progress tool ─────────────────────────────────── */

export function createUpdateOrderProgressTool(orderId: string) {
  return tool(
    'update_order_progress',
    'Update the order progress shown to the user. Call this at each major phase: inspecting site, analyzing gaps, generating files, writing guide.',
    {
      step: z.number().min(1).max(6).describe(
        'Current step (1=inspect site, 2=analyze gaps, 3=generate AI readiness files, 4=generate structured data files, 5=self-review, 6=write guide)',
      ),
      progress: z.number().min(0).max(100).describe('Overall progress percentage (0-100)'),
      currentTask: z.string().describe('Human-readable description of what you are doing right now'),
    },
    async (args) => {
      await updateOrderProgress(orderId, {
        step: args.step,
        totalSteps: 6,
        progress: args.progress,
        currentTask: args.currentTask,
      });

      return {
        content: [{ type: 'text' as const, text: `Progress updated: step ${args.step}/6, ${args.progress}% — ${args.currentTask}` }],
      };
    },
  );
}

/* ── save_generated_file tool ───────────────────────────────────── */

export function createSaveGeneratedFileTool(orderId: string, filesRequested: string[]) {
  const validSet = new Set(filesRequested);

  return tool(
    'save_generated_file',
    'Save a generated file to the order. Call this once per file type after generating each file. The fileType must be one of the files requested in the order.',
    {
      fileType: z.string().describe(`File type key: ${VALID_FILES_REQUESTED.join(', ')}`),
      filename: z.string().describe('The filename for download (e.g., "robots.txt", "organization-schema.json")'),
      content: z.string().describe('The complete file content'),
      description: z.string().describe('One-line description of what this file does'),
    },
    async (args) => {
      if (!validSet.has(args.fileType)) {
        return {
          content: [{ type: 'text' as const, text: `Error: "${args.fileType}" was not requested. Valid types: ${filesRequested.join(', ')}` }],
        };
      }

      await saveGeneratedFile(orderId, args.fileType, {
        filename: args.filename,
        content: args.content,
        description: args.description,
      });

      return {
        content: [{ type: 'text' as const, text: `File saved: ${args.filename} (${args.content.length} chars)` }],
      };
    },
  );
}

/* ── complete_order tool ────────────────────────────────────────── */

export function createCompleteOrderTool(orderId: string) {
  return tool(
    'complete_order',
    'Mark the order as delivered and save the implementation guide. Call this ONCE after all files have been saved and the guide is written. This is the final step.',
    {
      guideMarkdown: z.string().describe('Complete implementation guide in markdown format'),
    },
    async (args) => {
      await dbCompleteOrder(orderId, args.guideMarkdown);

      return {
        content: [{ type: 'text' as const, text: `Order completed and marked as delivered. Guide: ${args.guideMarkdown.length} chars.` }],
      };
    },
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fix-my-site/agent-tools.ts
git commit -m "feat(fix-my-site): add custom MCP tools for agent pipeline"
```

---

## Task 4: Agent System Prompt Builder

**Files:**
- Create: `src/lib/fix-my-site/agent-prompts.ts`

Reference: `src/lib/content-studio/agent-prompts.ts` for structure, `src/lib/llm-prompts.ts` for fix context.

- [ ] **Step 1: Create the agent-prompts file**

This file builds the system prompt by assembling:
- Scan dimension scores and overall score from `ScoreResult`
- Prioritized fixes filtered to the requested file types from `priority.ts`
- Per-check technical context from `getCheckContext()` in `llm-prompts.ts` (the `getCheckContext` function is not exported — it's a local function. Instead, embed the relevant check context data directly in the prompt by reusing the fix instructions and technical detail already available on the `PrioritizedFix` objects.)
- Order details (domain, files requested, user notes)

The prompt instructs the agent to:
1. Inspect the live site (WebFetch robots.txt, homepage, sitemap, llms.txt)
2. Generate each requested file, tailored to what exists
3. Save each file via `save_generated_file`
4. Write an implementation guide
5. Call `complete_order`

Key function: `export function buildFixMySiteAgentPrompt(order, scanResult, fixes)` that returns a string.

The prompt should be ~200-400 lines, following the same detailed structure as `buildBriefAgentPrompt` in Content Studio. It must include:
- The domain and user notes
- Score summary (overall, per-dimension percentages)
- The full list of failing checks with their fix instructions, expected values, and effort bands
- Step-by-step workflow instructions with tool call guidance
- File-specific generation instructions (what a good robots.txt/llms.txt/schema/sitemap/meta-tags/schema-markup looks like)
- Markdown formatting standards for the implementation guide

Also add a helper `mapFixesToFileTypes(fixes, filesRequested)` that maps `PrioritizedFix[]` to the relevant file types based on check IDs (e.g., `fp-robots-txt` -> `robots_txt`, `sd-org-schema` -> `structured_data`, etc.).

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fix-my-site/agent-prompts.ts
git commit -m "feat(fix-my-site): add agent system prompt builder"
```

---

## Task 5: Agent Pipeline Orchestrator

**Files:**
- Create: `src/lib/fix-my-site/pipeline.ts`

Reference pattern: `src/lib/content-studio/pipeline.ts`

- [ ] **Step 1: Create the pipeline file**

```typescript
/**
 * Fix My Site Agent Pipeline
 *
 * Uses the Claude Agent SDK to run an autonomous agent that inspects
 * a site, generates AI visibility files, and delivers them to the user.
 */

import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { getDatabase } from '@/lib/services/registry';
import type { ScoreResult } from '@/types/score';
import {
  getOrderById,
  updateOrderProgress,
  updateOrderStatus,
  setScanId,
} from '@/lib/fix-my-site';
import type { AgentProgress } from '@/lib/fix-my-site';
import {
  createUpdateOrderProgressTool,
  createSaveGeneratedFileTool,
  createCompleteOrderTool,
} from './agent-tools';
import { buildFixMySiteAgentPrompt } from './agent-prompts';

const STALE_SCAN_DAYS = 30;

export async function triggerFixMySiteAgent(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) {
    console.error(`[fix-my-site] Order ${orderId} not found`);
    return;
  }

  // Find the latest scan for this domain
  const db = getDatabase();
  const scan = await db.findLatestScanByDomain(order.domain);

  if (!scan?.crawlData || !scan.scoreResult) {
    // No scan data — mark as needing scan
    await updateOrderProgress(orderId, {
      step: 0,
      totalSteps: 6,
      progress: 0,
      currentTask: 'Waiting for scan data',
      filesCompleted: [],
      error: 'no_scan',
      startedAt: new Date().toISOString(),
    });
    return;
  }

  // Link scan to order
  await setScanId(orderId, scan.id);

  // Use the stored score result (already scored during the scan)
  const scoreResult = scan.scoreResult as ScoreResult;
  const fixes = scoreResult.fixes;

  // Check scan staleness
  const scanAge = Date.now() - (scan.completedAt ?? scan.createdAt);
  const isStaleScan = scanAge > STALE_SCAN_DAYS * 24 * 60 * 60 * 1000;

  // Initialize progress
  await updateOrderProgress(orderId, {
    step: 0,
    totalSteps: 6,
    progress: 0,
    currentTask: 'Starting agent...',
    filesCompleted: [],
    error: null,
    startedAt: new Date().toISOString(),
  });

  // Create in-process MCP server with custom tools
  const mcpServer = createSdkMcpServer({
    name: 'fix-my-site',
    tools: [
      createUpdateOrderProgressTool(orderId),
      createSaveGeneratedFileTool(orderId, order.files_requested),
      createCompleteOrderTool(orderId),
    ],
  });

  try {
    const systemPrompt = buildFixMySiteAgentPrompt({
      domain: order.domain,
      filesRequested: order.files_requested,
      notes: order.notes,
      scoreResult,
      fixes,
      isStaleScan,
      alreadyCompleted: ((order.agent_progress as AgentProgress | null)?.filesCompleted) ?? [],
    });

    let result: SDKResultMessage | null = null;

    for await (const message of query({
      prompt: `Generate production-ready AI visibility files for ${order.domain}. Inspect the live site, then generate and save each requested file.`,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-6',
        tools: ['WebSearch', 'WebFetch', 'Read'],
        allowedTools: [
          'WebSearch', 'WebFetch', 'Read',
          'mcp__fix-my-site__update_order_progress',
          'mcp__fix-my-site__save_generated_file',
          'mcp__fix-my-site__complete_order',
        ],
        mcpServers: { 'fix-my-site': mcpServer },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 30,
        maxBudgetUsd: 1.50,
        persistSession: false,
        settingSources: [],
      },
    })) {
      if (message.type === 'result') {
        result = message as SDKResultMessage;
      }
    }

    if (result) {
      const cost = 'total_cost_usd' in result ? (result as unknown as { total_cost_usd: number }).total_cost_usd : 0;
      const isError = result.is_error;
      console.log(`[fix-my-site] Agent complete for order ${orderId}. Cost: $${cost.toFixed(3)}, error: ${isError}`);

      if (isError) {
        const errors = 'errors' in result ? (result as unknown as { errors?: string[] }).errors : [];
        throw new Error(`Agent ended with error: ${errors?.join('; ') || 'unknown'}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[fix-my-site] Agent failed for order ${orderId}:`, message);

    // Revert status so user can retry
    await updateOrderProgress(orderId, { error: message });
    await updateOrderStatus(orderId, 'ordered');
  }
}
```

Note: `updateOrderStatus` already exists in `fix-my-site.ts`. The scan stores `scoreResult` as `unknown` — we cast it to `ScoreResult` from `@/types/score` to access `.fixes` directly. No re-scoring is needed since the score was already computed during the scan. `ScanJob.createdAt` and `.completedAt` are already epoch milliseconds (numbers), so no `new Date()` wrapping is needed for the staleness check. On retry, `alreadyCompleted` is populated from the existing `agent_progress.filesCompleted` so the agent picks up where it left off.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors. May need to adjust imports based on actual type shapes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fix-my-site/pipeline.ts
git commit -m "feat(fix-my-site): add agent pipeline orchestrator"
```

---

## Task 6: Wire Webhook Trigger

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add import for `after` and the pipeline**

At the top of the file, add:

```typescript
import { after } from 'next/server';
import { triggerFixMySiteAgent } from '@/lib/fix-my-site/pipeline';
```

- [ ] **Step 2: Add `after()` call in the fix_my_site branch**

Inside `handleCheckoutSessionCompleted`, find the block:

```typescript
if (session.metadata?.type === 'fix_my_site') {
```

Inside the existing `if (orderId)` block, after the customer email send try/catch and just before the block's closing `}`, add:

```typescript
      // Trigger the agent to generate files in the background
      if (orderId) {
        after(() => triggerFixMySiteAgent(orderId));
      }
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(fix-my-site): trigger agent after payment via webhook"
```

---

## Task 7: Retry API Route

**Files:**
- Create: `src/app/api/fix-my-site/[id]/retry/route.ts`

- [ ] **Step 1: Create the retry route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getOrderById } from '@/lib/fix-my-site';
import { triggerFixMySiteAgent } from '@/lib/fix-my-site/pipeline';

const STALE_MINUTES = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'delivered') {
    return NextResponse.json({ error: 'Order already delivered' }, { status: 409 });
  }

  // Allow retry if status is 'ordered' (failed) or stalled 'in_progress'
  if (order.status === 'in_progress') {
    const updatedAt = order.updated_at ? new Date(order.updated_at).getTime() : 0;
    const minutesSinceUpdate = (Date.now() - updatedAt) / (1000 * 60);
    if (minutesSinceUpdate < STALE_MINUTES) {
      return NextResponse.json({ error: 'Order is still generating' }, { status: 409 });
    }
  }

  after(() => triggerFixMySiteAgent(id));

  return NextResponse.json({ ok: true, status: 'in_progress' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/fix-my-site/[id]/retry/route.ts
git commit -m "feat(fix-my-site): add retry API route for failed orders"
```

---

## Task 8: ZIP Download Route

**Files:**
- Create: `src/app/api/fix-my-site/[id]/download/route.ts`

- [ ] **Step 1: Install jszip**

Run: `npm install jszip`

- [ ] **Step 2: Create the download route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getOrderById } from '@/lib/fix-my-site';
import type { GeneratedFile } from '@/lib/fix-my-site';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const files = (order.generated_files ?? {}) as Record<string, GeneratedFile>;
  if (Object.keys(files).length === 0) {
    return NextResponse.json({ error: 'No generated files yet' }, { status: 400 });
  }

  const zip = new JSZip();

  // Add each generated file
  for (const [, file] of Object.entries(files)) {
    zip.file(file.filename, file.content);
  }

  // Add implementation guide
  const guide = order.guide_markdown
    ?? '# Implementation Guide\n\nGuide was not generated — the agent may have been interrupted. Try re-running from your dashboard.';
  zip.file('IMPLEMENTATION-GUIDE.md', guide);

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const safeDomain = order.domain.replace(/[^a-zA-Z0-9.-]/g, '_');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="fix-my-site-${safeDomain}.zip"`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fix-my-site/[id]/download/route.ts package.json package-lock.json
git commit -m "feat(fix-my-site): add ZIP download route with jszip"
```

---

## Task 9: Update GET /api/fix-my-site/[id] Response

**Files:**
- Modify: `src/app/api/fix-my-site/[id]/route.ts`

- [ ] **Step 1: Verify the existing route returns `select('*')`**

Read `src/app/api/fix-my-site/[id]/route.ts`. The existing `getOrderById()` already does `select('*')`, so the new columns are automatically included in the response. If the response explicitly selects columns, add the new ones.

- [ ] **Step 2: If no changes needed, skip to next task. If changes needed, update and commit.**

---

## Task 10: Enhanced Frontend — Fix My Site Panel

**Files:**
- Modify: `src/app/advanced/panels/fix-my-site-panel.tsx`

This is the largest frontend change. The panel currently shows a simple order form + order history cards with status badges. We need to add:

1. **Generating state** — progress bar, current task, file chips
2. **Delivered state** — expandable results viewer with guide + file tabs
3. **Error/retry state** — error message + retry button
4. **Download button** — triggers ZIP download

- [ ] **Step 1: Add new state and types**

At the top of the component, add imports and extend the `FixMySiteOrder` interface:

```typescript
import { ChevronDown, Copy, Download, FileText, RefreshCw } from 'lucide-react';
```

Update the `FixMySiteOrder` interface in the file to include the new fields:

```typescript
interface FixMySiteOrder {
  id: string;
  domain: string;
  status: 'ordered' | 'in_progress' | 'delivered' | 'refunded';
  notes: string | null;
  files_requested: string[];
  amount_cents: number;
  created_at: string;
  completed_at: string | null;
  generated_files: Record<string, { filename: string; content: string; description: string }> | null;
  guide_markdown: string | null;
  agent_progress: {
    step: number;
    totalSteps: number;
    progress: number;
    currentTask: string;
    filesCompleted: string[];
    error: string | null;
    startedAt: string | null;
  } | null;
}
```

- [ ] **Step 2: Add polling for in-progress orders**

Add a `useEffect` that polls every 3 seconds when any order is `in_progress`:

```typescript
const hasGenerating = orders.some(o => o.status === 'in_progress');

useEffect(() => {
  if (!hasGenerating) return;

  const interval = setInterval(() => {
    if (!document.hidden) void loadOrders();
  }, 3000);

  return () => clearInterval(interval);
}, [hasGenerating, loadOrders]);
```

- [ ] **Step 3: Add retry handler**

```typescript
const handleRetry = async (orderId: string) => {
  try {
    const res = await fetch(`/api/fix-my-site/${orderId}/retry`, { method: 'POST' });
    if (res.ok) void loadOrders();
  } catch { /* ignore */ }
};
```

- [ ] **Step 4: Add copy and download handlers**

```typescript
const [copiedFile, setCopiedFile] = useState<string | null>(null);

const handleCopyFile = async (content: string, fileType: string) => {
  await navigator.clipboard.writeText(content);
  setCopiedFile(fileType);
  setTimeout(() => setCopiedFile(null), 2000);
};

const handleDownload = (orderId: string) => {
  window.open(`/api/fix-my-site/${orderId}/download`, '_blank');
};
```

- [ ] **Step 5: Add expandable results state**

```typescript
const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
const [activeFileTab, setActiveFileTab] = useState<string | null>(null);
```

- [ ] **Step 6: Update the order card rendering**

Replace the existing order card `<div>` with an enhanced version that handles all states:

For `in_progress` — show progress bar, current task text, file completion chips.
For `delivered` — show "View Results" / "Download ZIP" buttons. When expanded, show the guide markdown and tabbed file viewer.
For `ordered` with `agent_progress.error` — show error message and "Retry" button.
For stalled `in_progress` (>5 min since `startedAt`) — show "Taking longer than expected..." warning, and a "Retry" button after 10 min.

The exact JSX is substantial (~200 lines). Follow the existing component's styling patterns (DashboardPanel, SectionTitle, cn utility, zinc/green color scheme). Use the existing `STATUS_STYLES` and `STATUS_LABELS` maps, extending them to handle the new visual states.

Key UI elements:
- Progress bar: `<div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} /></div>`
- File chips: use the existing `FILE_LABELS` map, green bg for completed, gray for pending
- Markdown rendering for guide: use a simple approach — `dangerouslySetInnerHTML` with a markdown-to-HTML converter, or just render as a `<pre>` with `whitespace-pre-wrap` for now (can enhance later)
- File content: `<pre>` block with copy button

- [ ] **Step 7: Verify the component compiles and renders**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/advanced/panels/fix-my-site-panel.tsx
git commit -m "feat(fix-my-site): enhanced panel with progress, results viewer, and ZIP download"
```

---

## Task 11: Integration Test — End-to-End Verification

- [ ] **Step 1: Verify the build passes**

Run: `npm run build`
Expected: Clean build, no type errors.

- [ ] **Step 2: Manual verification checklist**

Test each component in isolation:
- [ ] Migration: columns exist on `fix_my_site_orders` table
- [ ] DB helpers: `updateOrderProgress`, `saveGeneratedFile`, `completeOrder` work (can test via a scratch API route or console)
- [ ] Agent tools: MCP tools are properly constructed (verify imports resolve)
- [ ] Pipeline: `triggerFixMySiteAgent` can be called with a valid order ID
- [ ] Webhook: the `after()` call is in the right place in `handleCheckoutSessionCompleted`
- [ ] Retry route: returns 409 for delivered orders, 200 for retriable orders
- [ ] Download route: generates valid ZIP from sample data
- [ ] Frontend: order cards show correct state for each status

- [ ] **Step 3: Final commit with docs**

Update `docs/00-overview.md` to note the agent enhancement in the Fix My Site entry.

```bash
git add docs/00-overview.md
git commit -m "docs: update overview with Fix My Site agent enhancement"
```
