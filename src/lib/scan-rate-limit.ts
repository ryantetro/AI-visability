const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

const globalStore = globalThis as unknown as {
  __aisoRateLimit?: Map<string, number[]>;
};

function getStore(): Map<string, number[]> {
  if (!globalStore.__aisoRateLimit) {
    globalStore.__aisoRateLimit = new Map();
  }

  return globalStore.__aisoRateLimit;
}

function prune(ip: string, now: number): number[] {
  const timestamps = getStore().get(ip) ?? [];
  const fresh = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (fresh.length > 0) {
    getStore().set(ip, fresh);
  } else {
    getStore().delete(ip);
  }

  return fresh;
}

export function checkScanRateLimit(ip: string, now = Date.now()) {
  const timestamps = prune(ip, now);

  if (timestamps.length < RATE_LIMIT_MAX) {
    return {
      allowed: true,
      limit: RATE_LIMIT_MAX,
      retryAfterSec: 0,
      remaining: RATE_LIMIT_MAX - timestamps.length,
    };
  }

  const oldestTimestamp = timestamps[0];
  const retryAfterMs = Math.max(RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp), 1000);

  return {
    allowed: false,
    limit: RATE_LIMIT_MAX,
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
    remaining: 0,
  };
}

export function recordScanRequest(ip: string, now = Date.now()) {
  const timestamps = prune(ip, now);
  getStore().set(ip, [...timestamps, now]);
}

export function resetScanRateLimitStore() {
  getStore().clear();
}
