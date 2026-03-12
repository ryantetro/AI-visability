import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';

export function runContentSignalChecks(data: CrawlData): CheckResult[] {
  const hasAbout = data.pages.some((p) => p.classification === 'about');
  const servicePages = data.pages.filter((p) => p.classification === 'service');
  const hasDeepServices = servicePages.length >= 2 && servicePages.every((p) => p.wordCount > 200);
  const hasContact = data.pages.some((p) => p.classification === 'contact');

  // Freshness: check for dates in content or lastModified
  const homepage = data.homepage;
  const hasFreshnessSignals = homepage
    ? homepage.textContent.match(/\b202[4-6]\b/) !== null || !!homepage.lastModified
    : false;

  return [
    {
      id: 'cs-about',
      dimension: 'content-signals',
      label: 'About page exists',
      verdict: hasAbout ? 'pass' : 'fail',
      points: hasAbout ? 6 : 0,
      maxPoints: 6,
      detail: hasAbout
        ? 'About page found — helps AI models understand your identity.'
        : 'No about page detected. An about page helps AI build entity understanding.',
    },
    {
      id: 'cs-service-depth',
      dimension: 'content-signals',
      label: 'Service/product page depth',
      verdict: hasDeepServices ? 'pass' : servicePages.length > 0 ? 'fail' : 'unknown',
      points: hasDeepServices ? 5 : 0,
      maxPoints: 5,
      detail: hasDeepServices
        ? `${servicePages.length} detailed service pages found.`
        : servicePages.length > 0
        ? 'Service pages found but lack depth (< 200 words).'
        : 'No service pages detected in crawled pages.',
    },
    {
      id: 'cs-freshness',
      dimension: 'content-signals',
      label: 'Content freshness signals',
      verdict: hasFreshnessSignals ? 'pass' : 'fail',
      points: hasFreshnessSignals ? 5 : 0,
      maxPoints: 5,
      detail: hasFreshnessSignals
        ? 'Recent date references found — signals active content.'
        : 'No recent date references found. Fresh content signals relevance to AI.',
    },
    {
      id: 'cs-contact',
      dimension: 'content-signals',
      label: 'Contact information available',
      verdict: hasContact ? 'pass' : 'fail',
      points: hasContact ? 4 : 0,
      maxPoints: 4,
      detail: hasContact
        ? 'Contact page found — establishes legitimacy.'
        : 'No contact page detected. Contact info helps establish trust.',
    },
  ];
}
