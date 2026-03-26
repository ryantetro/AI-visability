export function sanitizeAppRelativePath(path: string | null | undefined, fallback = '/dashboard') {
  if (!path || typeof path !== 'string') {
    return fallback;
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return fallback;
  }

  return path;
}

export function getCurrentAppPath(fallback = '/dashboard') {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function buildLoginHref(nextPath: string) {
  const params = new URLSearchParams({ next: nextPath });
  return `/login?${params.toString()}`;
}
