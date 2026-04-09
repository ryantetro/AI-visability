# Fix My Site Agent

## What It Does

Replaces the manual Fix My Site $499 service with an autonomous Claude Agent that generates production-ready AI visibility files immediately after Stripe payment. The agent reads AISO scan data, inspects the live site via WebFetch, generates all requested files (robots.txt, llms.txt, structured data, sitemap, meta tags, schema markup), writes an implementation guide, and delivers everything as a downloadable ZIP — all within minutes of payment.

## Key Files

| File | Role |
|------|------|
| `src/lib/fix-my-site.ts` | Types (`FixMySiteOrder`, `GeneratedFile`, `AgentProgress`) and DB helpers (`updateOrderProgress`, `saveGeneratedFile`, `completeOrder`, `setScanId`) |
| `src/lib/fix-my-site/agent-tools.ts` | Custom MCP tools: `update_order_progress`, `save_generated_file`, `complete_order` |
| `src/lib/fix-my-site/agent-prompts.ts` | System prompt builder — assembles scan data, fixes, check context into agent instructions |
| `src/lib/fix-my-site/pipeline.ts` | Agent SDK orchestrator — `triggerFixMySiteAgent()` runs the autonomous agent via `query()` |
| `src/app/api/fix-my-site/[id]/download/route.ts` | GET endpoint — generates ZIP on-the-fly from `generated_files` JSONB |
| `src/app/api/fix-my-site/[id]/retry/route.ts` | POST endpoint — re-triggers the agent for a failed or stalled order |
| `src/app/api/webhooks/stripe/route.ts` | Webhook handler — triggers agent via `after()` on fix_my_site payment |
| `src/app/advanced/panels/fix-my-site-panel.tsx` | Frontend panel — progress display, results viewer, file tabs, ZIP download |
| `supabase/migrations/030_fix_my_site_agent.sql` | Migration adding `generated_files`, `guide_markdown`, `agent_progress`, `scan_id` columns |

## How It Works

### Architecture

```
Stripe webhook fires (payment complete)
        |
        v
  handleCheckoutSessionCompleted() in webhook handler
  → existing order processing + email sends
  → NEW: after(() => triggerFixMySiteAgent(orderId))
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
  │  3. Generate each requested file                              │
  │  4. Call save_generated_file for each one                     │
  │  5. Self-review all generated files                           │
  │  6. Write implementation guide + call complete_order          │
  └──────────────────────────────────────────────────────────────┘
        |
        v
  Order status: "delivered"
  Generated files stored in order's JSONB column
  User sees results in dashboard panel
  ZIP download generated on-demand from stored files
```

### Agent Model

| Setting | Value |
|---------|-------|
| Model | `claude-sonnet-4-6` |
| Max budget | `$1.50` |
| Max turns | `30` |
| Tools | `WebSearch`, `WebFetch`, `Read` + 3 custom MCP tools |
| Permission mode | `bypassPermissions` |

### Custom MCP Tools

**`update_order_progress`** — Updates the `agent_progress` JSONB column so the frontend can show real-time progress.
- Input: `{ step: 1-6, progress: 0-100, currentTask: string }`
- Steps: 1=inspect site, 2=analyze gaps, 3=AI readiness files, 4=structured data, 5=self-review, 6=write guide

**`save_generated_file`** — Saves one generated file to the order.
- Input: `{ fileType: string, filename: string, content: string, description: string }`
- Validates fileType against `files_requested` on the order

**`complete_order`** — Marks the order as delivered and saves the implementation guide.
- Input: `{ guideMarkdown: string }`
- Sets status to `delivered`, progress to 100%

### Data Model

New columns on `fix_my_site_orders`:
- `generated_files` (JSONB) — keyed by file type, each with filename/content/description
- `guide_markdown` (TEXT) — implementation guide
- `agent_progress` (JSONB) — step, progress, currentTask, filesCompleted, error
- `scan_id` (TEXT) — references the scan used for generation

## API Contracts

### POST /api/fix-my-site/[id]/retry

Auth required. Re-triggers the agent for a failed or stalled order.

**Response:** `{ ok: true, status: 'in_progress' }`

**Errors:**
- 401: Not authenticated
- 404: Order not found or not owned by user
- 409: Order already delivered or still generating (<10 min since last update)

### GET /api/fix-my-site/[id]/download

Auth required. Returns a ZIP file of all generated files + implementation guide.

**Response:** Binary ZIP file with `Content-Type: application/zip`

**Errors:**
- 401: Not authenticated
- 404: Order not found or not owned by user
- 400: No generated files (order not delivered yet)

## Error Handling

- **Agent failure**: Catches errors, reverts order status to `ordered`, stores error in `agent_progress.error`
- **No scan data**: If no recent scan exists, agent doesn't run; error stored as `no_scan`
- **Stalled agent**: Frontend detects >5min with warning, >10min shows retry button
- **Partial generation**: Files saved before failure persist; retry picks up where it left off
- **Stale scan**: Scans >30 days old trigger a warning in the implementation guide

## Configuration

| Env Var | Required | Purpose |
|---------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Agent SDK access |
| `STRIPE_SECRET_KEY` | Yes | Payment processing |

## Dependencies

- `jszip` (MIT) — ZIP generation from JSONB data
- `@anthropic-ai/claude-agent-sdk` — Agent SDK for autonomous execution
