# Brand Analytics Enhancement: AI-Native Analysis Pipeline

## Summary

Replace the heuristic-based brand analytics pipeline (keyword-counting sentiment, string-matching mention detection, flat scoring) with an AI-native analysis layer powered by GPT-4o-mini. Every engine response gets analyzed by an LLM for accurate mention detection, nuanced sentiment analysis, reliable competitor extraction, and proper position detection. The scoring model shifts from flat additive weights to multi-factor exponential weighting. Prompt generation is upgraded to produce industry-tailored, intent-weighted queries. Monitoring stores richer data for trending.

## Problem

The current brand analytics pipeline has five structural weaknesses:

1. **Sentiment analysis is keyword counting.** 14 positive words vs 12 negative words, whoever has more wins. "Not excellent" registers as positive. No negation, no context, no domain awareness. The resulting labels feel random to users.

2. **Mention detection misses indirect references.** Only fuzzy string matching on the brand name. When an AI engine describes a brand without naming it ("the leading marine parts retailer in Salt Lake City"), it counts as 0% visibility.

3. **Scoring treats everything equally.** A passing mention at position 8 on Claude scores the same as a rank-1 recommendation on ChatGPT. All engines, all positions, all prompt types weighted identically.

4. **Prompts are too generic.** Even LLM-generated prompts feel templated — they don't reflect how real users in a specific industry actually search. Only Marine/Watersports has vertical-specific logic; every other industry gets generic templates.

5. **Competitor extraction is regex-based.** Parsing numbered lists with a regex misses competitors mentioned in prose, misspells names, and produces false positives from list items that aren't competitors.

## Design

### 1. LLM Response Analyzer (`src/lib/ai-mentions/llm-response-analyzer.ts`)

A new module that sends each engine response to GPT-4o-mini for structured analysis. Replaces the heuristic `analyzeResponse()` function.

**Input per call:** The full engine response text, the brand name, the brand domain, the prompt text, and the business profile summary (industry, vertical, products, location).

**System prompt asks the LLM to return JSON with:**

```json
{
  "mentioned": true,
  "mentionType": "direct",
  "position": 2,
  "positionContext": "listed_ranking",
  "sentiment": "positive",
  "sentimentStrength": 8,
  "sentimentReasoning": "Described as a trusted leader with strong product selection",
  "keyQuote": "Marine Products is widely regarded as one of the top marine parts retailers in the Salt Lake City area.",
  "descriptionAccuracy": "accurate",
  "competitors": [
    { "name": "West Marine", "position": 1 },
    { "name": "Overton's", "position": 3 }
  ],
  "citationFound": false
}
```

**Field definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `mentioned` | boolean | Whether the brand is referenced in any form |
| `mentionType` | `'direct' \| 'indirect' \| 'not_mentioned'` | Direct = by name. Indirect = described without naming. |
| `position` | number \| null | Rank in any list or ordering. Null if no ranking context. |
| `positionContext` | `'listed_ranking' \| 'prominent' \| 'passing' \| 'absent'` | How the brand appears in the response structure |
| `sentiment` | `'positive' \| 'neutral' \| 'negative' \| 'mixed'` | Overall tone toward the brand |
| `sentimentStrength` | 1-10 | Intensity of the sentiment |
| `sentimentReasoning` | string | One sentence explaining the sentiment |
| `keyQuote` | string \| null | Most representative sentence about the brand |
| `descriptionAccuracy` | `'accurate' \| 'partial' \| 'inaccurate' \| null` | Whether the AI's description matches reality |
| `competitors` | array | Competitor names with their positions |
| `citationFound` | boolean | Whether the response links to the brand's domain |

**Batching:** Responses are processed in parallel batches of 8 to respect API rate limits while maximizing throughput. Each batch uses `Promise.allSettled` for resilience.

**Timeout:** 6 seconds per individual call, 30 seconds total budget for the analysis phase. If the budget is exceeded, remaining responses fall back to heuristic analysis.

**Fallback:** If an individual LLM call fails (timeout, rate limit, parse error), that response falls back to the existing `analyzeResponse()` heuristic. The `analysisSource` field tracks which method was used.

**Cost:** ~60-100 responses per scan. Each response: ~600 tokens input + ~150 tokens output. At GPT-4o-mini pricing ($0.15/1M input, $0.60/1M output): ~$0.01-0.03 per scan.

### 2. Enhanced Data Model

**`MentionResult` interface additions:**

```typescript
// New fields (additive — existing fields remain for backward compatibility)
mentionType: 'direct' | 'indirect' | 'not_mentioned';
sentimentStrength: number;        // 1-10
sentimentReasoning: string | null;
keyQuote: string | null;
descriptionAccuracy: 'accurate' | 'partial' | 'inaccurate' | null;
competitorsWithPositions: Array<{ name: string; position: number | null }>;
positionContext: 'listed_ranking' | 'prominent' | 'passing' | 'absent' | null;
analysisSource: 'llm' | 'heuristic';
```

