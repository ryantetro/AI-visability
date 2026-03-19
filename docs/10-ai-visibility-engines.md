# AI Visibility Engines

This document explains how AI visibility testing works for the four provider API keys currently supported by the app:

- `OPENAI_API_KEY` for `ChatGPT`
- `GOOGLE_GENAI_API_KEY` for `Gemini`
- `PERPLEXITY_API_KEY` for `Perplexity`
- `ANTHROPIC_API_KEY` for `Claude`

It reflects the current implementation in:

- [src/lib/ai-engines.ts](/Users/ryantetro/AI-visability/src/lib/ai-engines.ts)
- [src/lib/services/mention-tester-real.ts](/Users/ryantetro/AI-visability/src/lib/services/mention-tester-real.ts)
- [src/lib/ai-mentions/index.ts](/Users/ryantetro/AI-visability/src/lib/ai-mentions/index.ts)
- [src/lib/scan-workflow.ts](/Users/ryantetro/AI-visability/src/lib/scan-workflow.ts)
- [src/app/api/cron/monitor/route.ts](/Users/ryantetro/AI-visability/src/app/api/cron/monitor/route.ts)

## Shared flow

All four engines use the same AI visibility pipeline:

1. A scan crawls the website and builds `crawlData`.
2. The app generates a set of AI-style prompts from the site content.
3. Each configured engine is queried with the same prompt set.
4. Responses are analyzed for:
   - whether the brand is mentioned
   - average position
   - sentiment
   - citations
   - competitors mentioned
5. The app stores a `mentionSummary` on the scan, including:
   - `engineBreakdown`
   - `engineStatus`
   - raw `results`
   - visibility/share-of-voice/sentiment aggregates
6. Dashboards, reports, competitor views, and prompt monitoring read from that same normalized mention data.

If an engine is not configured for a run, it is marked as `not_configured`.

If a newer engine was added after an older scan already existed, that older scan is normalized to show `not_backfilled` instead of pretending the engine had a zero score.

## Engine registry

All engine metadata is centralized in [src/lib/ai-engines.ts](/Users/ryantetro/AI-visability/src/lib/ai-engines.ts).

The registry defines:

- engine id
- user-facing label
- provider
- brand color
- required env var
- default model

Current canonical engine ids:

- `chatgpt`
- `perplexity`
- `gemini`
- `claude`

## ChatGPT

### Enablement

- Env var: `OPENAI_API_KEY`
- User-facing label: `ChatGPT`
- Provider: `OpenAI`
- Default model: `gpt-4o-mini`

### Request path

ChatGPT visibility testing is handled in [src/lib/services/mention-tester-real.ts](/Users/ryantetro/AI-visability/src/lib/services/mention-tester-real.ts) via:

- endpoint: `https://api.openai.com/v1/chat/completions`
- auth header: `Authorization: Bearer ${OPENAI_API_KEY}`

### What it does

When `OPENAI_API_KEY` is present, ChatGPT becomes an available engine for:

- scan-time mention testing
- saved `mentionSummary` generation
- prompt monitoring cron runs
- competitor mention aggregation
- report and dashboard engine breakdowns

### Output in the app

ChatGPT results contribute to:

- AI visibility score breakdowns
- competitor engine heatmaps
- citation tracking
- prompt mention rate panels
- advanced dashboard platform cards

## Gemini

### Enablement

- Env var: `GOOGLE_GENAI_API_KEY`
- Optional model override: `GEMINI_MODEL`
- User-facing label: `Gemini`
- Provider: `Google`
- Default model: `gemini-2.5-flash`

### Request path

Gemini visibility testing is handled in [src/lib/services/mention-tester-real.ts](/Users/ryantetro/AI-visability/src/lib/services/mention-tester-real.ts) via:

- endpoint pattern: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
- query auth: `?key=${GOOGLE_GENAI_API_KEY}`

### Special handling

Gemini has provider-specific blocking logic in the runtime:

- if `finishReason` is `SAFETY` or `RECITATION`, the request is treated as a failed engine test
- that failure does not fail the entire scan
- other engines still complete normally

### What it does

When `GOOGLE_GENAI_API_KEY` is present, Gemini is included in the same shared scan and monitoring flow as the other engines.

## Perplexity

### Enablement

- Env var: `PERPLEXITY_API_KEY`
- User-facing label: `Perplexity`
- Provider: `Perplexity`
- Default model: `sonar`

