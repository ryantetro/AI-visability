interface AuthMeFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  payload: T | null;
}

let authMeRequestPromise: Promise<AuthMeFetchResult> | null = null;
let lastAuthMeResult: AuthMeFetchResult | null = null;
let lastAuthMeFetchedAt = 0;

const AUTH_ME_DEDUPE_WINDOW_MS = 1500;

export async function fetchClientAuthMe<T = unknown>(fetcher: typeof fetch = fetch): Promise<AuthMeFetchResult<T>> {
  const now = Date.now();
  if (lastAuthMeResult && now - lastAuthMeFetchedAt < AUTH_ME_DEDUPE_WINDOW_MS) {
    return lastAuthMeResult as AuthMeFetchResult<T>;
  }

  if (!authMeRequestPromise) {
    authMeRequestPromise = (async () => {
      const res = await fetcher('/api/auth/me', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      const result = {
        ok: res.ok,
        status: res.status,
        payload,
      } satisfies AuthMeFetchResult;
      lastAuthMeResult = result;
      lastAuthMeFetchedAt = Date.now();
      return result;
    })().finally(() => {
      authMeRequestPromise = null;
    });
  }

  return authMeRequestPromise as Promise<AuthMeFetchResult<T>>;
}

export function clearClientAuthMeCache() {
  authMeRequestPromise = null;
  lastAuthMeResult = null;
  lastAuthMeFetchedAt = 0;
}