Existing fields (`mentioned`, `position`, `sentiment`, `citationPresent`, `competitors`, `rawSnippet`) are populated from the LLM output for backward compatibility:
- `mentioned` = true for both `direct` and `indirect` mention types
- `sentiment` maps from the LLM output: `'mixed'` maps to `'neutral'` for the existing field (the new `sentimentStrength` captures nuance). The existing union `'positive' | 'neutral' | 'negative' | null` is unchanged.
- `descriptionAccurate` (existing boolean) = `descriptionAccuracy === 'accurate'` for backward compat

**`SentimentSummary` interface additions:**

```typescript
// New fields
averageStrength: number;           // Weighted average of sentimentStrength across results
sentimentBreakdown: Record<AIEngine, {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  averageStrength: number;
  sampleQuote: string | null;
}>;
keyPositiveQuotes: string[];       // Actual quotes from positive results (replaces generic bullets)
keyNegativeQuotes: string[];       // Actual quotes from negative results
```

**`prompt_results` table additions (migration):**

```sql
ALTER TABLE prompt_results
  ADD COLUMN IF NOT EXISTS mention_type text,
  ADD COLUMN IF NOT EXISTS sentiment_strength smallint,
  ADD COLUMN IF NOT EXISTS sentiment_reasoning text,
  ADD COLUMN IF NOT EXISTS key_quote text,
  ADD COLUMN IF NOT EXISTS description_accuracy text,
  ADD COLUMN IF NOT EXISTS position_context text,
  ADD COLUMN IF NOT EXISTS analysis_source text DEFAULT 'heuristic',
  ADD COLUMN IF NOT EXISTS competitors_json jsonb DEFAULT '[]';
```

### 3. Weighted Multi-Factor Scoring

Replace `computeScore()` with `computeWeightedScore()`.

**Engine weights** (reflecting market share and influence):
- ChatGPT: 1.4
- Perplexity: 1.1
- Gemini: 1.0
- Claude: 0.9

**Per-response scoring** (max 100 points):

| Factor | Points | Condition |
|--------|--------|-----------|
| Direct mention | 35 | `mentionType === 'direct'` |
| Indirect mention | 15 | `mentionType === 'indirect'` |
| Position rank 1 | 25 | `position === 1` |
| Position rank 2 | 18 | `position === 2` |
| Position rank 3 | 12 | `position === 3` |
| Position rank 4 | 8 | `position === 4` |
| Position rank 5 | 5 | `position === 5` |
| Position 6+ | 2 | `position >= 6` |
| Sentiment positive | up to 15 | `15 * (sentimentStrength / 10)` |
| Sentiment neutral | up to 5 | `5 * (sentimentStrength / 10)` |
| Sentiment negative | 0 | — |
| Own-domain citation | 15 | `citationPresent && citationUrls.some(c => c.isOwnDomain)` |
| Any citation | 5 | `citationPresent && !ownDomainCitation` |
| Description accurate | 10 | `descriptionAccuracy === 'accurate'` |
| Description partial | 5 | `descriptionAccuracy === 'partial'` |

**Overall score** = `sum(responseScore * engineWeight) / sum(engineWeight)` across all responses, capped at 100.

### 4. Position-Weighted Share of Voice

Replace raw mention counting with prominence-weighted SOV.

**Prominence scoring per mention:**
- Rank 1: 10 points
- Rank 2: 7 points
- Rank 3: 5 points
- Rank 4: 3 points
- Rank 5+: 2 points
- Mentioned without ranking (positionContext = 'prominent'): 6 points
- Mentioned without ranking (positionContext = 'passing'): 3 points
- Indirect mention: 2 points
- Not mentioned: 0 points

**Per-engine SOV:** `brandProminence / (brandProminence + sum(competitorProminence))` for each engine.

**Overall SOV:** Weighted by engine weights (same as scoring).

This means being recommended first on ChatGPT matters significantly more than being mentioned 8th on Claude.

### 5. LLM-Powered Sentiment Summary

Replace keyword-aggregated sentiment with LLM-derived data.

**Overall sentiment calculation:**
- Weighted by sentiment strength: a "9/10 positive" counts 3x more than a "3/10 positive"
- Formula: `weightedPositive = sum(strength for positive) / sum(all strengths)`
- Overall = `positive` if weightedPositive > 0.55, `negative` if < 0.35, else `neutral`