### Request path

Perplexity visibility testing is handled in [src/lib/services/mention-tester-real.ts](/Users/ryantetro/AI-visability/src/lib/services/mention-tester-real.ts) via:

- endpoint: `https://api.perplexity.ai/chat/completions`
- auth header: `Authorization: Bearer ${PERPLEXITY_API_KEY}`

### What it does

When `PERPLEXITY_API_KEY` is present, Perplexity participates in:

- scan-time prompt testing
- persisted `mentionSummary` results
- prompt monitoring checks
- competitor appearance storage
- all engine-aware dashboard/report surfaces

## Claude

### Enablement

- Env var: `ANTHROPIC_API_KEY`
- Optional model override: `ANTHROPIC_MODEL`
- User-facing label: `Claude`
- Provider: `Anthropic`
- Default model: `claude-haiku-4-5-20251001`

### Request path

Claude visibility testing is handled in [src/lib/services/mention-tester-real.ts](/Users/ryantetro/AI-visability/src/lib/services/mention-tester-real.ts) via:

- endpoint: `https://api.anthropic.com/v1/messages`
- auth header: `x-api-key: ${ANTHROPIC_API_KEY}`
- Anthropic version header: `anthropic-version: 2023-06-01`

### Special handling

Claude has extra hardening compared with the other engines:

- explicit timeout support via `ANTHROPIC_TIMEOUT_MS` or `AI_ENGINE_TIMEOUT_MS`
- one retry on transient `429`, `529`, or `5xx` failures
- provider errors are logged per engine and per prompt
- one Claude failure does not invalidate the full scan

### Backfill behavior

Claude was added after older mention data already existed, so the app now supports:

- normalized older records showing `not_backfilled`
- a one-off backfill script for recent scans
- prompt-monitoring baseline seeding for active prompts

Relevant files:

- [src/lib/ai-mentions/summary.ts](/Users/ryantetro/AI-visability/src/lib/ai-mentions/summary.ts)
- [scripts/backfill-claude-ai-visibility.cjs](/Users/ryantetro/AI-visability/scripts/backfill-claude-ai-visibility.cjs)
- [docs/09-anthropic-backfill.md](/Users/ryantetro/AI-visability/docs/09-anthropic-backfill.md)

## How engine availability is decided

The app does not use a manual feature flag per provider.

Instead, engine availability is derived from the presence of the required env var:

- `OPENAI_API_KEY` enables `chatgpt`
- `GOOGLE_GENAI_API_KEY` enables `gemini`
- `PERPLEXITY_API_KEY` enables `perplexity`
- `ANTHROPIC_API_KEY` enables `claude`

The runtime helper is `getConfiguredAIEngines()` in [src/lib/ai-engines.ts](/Users/ryantetro/AI-visability/src/lib/ai-engines.ts).

## Where the results are used

Once an engine is configured and returns results, that engine’s data flows into:

- scan `mentionSummary`
- AI visibility score reporting
- advanced dashboard platform performance
- engine breakdown cards
- citation tracking panels
- competitor heatmaps and comparison views
- prompt monitoring and prompt trends
- share-of-voice calculations

## Engine status states

Each engine now has an explicit status in `mentionSummary.engineStatus`.

Possible statuses:

- `complete`: the engine was configured and tested for that scan
- `not_configured`: no API key was available for that engine on that run
- `not_backfilled`: older scan data predates that engine’s saved result set
- `error`: the engine was attempted but failed for that run

This is what lets the UI say:

- "not configured on this run"
- "not tested on this scan yet"
- "testing error"

instead of incorrectly showing a zero-result failure.

## Prompt monitoring

Prompt monitoring uses the same available engines returned by the mention tester.

In [src/app/api/cron/monitor/route.ts](/Users/ryantetro/AI-visability/src/app/api/cron/monitor/route.ts), the cron job:

1. loads active monitored prompts
2. queries every configured engine for each prompt
3. analyzes the response
4. stores prompt results
5. stores competitor appearances

That means all four API keys affect both:

- scan-time AI visibility
- ongoing prompt-monitoring visibility

## Quick verification

To verify which engines are active locally:

```bash
node scripts/check-ai-engines.cjs
```

If you want the shell to load `.env.local` first:

```bash
bash -lc 'set -a; [ -f .env.local ] && source .env.local; set +a; node scripts/check-ai-engines.cjs'
```
