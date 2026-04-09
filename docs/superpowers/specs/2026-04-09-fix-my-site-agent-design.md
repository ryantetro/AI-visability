# Fix My Site Agent — Design Spec

## Summary

Replace the manual human-delivered Fix My Site service ($499) with an autonomous Claude Agent that generates production-ready AI visibility files immediately after payment. The agent reads AISO scan data, inspects the live site via WebFetch, generates all requested files (robots.txt, llms.txt, structured data, sitemap, meta tags, schema markup), writes an implementation guide, and delivers everything as a downloadable ZIP — all within minutes of payment.

## Decisions

| Decision | Choice |
|----------|--------|
| Trigger | Auto-generate after Stripe payment via `after()` |
| Pricing | Keep $499, agent replaces human work (higher margins) |
| Deliverables | Generated file contents + implementation guide + downloadable ZIP |
| Web access | Agent uses scan data + WebFetch for live site inspection |
| Architecture | Full Agent SDK pipeline (same pattern as Content Studio) |
| Model | Claude Sonnet 4.6, $1.50 budget, 30 max turns |

## Architecture

```
Stripe webhook fires (payment complete)
        |
        v
  Existing webhook handler in src/app/api/webhooks/stripe/route.ts
  → handleCheckoutSessionCompleted() already creates order + sends emails
  → NEW: at the end of the fix_my_site branch inside handleCheckoutSessionCompleted(),
    call after(() => triggerFixMySiteAgent(orderId))
    This ensures the webhook responds 200 immediately, then the agent runs in the background.
    Requires adding: import { after } from 'next/server' to the webhook file.
        |
        v
  ┌──────────────────────────────────────────────────────────────┐
  │  Fix My Site Agent (via Agent SDK query())                    │
  │                                                               │
  │  Input: scan data + prioritized fixes + order details         │
  │                                                               │
  │  Built-in tools:                                              │
  │  ├─ WebFetch  — inspect live site (robots.txt, pages, schema) │
  │  ├─ WebSearch — look up best practices if needed              │
  │                                                               │
  │  Custom MCP tools (in-process via createSdkMcpServer):        │
  │  ├─ update_order_progress — update status + progress JSONB    │
  │  ├─ save_generated_file   — save one file to the order        │
  │  └─ complete_order        — mark order delivered, save guide  │
  │                                                               │
  │  Agent workflow:                                              │
  │  1. Read scan data + fixes from system prompt                 │
  │  2. WebFetch the live site to inspect current state            │
  │  3. Generate each requested file (robots.txt, llms.txt, etc.) │
  │  4. Call save_generated_file for each one                     │
  │  5. Write implementation guide markdown                       │
  │  6. Call complete_order with guide + all files                 │
  └──────────────────────────────────────────────────────────────┘
        |
        v
  Order status: "delivered"
  Generated files stored in order's JSONB column
  User sees results in dashboard panel
  ZIP download generated on-demand from stored files
```

## Data Model

### Database Migration

Add columns to the existing `fix_my_site_orders` table:

```sql
ALTER TABLE fix_my_site_orders
  ADD COLUMN generated_files  JSONB DEFAULT '{}',
  ADD COLUMN guide_markdown   TEXT,
  ADD COLUMN agent_progress   JSONB DEFAULT '{}',
  ADD COLUMN scan_id          TEXT REFERENCES scans(id);
```

No new tables required.

### `generated_files` JSONB Shape

```json
{
  "robots_txt": {
    "filename": "robots.txt",
    "content": "User-agent: *\nAllow: /\n...",
    "description": "AI-optimized robots.txt with explicit crawler permissions"
  },
  "llms_txt": {
    "filename": "llms.txt",
    "content": "# Company Name\n> ...",
    "description": "LLM-friendly site description"
  },
  "structured_data": {
    "filename": "organization-schema.json",
    "content": "{\"@context\":\"https://schema.org\",...}",
    "description": "Organization JSON-LD with complete fields"
  },
  "sitemap": {
    "filename": "sitemap.xml",
    "content": "<?xml version=\"1.0\"...",
    "description": "XML sitemap covering all important pages"
  },
  "meta_tags": {
    "filename": "meta-tags.html",
    "content": "<meta name=\"description\"...",
    "description": "Optimized meta tags for homepage and key pages"
  },
  "schema_markup": {
    "filename": "faq-schema.json",
    "content": "{\"@context\":\"https://schema.org\",...}",
    "description": "FAQ and additional schema markup"
  }
}
```

