# Claude Backfill Runbook

Use this when `ANTHROPIC_API_KEY` is newly enabled and older AI visibility records need Claude coverage.

## What it does

- Recomputes `mentionSummary` for completed scans from the last 30 days by default
- Updates only the AI mention portion of stored scan data
- Seeds a current Claude result for active prompt-monitoring prompts
- Does not fabricate historical Claude trend data

## Before you run it

1. Ensure `ANTHROPIC_API_KEY` is set.
2. Optionally set `ANTHROPIC_MODEL` if you want a non-default Claude model.
3. Confirm Supabase environment variables are loaded if you want to update production data.

## Verify engine status

```bash
node scripts/check-ai-engines.cjs
```

## Run the backfill

```bash
node scripts/backfill-claude-ai-visibility.cjs 30
```

Replace `30` with a different day window if needed.

## Safe reruns

The script only rewrites recent scans whose normalized mention summary still does not contain a complete Claude result. It is safe to rerun after configuration changes or transient provider failures.
