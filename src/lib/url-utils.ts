export function normalizeUrl(input: string): string {
  let url = input.trim().toLowerCase();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    // Remove trailing slash, default port, www prefix for dedup
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, '') || '';
    return `https://${host}${path}`;
  } catch {
    return url;
  }
}

export function isValidUrl(input: string): boolean {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    // Must have a dot in the hostname (e.g., example.com)
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export function ensureProtocol(input: string): string {
  const url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

export function getDomain(url: string): string {
  try {
    return new URL(ensureProtocol(url)).hostname;
  } catch {
    return url;
  }
}

export function isLikelyPublicPage(input: string): boolean {
  try {
    const pathname = input.startsWith('/')
      ? input.toLowerCase()
      : new URL(ensureProtocol(input)).pathname.toLowerCase();

    if (
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/llms.txt' ||
      pathname.startsWith('/api/')
    ) {
      return false;
    }

    if (
      /\.(xml|txt|json|rss|atom|pdf|zip|jpe?g|png|webp|gif|svg|ico|css|js)(?:$|\?)/i.test(
        pathname
      )
    ) {
      return false;
    }

    return !/^\/(admin|wp-admin|login|logout|signin|signup|register|account|settings|analytics|upgrade|checkout|cart|blocked)(\/|$)/i.test(
      pathname
    );
  } catch {
    return false;
  }
}
