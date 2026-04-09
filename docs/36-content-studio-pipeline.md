# Content Studio AI Pipeline — Agent SDK Edition

## What It Does

Uses the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) to run an autonomous agent that researches, outlines, and writes content briefs and articles. The agent has access to WebSearch and WebFetch for real-time web research, plus custom MCP tools for updating progress and saving content to the database.

Unlike the previous fixed 4-phase pipeline, the agent autonomously decides how much research is needed, can iterate when results are thin, and self-reviews its output before saving.

## Key Files

| File | Role |
|------|------|
| `src/lib/content-studio/types.ts` | TypeScript interfaces for pipeline state, phase results, workflow progress |
| `src/lib/content-studio/db.ts` | Sequential persistence chain for atomic workflow_progress updates |
| `src/lib/content-studio/pipeline.ts` | Agent SDK orchestrator — creates MCP server, runs agent via `query()` |
| `src/lib/content-studio/agent-tools.ts` | Custom MCP tools: `update_progress`, `save_content` |
| `src/lib/content-studio/agent-prompts.ts` | System prompts for brief and article agents, plus audience enhance prompt |
| `src/lib/content-studio/ai-client.ts` | Shared AI call helpers — used only by audience-enhance now |
| `src/lib/content-studio/audience-enhance.ts` | AI-powered audience profile generation (still uses Haiku directly) |
| `src/app/api/content-studio/[id]/generate/route.ts` | POST endpoint — schedules brief pipeline via `after()` |
| `src/app/api/content-studio/[id]/generate-article/route.ts` | POST endpoint — triggers article generation after brief review |
| `src/app/advanced/content-studio/brief-viewer.tsx` | Frontend — progress display, brief/article viewer, "Generate Article" button |
| `src/app/api/content-studio/audiences/[id]/enhance/route.ts` | POST endpoint for AI audience enhancement |

## How It Works

### Architecture

```
User clicks "Create Brief"
        |
        v
  POST /generate --> Returns immediately
  Schedules agent via after()
        |
        v
  ┌──────────────────────────────────────────────────────┐
  │  Claude Agent (via Agent SDK query())                 │
  │                                                       │
  │  Built-in tools:                                      │
  │  ├─ WebSearch  — search the web for real data         │
  │  ├─ WebFetch   — fetch and read source pages          │
  │                                                       │
  │  Custom MCP tools (in-process via createSdkMcpServer):│
  │  ├─ update_progress — update workflow step/progress   │
  │  └─ save_content    — save brief/article to DB        │
  │                                                       │
  │  The agent autonomously:                              │
  │  1. Searches web for topic research                   │
  │  2. Calls update_progress(step=1, "Researching...")   │
  │  3. Fetches and reads promising sources               │
  │  4. Extracts quotes, statistics, key findings         │
  │  5. Calls update_progress(step=2, "Extracting...")    │
  │  6. Builds a content outline                          │
  │  7. Calls update_progress(step=3, "Outlining...")     │
  │  8. Writes the comprehensive brief                    │
  │  9. Calls save_content(type="brief", markdown=...)    │
  │  10. Calls update_progress(step=4, progress=100)      │
  │                                                       │
  │  If research is weak → searches more                  │
  │  If outline has gaps → revises                        │
  │  If brief quality low → iterates                      │
  └──────────────────────────────────────────────────────┘
```

### Agent Model

| Agent | Model | Budget | Max Turns |
|-------|-------|--------|-----------|
| Brief Generation | Claude Sonnet 4.6 | $0.75 | 25 |
| Article Generation | Claude Sonnet 4.6 | $0.75 | 15 |
| Audience Enhance | Claude Haiku 4.5 | Direct API call | 1 |

### Custom MCP Tools

**`update_progress`** — Updates the `workflow_progress` JSONB column so the frontend can show real-time progress.
- Input: `{ step: 1-5, progress: 0-100, currentTask: string }`
- Maps step numbers to phase keys for backward compat with the frontend sidebar

**`save_content`** — Saves the final brief or article to the database and sets the status.
- Input: `{ type: "brief" | "article", markdown: string }`
- Sets status to `brief_ready` or `article_ready`

### Persistence Pattern

Uses the same sequential promise chain (`createContentPersistChain`) as before:
- Each DB update reads the latest row, applies a mutation, writes back
- No concurrent writes to the same row
- Frontend polls every 3s and sees real-time progress via `workflow_progress.step` / `.progress` / `.currentTask`

### Error Handling

- On agent failure, the pipeline catches the error and reverts status to `draft` (brief) or `brief_ready` (article)
- Running phases are marked as `error` with the error message
- The `after()` callback has its own try/catch for pipeline crashes
- Agent SDK enforces `maxTurns` and `maxBudgetUsd` as safety nets against runaway agents

## API Contracts

### POST /api/content-studio/:id/generate

Triggers brief generation. Returns immediately.

**Response:** `{ ok: true, status: 'brief_generating' }`

**Errors:**
- 401: Not authenticated
- 403: Below Pro tier
- 404: Item not found
- 409: Already generating

### POST /api/content-studio/:id/generate-article

Triggers article generation from a completed brief.

**Response:** `{ ok: true, status: 'article_generating' }`

**Errors:**
- 401: Not authenticated
- 403: Below Pro tier
- 400: Brief not ready or no brief content
- 404: Item not found

## Configuration

| Env Var | Required | Default | Purpose |
|---------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API access for the Agent SDK |

The agent uses the Agent SDK which requires `ANTHROPIC_API_KEY`. Perplexity is no longer needed — the agent uses WebSearch/WebFetch for research instead.

## Usage Limits

Content Studio shares the `contentPages` monthly limit from the pricing plan:

| Tier | Limit | Price |
|------|-------|-------|
| Free | Blocked | — |
| Starter | Blocked | — |
| Pro | 2 items/mo | $99/mo |
| Growth | 5 items/mo | $249/mo |

Both the brief and article generate routes enforce this limit by counting items with a generated brief (`brief_markdown IS NOT NULL`) created in the current calendar month. Exceeding the limit returns a 403 with the usage info.
