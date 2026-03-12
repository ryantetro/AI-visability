import { PageClassification } from '@/types/crawler';

const patterns: { classification: PageClassification; urlPatterns: RegExp[]; titlePatterns: RegExp[] }[] = [
  {
    classification: 'about',
    urlPatterns: [/\/about/i, /\/who-we-are/i, /\/our-story/i, /\/team/i],
    titlePatterns: [/about\s+(us|me)/i, /who\s+we\s+are/i, /our\s+(story|team)/i],
  },
  {
    classification: 'contact',
    urlPatterns: [/\/contact/i, /\/get-in-touch/i, /\/reach-us/i],
    titlePatterns: [/contact/i, /get\s+in\s+touch/i, /reach\s+(us|out)/i],
  },
  {
    classification: 'service',
    urlPatterns: [/\/service/i, /\/product/i, /\/solution/i, /\/pricing/i, /\/feature/i],
    titlePatterns: [/service/i, /product/i, /solution/i, /pricing/i, /feature/i],
  },
  {
    classification: 'blog',
    urlPatterns: [/\/blog/i, /\/news/i, /\/article/i, /\/post/i],
    titlePatterns: [/blog/i, /news/i],
  },
  {
    classification: 'faq',
    urlPatterns: [/\/faq/i, /\/frequently/i, /\/help/i],
    titlePatterns: [/faq/i, /frequently\s+asked/i],
  },
];

export function classifyPage(
  url: string,
  title: string,
  h1s: string[]
): PageClassification {
  const path = new URL(url).pathname;
  // Homepage
  if (path === '/' || path === '') return 'homepage';

  const combinedText = [title, ...h1s].join(' ');

  for (const p of patterns) {
    if (p.urlPatterns.some((r) => r.test(path))) return p.classification;
    if (p.titlePatterns.some((r) => r.test(combinedText))) return p.classification;
  }

  return 'other';
}