**Key quotes:**
- `positives`: Up to 5 actual `keyQuote` values from responses with positive sentiment, sorted by sentimentStrength descending
- `negatives`: Up to 5 actual `keyQuote` values from responses with negative sentiment, sorted by sentimentStrength descending
- No more generic fallback sentences ("generally described positively") — only real quotes from real AI engine responses

**Per-engine breakdown:**
- Each engine gets its own sentiment label, average strength, and sample quote
- Users can see "ChatGPT is positive (8.2/10) — 'Marine Products is a top-rated dealer...' " vs "Claude is neutral (4.5/10) — 'There are several options in the area...' "

### 6. Enhanced Competitor Extraction

The LLM response analysis returns `competitors` with names and positions pre-extracted. This replaces the regex-based `extractCompetitors()` function.

**Improvements:**
- LLM understands prose mentions, not just numbered lists
- Competitor names are properly extracted (no regex artifacts)
- Position data is contextually accurate
- The LLM distinguishes actual competitors from tools, platforms, and generic terms

**Integration with existing pipeline:**
- LLM-extracted competitors feed into `discoverCompetitors()` via the existing `MentionResult.competitors` field
- The existing heuristic filtering (low quality names, wrong industry, generic platforms) still applies as a safety net
- `competitorsWithPositions` provides richer position data for the leaderboard

### 7. Enhanced Prompt Generation

**Upgrade the LLM prompt generator (`llm-prompt-generator.ts`):**

**Richer system prompt** that includes:

1. **Industry search patterns**: "When users in [industry] search AI assistants, they typically ask about [patterns]." This gives the LLM real-world context for generating prompts.

2. **Brand differentiators**: Feed USPs, key features, and competitive positioning so the LLM generates prompts that test whether AI engines understand the brand's unique value.

3. **Intent-weighted distribution**: Shift category weights to emphasize high-business-value prompts:
   - `direct`: 2 (unchanged)
   - `buyer-intent`: 4 (was 2)
   - `comparison`: 4 (was 3)
   - `problem-solution`: 3 (was 2)
   - `recommendation`: 3 (unchanged)
   - `use-case`: 2 (was 3)
   - `category`: 1 (was 3)
   - `workflow`: 1 (was 2)

4. **Few-shot examples**: Include 3-4 example prompts per detected industry so the LLM has concrete quality targets.

5. **Competitor-aware prompts**: When scan competitor seeds are available, require prompts that test competitive positioning — "X vs Y", "alternatives to Z", "why choose X over Y".

**Template fallback improvements (`prompt-generator.ts`):**
- Add vertical-specific patterns for the 6 most common verticals (SaaS, E-commerce, Healthcare, Finance, Marketing, Local Service) — currently only Marine has them
- Use the same intent-weighted distribution as the LLM generator
- Better backfill prompts that reflect actual search patterns

### 8. Enhanced Monitoring & Trending

**LLM analysis in monitoring cron:**

The monitoring cron (`/api/cron/monitor/route.ts`) Phase 2 currently runs prompts across engines and stores basic results. Enhance it to:

1. Use the same LLM response analyzer for monitoring results, giving consistent high-quality data over time
2. Store enhanced fields in `prompt_results` (sentiment_strength, mention_type, key_quote, competitors_json)
3. Fall back to heuristic analysis if LLM calls fail (same fallback pattern as scan-time)

**Score change detection:**
- After each monitoring run, compare the new weighted score against the stored previous score
- If the score changes by > 10 points in either direction, flag it as a notable event
- Store score deltas in the monitoring results for trend visualization

**Competitor movement tracking:**
- Compare competitor positions across monitoring periods
- Flag competitors that jump > 3 positions up (emerging threat) or down (declining)
- Flag new competitors appearing for the first time
- Store movement data in `competitor_appearances` for weekly trend analysis

### 9. Orchestration Changes (`src/lib/ai-mentions/index.ts`)

The `runMentionTests()` function changes to:

```
1. Build business profile (unchanged)
2. Generate prompts via enhanced LLM generator (upgraded prompts)
3. Run engine tests (unchanged)
4. NEW: Run LLM analysis on all engine responses (batched, parallel)
5. Map LLM analysis results to enhanced MentionResult objects
6. Compute weighted score (new algorithm)
7. Compute position-weighted SOV (new algorithm)
8. Compute LLM-powered sentiment summary (new algorithm)
9. Compute topic performance (using enhanced data)
10. Run competitor discovery with LLM-extracted competitors
11. Return enhanced MentionSummary
```

Step 4 is the new core addition. Steps 5-10 use the richer data from the LLM analysis.

## Key Files

