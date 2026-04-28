import { ensureProtocol } from '@/lib/url-utils';

/**
 * URL canonicalization for the crawler.
 *
 * Why this exists:
 *   `mastercraftutah.com` and `www.mastercraftutah.com` are different
 *   hostnames at the DNS level. Many production sites only serve real
 *   content on one of them — the other may issue a 301 redirect, lack
 *   a TLS listener, or simply hang. The crawler needs to anchor on
 *   whichever variant the server actually serves.
 *
 * Strategy:
 *   1. Generate candidate variants of the input URL in priority order
 *      (input first, apex/www toggle second).
 *   2. Probe all candidates concurrently with a small range request.
 *      `redirect: 'follow'` means each probe surfaces the server's
 *      preferred canonical via `res.url` after the chain settles.
 *   3. Among the candidates that succeeded, pick the highest-priority
 *      one. (Priority = order in which it was generated, so the user's
 *      original input always wins ties.)
 *   4. If no candidate succeeded, return the input URL as a graceful
 *      fallback — the downstream crawler will record its own errors.
 *
 * Identity vs. fetching:
 *   This module has nothing to do with how scans are deduped. The scan
 *   record key (`normalizedUrl`) deliberately strips `www` for dedup.
 *   This resolver answers a different question — "where do we actually
 *   fetch from?" — and is allowed to return a different hostname.
 */

export interface CandidateProbeResult {
  url: string;
  ok: boolean;
  statusCode?: number;
  finalUrl?: string;
  reason?: string;
}

export interface ResolvedUrl {
  /** URL that downstream code should crawl. Falls back to the input URL when no probe succeeded. */
  canonical: string;
  /** True when at least one candidate returned a usable response. */
  reachable: boolean;
  /** HTTP status of the winning probe, if any. */
  finalStatusCode?: number;
  /** Diagnostics: every candidate that was tried, in priority order. */
  candidates: CandidateProbeResult[];
}

const PROBE_TIMEOUT_MS = 8000;
const RANGE_HEADER = 'bytes=0-2047';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function resolveCanonicalUrl(
  inputUrl: string,
  options: { timeoutMs?: number; errors?: string[] } = {},
): Promise<ResolvedUrl> {
  const timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS;
  const original = ensureProtocol(inputUrl);
  const candidates = buildCandidates(original);

  // Concurrent probes. Each has its own bounded timeout, so overall
  // worst-case wait is `timeoutMs` regardless of how many candidates
  // there are — we just want them in flight at the same time.
  const settled = await Promise.all(
    candidates.map((url) => probeCandidate(url, timeoutMs)),
  );

  // Pick the highest-priority (earliest-generated) candidate that succeeded.
  const winner = settled.find((r) => r.ok);

  if (!winner) {
    for (const result of settled) {
      if (result.reason) {
        options.errors?.push(`URL probe for ${result.url} failed: ${result.reason}`);
      }
    }
    return {
      canonical: original,
      reachable: false,
      candidates: settled,
    };
  }

  return {
    canonical: winner.finalUrl || winner.url,
    reachable: true,
    finalStatusCode: winner.statusCode,
    candidates: settled,
  };
}

/**
 * Build candidate URLs in priority order. The original URL is always
 * first (highest priority). We toggle apex<->www only for plain
 * registrable two-label hostnames like `example.com` to avoid mangling
 * subdomains (`app.example.com`) or IP literals.
 */
export function buildCandidates(input: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return [input];
  }

  const host = parsed.hostname;
  if (isIpLiteral(host) || host === 'localhost') {
    return [input];
  }

  const apex = host.replace(/^www\./, '');
  const isApex = host === apex;
  const looksRegistrable = apex.split('.').length === 2; // conservative: skip ccTLDs

  const ordered: string[] = [input];
  if (looksRegistrable) {
    ordered.push(swapHost(parsed, isApex ? `www.${apex}` : apex));
  }

  // De-duplicate while preserving order.
  return Array.from(new Set(ordered));
}

function swapHost(url: URL, newHost: string): string {
  const next = new URL(url.toString());
  next.hostname = newHost;
  return next.toString();
}

function isIpLiteral(host: string): boolean {
  return /^[0-9.]+$/.test(host) || /^\[.*\]$/.test(host);
}

async function probeCandidate(
  url: string,
  timeoutMs: number,
): Promise<CandidateProbeResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Range: RANGE_HEADER,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    // 2xx and 3xx after redirect-follow both indicate a reachable origin.
    // 206 (Partial Content from our Range request) is also success.
    const ok = res.status >= 200 && res.status < 400;
    return {
      url,
      ok,
      statusCode: res.status,
      finalUrl: res.url || undefined,
      reason: ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      url,
      ok: false,
      reason: errorReason(err, timeoutMs),
    };
  }
}

function errorReason(err: unknown, timeoutMs: number): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return `request timed out after ${timeoutMs}ms`;
    }
    return err.message || err.name;
  }
  return String(err);
}
