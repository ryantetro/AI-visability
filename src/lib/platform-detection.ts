import { SitePlatform } from '@/types/crawler';

interface PlatformSignals {
  metaGenerator?: string;
  assetUrls?: string[];
  html?: string;
}

const PLATFORM_LABELS: Record<SitePlatform, string> = {
  wordpress: 'WordPress',
  squarespace: 'Squarespace',
  webflow: 'Webflow',
  custom: 'Custom Site',
};

export function detectPlatform({
  metaGenerator = '',
  assetUrls = [],
  html = '',
}: PlatformSignals): SitePlatform {
  const generator = metaGenerator.toLowerCase();
  const haystack = `${generator}\n${assetUrls.join('\n')}\n${html}`.toLowerCase();

  if (
    generator.includes('wordpress') ||
    haystack.includes('/wp-content/') ||
    haystack.includes('/wp-includes/')
  ) {
    return 'wordpress';
  }

  if (
    generator.includes('squarespace') ||
    haystack.includes('static1.squarespace.com') ||
    haystack.includes('squarespace.com')
  ) {
    return 'squarespace';
  }

  if (generator.includes('webflow') || haystack.includes('webflow')) {
    return 'webflow';
  }

  return 'custom';
}

export function extractAssetUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();
  const assetRegex = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = assetRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  return [...urls];
}

export function formatPlatformLabel(platform: SitePlatform): string {
  return PLATFORM_LABELS[platform];
}