| File | Change |
|------|--------|
| `src/lib/ai-mentions/llm-response-analyzer.ts` | **NEW** — LLM response analysis service, batched GPT-4o-mini calls |
| `src/lib/ai-mentions/mention-analyzer.ts` | Replace `computeScore()` with `computeWeightedScore()`, replace `computeShareOfVoice()` with position-weighted version, replace `computeSentimentSummary()` with LLM-powered version. Keep `analyzeResponse()` as heuristic fallback. |
| `src/lib/ai-mentions/llm-prompt-generator.ts` | Upgrade system prompt, add industry patterns, intent-weighted distribution, few-shot examples, competitor-aware prompts |
| `src/lib/ai-mentions/prompt-generator.ts` | Add vertical-specific patterns for 6 common verticals, intent-weighted distribution, better backfill |
| `src/lib/ai-mentions/index.ts` | Integrate LLM analysis step, use enhanced computation functions |
| `src/lib/ai-mentions/competitor-discovery.ts` | Use `competitorsWithPositions` from LLM analysis for richer position data |
| `src/types/ai-mentions.ts` | Extend `MentionResult`, `SentimentSummary`, `ShareOfVoiceData` with new fields |
| `src/app/api/cron/monitor/route.ts` | Use LLM analyzer for monitoring, store enhanced fields, score change detection, competitor movement tracking |
| `src/lib/services/supabase-prompt-monitoring.ts` | Extend `savePromptResult` input type and query to store enhanced fields (mention_type, sentiment_strength, etc.) |
| `supabase/migrations/` | Add columns to `prompt_results` |

## Database Changes

### Migration: `023_enhanced_prompt_results.sql`

```sql
ALTER TABLE prompt_results
  ADD COLUMN IF NOT EXISTS mention_type text,
  ADD COLUMN IF NOT EXISTS sentiment_strength smallint,
  ADD COLUMN IF NOT EXISTS sentiment_reasoning text,
  ADD COLUMN IF NOT EXISTS key_quote text,
  ADD COLUMN IF NOT EXISTS description_accuracy text,
  ADD COLUMN IF NOT EXISTS position_context text,
  ADD COLUMN IF NOT EXISTS analysis_source text DEFAULT 'heuristic',
  ADD COLUMN IF NOT EXISTS competitors_json jsonb DEFAULT '[]';

COMMENT ON COLUMN prompt_results.mention_type IS 'direct | indirect | not_mentioned';
COMMENT ON COLUMN prompt_results.sentiment_strength IS '1-10 intensity scale';
COMMENT ON COLUMN prompt_results.analysis_source IS 'llm | heuristic — which analysis method was used';
COMMENT ON COLUMN prompt_results.competitors_json IS '[{"name": "...", "position": 1}, ...]';
```

## Error Handling

- **LLM call failure**: Individual response falls back to heuristic `analyzeResponse()`. The `analysisSource` field tracks which method was used. No data is lost.
- **LLM timeout**: 6 seconds per call, 30 seconds total budget. Remaining responses use heuristic fallback.
- **Invalid LLM JSON**: Parse error caught, response falls back to heuristic. Logged as warning.
- **OpenAI API key missing**: Entire LLM analysis phase skipped, full heuristic fallback. System works exactly as before.
- **Monitoring LLM failure**: Same fallback — monitoring continues with heuristic analysis. No monitoring data is lost.
- **Rate limiting**: Batch size of 8 with `Promise.allSettled` ensures partial failures don't block the batch. Failed items retry once, then fall back.
- **Backward compatibility**: All existing `MentionResult` fields are populated from LLM output. UI components that consume the current data structure continue to work without changes. New fields are additive.

## Configuration

- **No new env vars required** — uses existing `OPENAI_API_KEY`
- **Feature gate**: LLM analysis runs when `OPENAI_API_KEY` is set and `USE_MOCKS !== 'true'` (same gate as LLM prompt generation)
- **Engine weights**: Hardcoded in `mention-analyzer.ts` as `ENGINE_WEIGHTS` constant. Can be made configurable later if needed.
- **Batch size**: Hardcoded at 8. Can be tuned for rate limits.
- **Timeout**: 6s per call, 30s total budget. Configurable via optional parameters.

## Testing Strategy

- Unit tests for `llm-response-analyzer.ts` with mocked OpenAI responses covering all mention types, sentiment values, and edge cases
- Unit tests for `computeWeightedScore()` with known inputs and expected weighted outputs
- Unit tests for position-weighted SOV with scenarios: brand at rank 1 vs rank 8, single engine vs all engines
- Unit tests for enhanced sentiment summary: weighted aggregation, per-engine breakdown, key quote extraction
- Integration test: mock scan end-to-end with LLM analysis, verify all enhanced fields populated
- Fallback test: simulate LLM failures, verify heuristic fallback produces valid (non-enhanced) results
- Monitoring test: verify enhanced fields stored in prompt_results
- Backward compatibility test: verify existing UI contract (MentionSummary shape) is satisfied
