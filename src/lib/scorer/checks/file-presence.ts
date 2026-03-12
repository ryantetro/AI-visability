import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';

export function runFilePresenceChecks(data: CrawlData): CheckResult[] {
  return [
    {
      id: 'fp-llms-txt',
      dimension: 'file-presence',
      label: 'llms.txt file exists',
      verdict: data.llmsTxt.exists ? 'pass' : 'fail',
      points: data.llmsTxt.exists ? 8 : 0,
      maxPoints: 8,
      detail: data.llmsTxt.exists
        ? 'Your site has an llms.txt file that helps AI models understand your content.'
        : 'No llms.txt file found. This file helps AI models understand and reference your site.',
    },
    {
      id: 'fp-robots-txt',
      dimension: 'file-presence',
      label: 'robots.txt exists',
      verdict: data.robotsTxt.exists ? 'pass' : 'fail',
      points: data.robotsTxt.exists ? 5 : 0,
      maxPoints: 5,
      detail: data.robotsTxt.exists
        ? 'robots.txt is present and accessible.'
        : 'No robots.txt found. AI crawlers need this to understand access permissions.',
    },
    {
      id: 'fp-sitemap',
      dimension: 'file-presence',
      label: 'sitemap.xml exists',
      verdict: data.sitemap.exists ? 'pass' : 'fail',
      points: data.sitemap.exists ? 4 : 0,
      maxPoints: 4,
      detail: data.sitemap.exists
        ? `Sitemap found with ${data.sitemap.urlCount} URLs.`
        : 'No sitemap.xml found. A sitemap helps AI crawlers discover your content.',
    },
    {
      id: 'fp-sitemap-in-robots',
      dimension: 'file-presence',
      label: 'Sitemap referenced in robots.txt',
      verdict: data.sitemap.referencedInRobots ? 'pass' : 'fail',
      points: data.sitemap.referencedInRobots ? 3 : 0,
      maxPoints: 3,
      detail: data.sitemap.referencedInRobots
        ? 'Sitemap is properly referenced in robots.txt.'
        : 'Sitemap is not referenced in robots.txt. Add a Sitemap: directive for better discoverability.',
    },
  ];
}
