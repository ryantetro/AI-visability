import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';

export function runEntityClarityChecks(data: CrawlData): CheckResult[] {
  const pages = data.pages;
  const homepage = data.homepage;

  // Name consistency: check if the site title appears across multiple pages
  const siteTitle = homepage?.title?.split(/[|\-–—]/)[0]?.trim() || '';
  const nameAppearances = siteTitle
    ? pages.filter((p) => p.title.includes(siteTitle) || p.textContent.includes(siteTitle)).length
    : 0;
  const hasNameConsistency = siteTitle.length > 0 && nameAppearances >= Math.min(pages.length, 3);

  // Social proof: check for social media links
  const allExternalLinks = pages.flatMap((p) => p.externalLinks);
  const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'github.com'];
  const socialLinks = allExternalLinks.filter((link) =>
    socialDomains.some((d) => link.includes(d))
  );
  const hasSocial = socialLinks.length >= 2;

  // Authority signals: schema sameAs, established brand signals
  const allSchemas = pages.flatMap((p) => p.schemaObjects);
  const sameAsLinks = allSchemas
    .filter((s) => Array.isArray(s.raw.sameAs))
    .flatMap((s) => s.raw.sameAs as string[]);
  const hasAuthority = sameAsLinks.length >= 2 || (hasSocial && hasNameConsistency);

  return [
    {
      id: 'ec-name',
      dimension: 'entity-clarity',
      category: 'ai',
      label: 'Name consistency across pages',
      verdict: hasNameConsistency ? 'pass' : siteTitle ? 'fail' : 'unknown',
      points: hasNameConsistency ? 4 : 0,
      maxPoints: 4,
      detail: hasNameConsistency
        ? `"${siteTitle}" appears consistently across ${nameAppearances} pages.`
        : siteTitle
        ? `"${siteTitle}" not consistently used across pages.`
        : 'Could not determine site name from homepage title.',
    },
    {
      id: 'ec-social',
      dimension: 'entity-clarity',
      category: 'ai',
      label: 'Social media presence linked',
      verdict: hasSocial ? 'pass' : 'fail',
      points: hasSocial ? 3 : 0,
      maxPoints: 3,
      detail: hasSocial
        ? `${socialLinks.length} social media links found.`
        : 'Fewer than 2 social media links found. Link your social profiles.',
    },
    {
      id: 'ec-authority',
      dimension: 'entity-clarity',
      category: 'ai',
      label: 'Authority signals',
      verdict: hasAuthority ? 'pass' : 'fail',
      points: hasAuthority ? 3 : 0,
      maxPoints: 3,
      detail: hasAuthority
        ? 'Strong entity authority signals detected.'
        : 'Weak authority signals. Add sameAs links in schema and link social profiles.',
    },
  ];
}
