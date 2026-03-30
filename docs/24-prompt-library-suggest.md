# Prompt Library — Suggested prompts

## What it does

The **Suggest prompts** control on the Brand → Improve **Prompt Library** panel calls the backend to generate monitoring prompt ideas from the **latest completed scan** for the current domain. Suggestions are deduped against prompts already saved for that domain. Users can add individual lines, **Add all**, or dismiss the list.

## Key files

| File | Role |
|------|------|
| `src/app/api/prompts/suggest/route.ts` | `POST` handler: load scan + crawl, build profile, generate prompts |
| `src/app/advanced/panels/prompt-library-panel.tsx` | Button, loading/error states, suggestion list, add / add-all / dismiss |
| `src/lib/ai-mentions/prompt-generator.ts` | `buildBusinessProfile`, `generatePrompts` (heuristic fallback) |
| `src/lib/ai-mentions/llm-prompt-generator.ts` | `generatePromptsWithLLM` when OpenAI is configured |
| `src/app/api/prompts/route.ts` | Existing `POST` to persist a single prompt (unchanged contract) |

## How it works

1. **Auth**: Session user required (`getAuthUserFromRequest`).
2. **Scan**: `getDatabase().findLatestScanByDomain(domain, user.email)` must return a **complete** job with `crawlData` that matches `CrawlData` (non-empty `pages` array).
3. **Profile**: `buildBusinessProfile(crawl)` feeds both generators.
4. **Generation**:
   - If `canUseOpenAI()` (`OPENAI_API_KEY` set), tries `generatePromptsWithLLM` with a **45s** timeout.
   - On LLM failure or missing key, uses `generatePrompts` (heuristic).
5. **Mapping**: Mention categories from the generator are mapped to library categories: `direct` → `brand`, `comparison` → `competitor`, other structured categories → `industry` (see `mentionToLibraryCategory` in the suggest route).
6. **Dedupe**: Normalized trim + lowercase + collapsed whitespace compared to existing `monitored_prompts` for that domain and user.

## API contract

### `POST /api/prompts/suggest`

**Request body**

```json
{ "domain": "example.com" }
```

**Success (200)**

```json
{
  "suggestions": [
    { "text": "What are the best tools for …?", "category": "industry" }
  ],
  "source": "llm",
  "remainingSlots": 24
}
```

- `source`: `"llm"` | `"heuristic"`.
- `remainingSlots`: `maxPrompts - currentCount` from `getUserAccess`, or `null` if limits are not finite.

**Errors**

| Status | When |
|--------|------|
| 401 | Not authenticated |
| 400 | Missing/invalid `domain` |
| 404 | No completed scan / no crawl data for domain |
| 422 | Crawl has no pages |

Response shape for errors: `{ "error": "string" }`.

## Error handling and UX

- **Frontend** shows API `error` for failed suggest; empty suggestion list after success shows an informational message (all candidates already saved).
- **Add all** stops on first `POST /api/prompts` failure (e.g. at plan limit), refreshes the list, and clears the suggestion panel to avoid duplicate adds.
- **At limit**: Add buttons stay disabled; copy explains deleting or upgrading.

## Configuration

- **`OPENAI_API_KEY`**: Enables LLM path; without it, suggestions are heuristic only.
- **Plan limits**: Enforced when **adding** prompts via existing `POST /api/prompts` (unchanged).