### `agent_progress` JSONB Shape

```json
{
  "step": 3,
  "totalSteps": 6,
  "progress": 45,
  "currentTask": "Generating structured data schema...",
  "filesCompleted": ["robots_txt", "llms_txt"],
  "error": null,
  "startedAt": "2026-04-09T12:00:00Z"
}
```

## New Files

| File | Purpose |
|------|---------|
| `src/lib/fix-my-site/pipeline.ts` | Agent SDK orchestrator — creates MCP server, runs agent via `query()` |
| `src/lib/fix-my-site/agent-tools.ts` | Custom MCP tools: `update_order_progress`, `save_generated_file`, `complete_order` |
| `src/lib/fix-my-site/agent-prompts.ts` | System prompt builder — assembles scan data, fixes, check context into agent instructions |
| `src/app/api/fix-my-site/[id]/download/route.ts` | GET endpoint — generates ZIP on-the-fly from `generated_files` JSONB |
| `src/app/api/fix-my-site/[id]/retry/route.ts` | POST endpoint — re-triggers the agent for a failed order |
| `supabase/migrations/XXX_fix_my_site_agent.sql` | Migration adding new columns |

## Modified Files

| File | Change |
|------|--------|
| `src/app/api/webhooks/stripe/route.ts` | Add `triggerFixMySiteAgent()` call in the fix_my_site webhook branch via `after()` |
| `src/lib/fix-my-site.ts` | Extend `FixMySiteOrder` interface with new fields (`generated_files`, `guide_markdown`, `agent_progress`, `scan_id`). Add helper functions for updating these columns. |
| `src/app/advanced/panels/fix-my-site-panel.tsx` | Enhance order cards with progress display, results viewer, file tabs, copy buttons, and ZIP download |
| `src/app/api/fix-my-site/[id]/route.ts` | Ensure the GET response includes the new columns |

## Agent Design

### System Prompt

Built by `buildFixMySiteAgentPrompt()` which imports and reuses:
- `prioritizeFixes()` from `src/lib/scorer/priority.ts` — ROI-ranked fix list
- `getCheckContext()` from `src/lib/llm-prompts.ts` — per-check technical context (1000+ lines of domain expertise)
- Scan dimension scores and overall score
- Order details (domain, files requested, user notes)

The prompt instructs the agent to:
1. Inspect the live site first (WebFetch robots.txt, homepage, sitemap, llms.txt)
2. For each requested file type, generate a complete production-ready file that merges with or replaces what exists
3. Save each file via `save_generated_file`
4. Write a comprehensive implementation guide
5. Call `complete_order` when done

### MCP Tools

**`update_order_progress`**
- Input: `{ step: 1-6, progress: 0-100, currentTask: string }`
- Updates `agent_progress` JSONB and sets order status to `in_progress`
- Step mapping: 1=inspect live site, 2=analyze gaps, 3=generate AI readiness files (robots.txt, llms.txt, sitemap), 4=generate structured data files (JSON-LD, schema, meta tags), 5=self-review all files, 6=write implementation guide
- `totalSteps` is always 6 regardless of how many files are requested — steps for unrequested files are skipped

**`save_generated_file`**
- Input: `{ fileType: string, filename: string, content: string, description: string }`
- Validates `fileType` against `files_requested` on the order
- Merges into `generated_files` JSONB
- Updates `agent_progress.filesCompleted`

**`complete_order`**
- Input: `{ guideMarkdown: string }`
- Saves `guide_markdown`
- Sets status to `delivered`
- Sets `completed_at` timestamp
- Sets `agent_progress.progress` to 100

### MCP Server Name

The in-process MCP server is named `fix-my-site`, which means custom tool names are namespaced as:
- `mcp__fix-my-site__update_order_progress`
- `mcp__fix-my-site__save_generated_file`
- `mcp__fix-my-site__complete_order`

