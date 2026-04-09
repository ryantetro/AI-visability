/**
 * Shared AI call helpers for the Content Studio pipeline.
 *
 * Reuses the timeout / retry / throttle patterns from
 * `src/lib/services/mention-tester-real.ts`.
 */

/* ── Constants ────────────────────────────────────────────────────────── */

const ANTHROPIC_MIN_INTERVAL_MS = 4_000;
const ANTHROPIC_FALLBACK_RETRY_AFTER_MS = 15_000;
const ANTHROPIC_MAX_RETRIES = 3;

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-20250514';
const PERPLEXITY_MODEL = 'sonar';

const HAIKU_TIMEOUT_MS = 30_000;
const SONNET_TIMEOUT_MS = 90_000;
const PERPLEXITY_TIMEOUT_MS = 30_000;

/* ── Low-level helpers (copied from mention-tester-real) ──────────── */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapAbortToTimeout(error: unknown, label: string, timeoutMs: number) {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error(`${label} timeout after ${timeoutMs}ms`);
  }
  return error;
}

function parseRetryAfterMs(res: Response): number | null {
  const retryAfter = res.headers.get('retry-after');
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const retryAt = Date.parse(retryAfter);
  if (!Number.isNaN(retryAt)) return Math.max(0, retryAt - Date.now());
  return null;
}

/* ── Anthropic throttle queue ─────────────────────────────────────── */

let anthropicQueue: Promise<void> = Promise.resolve();
let anthropicNextAllowedAt = 0;

function setAnthropicNextAllowedAt(delayMs: number) {
  anthropicNextAllowedAt = Math.max(
    anthropicNextAllowedAt,
    Date.now() + Math.max(delayMs, ANTHROPIC_MIN_INTERVAL_MS),
  );
}

async function runAnthropicThrottled<T>(task: () => Promise<T>): Promise<T> {
  const previous = anthropicQueue;
  let release!: () => void;
  anthropicQueue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const waitMs = Math.max(0, anthropicNextAllowedAt - Date.now());
    if (waitMs > 0) await sleep(waitMs);
    anthropicNextAllowedAt = Date.now() + ANTHROPIC_MIN_INTERVAL_MS;
    return await task();
  } finally {
    release();
  }
}

/* ── Anthropic (shared retry logic) ──────────────────────────────── */

async function callAnthropic(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  timeoutMs: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  for (let attempt = 0; attempt < ANTHROPIC_MAX_RETRIES; attempt += 1) {
    const res = await runAnthropicThrottled(() =>
      fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system,
            messages: [{ role: 'user', content: userMessage }],
          }),
        },
        timeoutMs,
      ),
    ).catch((error) => {
      throw mapAbortToTimeout(error, `Anthropic ${model}`, timeoutMs);
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text ?? '';
    }

    const body = await res.text().catch(() => '');
    const retryAfterMs = parseRetryAfterMs(res);
    const isRateLimited = res.status === 429;
    const isTransient = res.status === 529 || res.status >= 500;

    if (isRateLimited && attempt < ANTHROPIC_MAX_RETRIES - 1) {
      const jitterMs = Math.round(Math.random() * 2000);
      const delayMs =
        (retryAfterMs ?? ANTHROPIC_FALLBACK_RETRY_AFTER_MS * (attempt + 1)) +
        jitterMs;
      setAnthropicNextAllowedAt(delayMs);
      console.warn(
        `[content-studio] Anthropic rate-limited (${res.status}), retrying in ${delayMs}ms`,
      );
      continue;
    }

    if (isTransient && attempt < ANTHROPIC_MAX_RETRIES - 1) {
      const delayMs = ANTHROPIC_FALLBACK_RETRY_AFTER_MS * (attempt + 1);
      setAnthropicNextAllowedAt(delayMs);
      console.warn(
        `[content-studio] Anthropic transient error ${res.status}, retrying in ${delayMs}ms`,
      );
      continue;
    }

    throw new Error(
      `Anthropic API error: ${res.status}${body ? ` ${body.slice(0, 240)}` : ''}`,
    );
  }

  throw new Error('Anthropic API error: retry exhausted');
}

/* ── Public API ───────────────────────────────────────────────────── */

export async function callAnthropicHaiku(
  system: string,
  userMessage: string,
  maxTokens = 2048,
): Promise<string> {
  return callAnthropic(HAIKU_MODEL, system, userMessage, maxTokens, HAIKU_TIMEOUT_MS);
}

export async function callAnthropicSonnet(
  system: string,
  userMessage: string,
  maxTokens = 4096,
): Promise<string> {
  return callAnthropic(SONNET_MODEL, system, userMessage, maxTokens, SONNET_TIMEOUT_MS);
}

export interface PerplexityResult {
  text: string;
  citations: string[];
}

export async function callPerplexity(
  message: string,
  maxTokens = 2048,
): Promise<PerplexityResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY is not set');

  const res = await fetchWithTimeout(
    'https://api.perplexity.ai/v1/sonar',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: message }],
        max_tokens: maxTokens,
      }),
    },
    PERPLEXITY_TIMEOUT_MS,
  ).catch((error) => {
    throw mapAbortToTimeout(error, 'Perplexity API', PERPLEXITY_TIMEOUT_MS);
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Perplexity API error: ${res.status}${body ? ` ${body.slice(0, 240)}` : ''}`,
    );
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    citations: Array.isArray(data.citations)
      ? data.citations.filter(
          (v: unknown): v is string => typeof v === 'string',
        )
      : [],
  };
}

/** Returns true when Perplexity is configured */
export function isPerplexityAvailable(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

/** Returns true when Anthropic is configured */
export function isAnthropicAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
