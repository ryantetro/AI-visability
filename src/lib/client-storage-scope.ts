const AUTH_STORAGE_SCOPE_KEY = 'aiso_auth_storage_scope';

function normalizeScope(scope: string) {
  return scope.trim().toLowerCase();
}

export function getClientStorageScope(explicitScope?: string | null) {
  if (explicitScope?.trim()) {
    return normalizeScope(explicitScope);
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const storedScope = window.localStorage.getItem(AUTH_STORAGE_SCOPE_KEY);
  return storedScope?.trim() ? normalizeScope(storedScope) : null;
}

export function setClientStorageScope(scope?: string | null) {
  if (typeof window === 'undefined') return;

  const normalizedScope = scope?.trim() ? normalizeScope(scope) : null;
  if (!normalizedScope) {
    window.localStorage.removeItem(AUTH_STORAGE_SCOPE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_SCOPE_KEY, normalizedScope);
}

export function buildScopedStorageKey(baseKey: string, explicitScope?: string | null) {
  const scope = getClientStorageScope(explicitScope);
  return scope ? `${baseKey}:${scope}` : null;
}