### Model Configuration

| Setting | Value |
|---------|-------|
| Model | `claude-sonnet-4-6` |
| Max budget | `$1.50` |
| Max turns | `30` |
| `tools` | `['WebSearch', 'WebFetch', 'Read']` |
| `allowedTools` | `['WebSearch', 'WebFetch', 'Read', 'mcp__fix-my-site__update_order_progress', 'mcp__fix-my-site__save_generated_file', 'mcp__fix-my-site__complete_order']` |
| `permissionMode` | `'bypassPermissions'` |
| `allowDangerouslySkipPermissions` | `true` |
| `persistSession` | `false` |
| `settingSources` | `[]` |

## Frontend

### Order Card — Generating State

When `status === 'in_progress'` and `agent_progress` exists:
- Pulsing blue "Generating..." badge
- Progress bar showing `agent_progress.progress`%
- Current task text from `agent_progress.currentTask`
- File chips: green for completed files, gray for pending
- Polls every 3 seconds (stops on unmount and when tab is hidden via `document.hidden` check, matching Content Studio pattern)

### Order Card — Delivered State

When `status === 'delivered'`:
- Green "Delivered" badge
- "View Results" button — expands inline showing:
  - Implementation guide rendered as markdown
  - Tabbed file viewer (one tab per generated file)
  - Each tab shows: filename, description, syntax-highlighted content, "Copy" button
- "Download ZIP" button — hits `/api/fix-my-site/[id]/download`

### ZIP Download Route

`GET /api/fix-my-site/[id]/download`:
- Auth-gated (must own the order)
- Uses `jszip` to build ZIP in memory from `generated_files` JSONB
- Includes `IMPLEMENTATION-GUIDE.md` in the ZIP root (if `guide_markdown` is null, includes a placeholder note: "Guide was not generated — the agent may have been interrupted. Try re-running.")
- Returns `Content-Disposition: attachment; filename="fix-my-site-{domain}.zip"`
- No file storage needed

### New Dependency

`jszip` (MIT license, ~45kb gzipped)

## Error Handling

### Agent Failure
- Catch errors, revert order status to `ordered`
- Store error message in `agent_progress.error`
- Frontend shows error state with "Retry" button
- Retry hits `POST /api/fix-my-site/[id]/retry`

### Stalled Agent Detection
- If an order has been `in_progress` for more than 10 minutes with no `agent_progress` update, it is considered stalled
- The retry endpoint allows re-triggering stalled orders (checks `updated_at` timestamp)
- The frontend shows a "This is taking longer than expected" message after 5 minutes, and a "Retry" button after 10 minutes
- No cron needed — staleness is detected on-demand when the user views the order or hits retry

### No Scan Data
- Webhook trigger checks for recent completed scan
- If none exists, order stays `ordered` with `agent_progress.error = "no_scan"`
- Frontend shows: "Run a scan first, then click Retry"

### Partial File Generation
- Files saved before failure persist in `generated_files`
- On retry, system prompt includes which files are done so agent picks up where it left off
- Status stays `in_progress` until `complete_order` is called

### Stale Scan Data
- Agent uses most recent completed scan for the domain
- `scan_id` recorded on the order
- If scan is older than 30 days, warning note in the implementation guide

### WebFetch Failures
- Agent falls back to generating from scan data only
- Guide includes note: "Couldn't inspect live site — verify files don't conflict with existing setup"

### Duplicate Orders
- No prevention — users can order multiple times (intentional for re-generation after changes)

## API Contracts

### POST /api/fix-my-site/[id]/retry

Auth required. Re-triggers the agent for a failed or stalled order.

**Response:** `{ ok: true, status: 'in_progress' }`

**Errors:**
- 401: Not authenticated
- 404: Order not found or not owned by user
- 409: Order already generating or delivered

### GET /api/fix-my-site/[id]/download

Auth required. Returns a ZIP file of all generated files + guide.

**Response:** Binary ZIP file with `Content-Type: application/zip`

**Errors:**
- 401: Not authenticated
- 404: Order not found or not owned by user
- 400: No generated files (order not delivered yet)
