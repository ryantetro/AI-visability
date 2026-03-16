import { CrawlData } from '@/types/crawler';

export interface SiteContext {
  limitedCoverage: boolean;
  portalLike: boolean;
  avoidBusinessSpecificFailures: boolean;
}

const PORTAL_PATTERNS = [
  /\bdocs?\b/i,
  /\bdocumentation\b/i,
  /\bdeveloper\b/i,
  /\bknowledge\s*base\b/i,
  /\bhelp\s*center\b/i,
  /\bsupport\b/i,
  /\bwiki\b/i,
  /\breference\b/i,
  /\bapi\b/i,
];

export function inferSiteContext(data: CrawlData): SiteContext {
  const homepage = data.homepage;
  const pages = data.pages;
  const classifications = new Set(pages.map((page) => page.classification));
  const pageCount = pages.length;
  const titleSignals = [homepage?.title || '', homepage?.metaDescription || ''].join(' ');
  const portalLike =
    PORTAL_PATTERNS.some((pattern) => pattern.test(titleSignals)) ||
    (pageCount >= 3 &&
      classifications.size <= 2 &&
      classifications.has('other') &&
      !classifications.has('about') &&
      !classifications.has('contact') &&
      !classifications.has('service'));

  const homepageLinkCount = homepage?.internalLinks.length || 0;
  const limitedCoverage =
    pageCount < 3 &&
    (
      data.sitemap.accessStatus === 'blocked' ||
      data.renderReadiness.mode === 'client-heavy' ||
      data.errors.length > 0 ||
      homepageLinkCount < 3
    );

  return {
    limitedCoverage,
    portalLike,
    avoidBusinessSpecificFailures: limitedCoverage || portalLike,
  };
}
