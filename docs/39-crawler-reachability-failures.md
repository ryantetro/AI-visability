# Crawler Reachability Failures

## What it does

Resolves the canonical, reachable hostname for a target site **before** crawling, then treats truly unreachable sites as failed scans with a clear error message instead of "successful" scans with empty pillars.

The original symptom was a scan of `mastercraftutah.com` returning Overall = 0 / "Not Visible" with three `—` pillars and an AI Mentions score of 5. Investigation revealed:

- The site's apex hostname `mastercraftutah.com` resolves to a parking IP (`216.69.141.59`) that has **no TLS listener** — every HTTPS request times out at port 443.
- The real site lives on `www.mastercraftutah.com` (Cloudflare-served).
- `normalizeUrl` was stripping `www` for dedup *and* feeding that stripped URL straight into the crawler, so the crawler kept hitting the dead apex for 60 seconds.
- Three independent `catch {}` blocks in the crawler swallowed every underlying error, so `crawl_data.errors` came back empty.
- `runWebHealthEnrichment` saw `homepage = null` and bailed, returning all three pillars with `percentage: null`.
- The scan was marked `complete` despite producing no useful data.

This document covers the four-part fix.

## Fix summary

1. **URL resolver as a separate concern** (`src/lib/crawler/url-resolver.ts`) — probes apex and `www` variants concurrently before the crawl, follows server redirects, and returns the canonical reachable URL. Identity dedup (`normalizeUrl`) is unchanged; only the *fetched* URL is now resolver-derived.
2. **Surfaces the failure to the UI** — when `crawlData.pages.length === 0`, the workflow throws; the existing failed-state UI in `analysis-client.tsx` renders the message.
3. **Stops swallowing crawler errors** — every catch in `fetchRootHttp`, `crawlPage`, and `crawlPageWithoutBrowser` now records the actual reason into the shared `errors` array.
4. **Removes the fake-positive from `fetchRootHttp`** — failed probes carry `unreachable: true` and `unreachableError: <reason>` instead of pretending headers came back empty.

## Key files

| File | Role |
|------|------|
| `src/lib/crawler/url-resolver.ts` | **NEW.** `resolveCanonicalUrl(input, options)` — probes apex/www variants concurrently, follows server redirects, returns the canonical URL the site actually serves. Pure & testable. |
| `src/lib/crawler/index.ts` | `crawlSite` calls `resolveCanonicalUrl` before any other work; downstream `fetchRobotsTxt` / `fetchSitemap` / `fetchRootHttp` / homepage fetch all use the canonical URL. `fetchRootHttp` (now exported) and `crawlPage` accept an optional `errors` array. |
| `src/lib/crawler/html-fallback.ts` | `crawlPageWithoutBrowser` accepts an optional `errors` array and records non-OK statuses + thrown errors. |
| `src/lib/scan-workflow.ts` | After `crawlSite`, throws if `pages.length === 0`; the outer catch already converts thrown errors into `scan.status = 'failed'` with `progress.error`. |
| `src/types/crawler.ts` | `RootHttpData` adds optional `unreachable` and `unreachableError` fields. |
| `tests/scan-core.test.cjs` | Covers the resolver (variant selection, redirect-following, fallback, candidate generation), the new `errors` plumbing in `crawlPageWithoutBrowser`, and the `unreachable` flag for `fetchRootHttp`. |

## How it works

### URL resolution (the architectural fix)

`crawlSite` no longer trusts the input URL blindly. The first step is:

```ts
const inputProtocoled = ensureProtocol(inputUrl);
const resolved = await resolveCanonicalUrl(inputProtocoled, { errors });
const baseUrl = resolved.canonical;
```

`resolveCanonicalUrl` works as follows:

1. **Generate candidates in priority order.** Always include the input URL first (highest priority — preserves user intent). For plain registrable hostnames (e.g. `example.com`), also generate the apex/www toggle. Subdomains (`app.example.com`), IP literals, and `localhost` are left alone.
2. **Probe concurrently.** Each candidate gets an 8-second `GET` with `Range: bytes=0-2047` (small payload) and `redirect: 'follow'`. Server-issued redirects show up as `res.url` after the chain settles, which becomes the canonical URL.
3. **Pick the highest-priority winner.** A 2xx or 3xx final status counts as reachable. If the user's input hostname works, we use it. If only the alternate works, we use that. If both work, the user's input wins.
4. **Graceful fallback.** If every probe fails, we return the original URL so the downstream crawler can still attempt and surface its own errors. The probe failures are pushed into the shared `errors` array for diagnostics.

Live verification on the original failing case:

```
Resolved in 8003 ms
canonical: https://www.mastercraftutah.com/
reachable: true
finalStatusCode: 200
candidates:
  - https://mastercraftutah.com/    => FAIL  request timed out after 8000ms
  - https://www.mastercraftutah.com/ => OK status=200
```

### Identity vs. fetching

`normalizeUrl` (in `src/lib/url-utils.ts`) still strips `www` to produce a stable dedup key. This is correct for identity — a user typing `www.example.com` and another typing `example.com` should resolve to the same scan record. But that key is **not** what the crawler fetches anymore. After this change:

- `scan.normalizedUrl` = dedup key (apex form, e.g. `https://example.com`)
- `crawlData.url` = canonical URL the resolver picked (may be `https://www.example.com/` after redirects)

These can diverge, which is the point.

### Failure propagation

```
┌─────────────────┐
│   crawlSite     │  errors: string[] (closure-scoped)
└────────┬────────┘
         │
         ├──► fetchRootHttp(url, errors)
         │       └─ catch: errors.push(...) + return { unreachable: true, unreachableError, ... }
         │
         ├──► crawlPage(browser, url, startTime, errors)
         │       └─ catch: errors.push(...) + fall back to crawlPageWithoutBrowser(url, _, errors)
         │
         └──► crawlPageWithoutBrowser(url, startTime, errors)
                 ├─ non-OK: errors.push("HTTP fallback for ${url} returned status ${status}")
                 └─ throw: errors.push("HTTP fallback for ${url} failed: ${reason}")
```

### Workflow gate

```ts
// src/lib/scan-workflow.ts (after crawlSite + persist)
if (crawlData.pages.length === 0) {
  const detail = crawlData.errors.length > 0
    ? crawlData.errors.join(' • ')
    : 'The server did not respond within the crawl timeout.';
  throw new Error(
    `We couldn't reach ${crawlData.url}. This usually means the site is down, ` +
    `behind a strict firewall, or actively blocking automated requests. Details: ${detail}`,
  );
}
```

The outer `try/catch` around the entire workflow body catches this error, marks `scan.status = 'failed'`, and stores the message in `scan.progress.error`. The dashboard's existing `isFailed` branch renders it directly.

## API contracts

No external API changes. The existing `GET /api/scan/:id/report` endpoint already returns `{ failed: true, progress, ... }` with `progress.error` populated when `scan.status === 'failed'`, and the analysis client (`isFailed` branch in `analysis-client.tsx`) already renders `data?.progress?.error`.

## Error handling

- A successful scan with at least one page is unchanged.
- A scan that resolves zero pages is now `failed` rather than `complete` with empty pillars.
- Scoring (`scoreCrawlData`) and AI mention testing are skipped entirely when zero pages are crawled — there's nothing meaningful to score.
- `fetchRootHttp` failures no longer return a misleading `{ https: true, headers: {} }` shape. Downstream consumers (e.g. security checks) can inspect `rootHttp.unreachable` to distinguish "no headers found" from "we never got a response."

## Configuration

No new env vars or feature flags. Timeouts:

| Constant | Value | Where |
|----------|-------|-------|
| `PROBE_TIMEOUT_MS` | 8s | `url-resolver.ts` |
| `ROOT_HTTP_TIMEOUT_MS` | 10s | `crawler/index.ts` |
| `HTML_TIMEOUT_MS` | 30s | `html-fallback.ts` |
| `PAGE_TIMEOUT` | 30s | `crawler/index.ts` (Puppeteer) |
| `TOTAL_TIMEOUT` | 120s | `crawler/index.ts` (whole crawl) |

## Future enhancements

- **Cache resolved canonicals per-domain** so subsequent scans skip the 8s wait when the apex hangs.
- **Happy-eyeballs-style headstart** — give the user's input URL a 2s head start before launching alternates, so well-configured sites don't pay any latency penalty for the resolver.
- **Public-suffix-list awareness** so country-code TLDs (`example.co.uk`) get apex/www twiddling too.

## Testing

`tests/scan-core.test.cjs`:

- `buildCandidates produces apex+www variants for registrable domains only`
- `resolveCanonicalUrl picks the alternate variant when the input variant fails`
- `resolveCanonicalUrl prefers the input URL when both variants succeed`
- `resolveCanonicalUrl follows server redirects to the canonical URL`
- `resolveCanonicalUrl falls back to the input URL and records errors when every variant fails`
- `resolveCanonicalUrl treats non-2xx/3xx responses as failed probes`
- `crawlPageWithoutBrowser records the status code when the response is not OK`
- `crawlPageWithoutBrowser records the underlying error when the fetch throws`
- `fetchRootHttp marks the result unreachable and records the error when the probe fails`
- `fetchRootHttp returns header-derived signals on success without setting unreachable`

Run with `npm test`.
