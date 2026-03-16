import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';
import { inferSiteContext } from '../site-context';

export function runTopicalAuthorityChecks(data: CrawlData): CheckResult[] {
  const siteContext = inferSiteContext(data);
  const pages = data.pages;
  const titles = pages.map((p) => p.title.toLowerCase());

  // Topical focus: check if titles/h1s share common themes
  const wordFreq = getWordFrequency(titles.join(' '));
  const topWords = Object.entries(wordFreq)
    .filter(([w]) => w.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const hasTopicalFocus = topWords.length > 0 && topWords[0][1] >= 2;

  // Keyword consistency
  const homepage = data.homepage;
  const homepageMeta = homepage?.metaDescription?.toLowerCase() || '';
  const metaKeywords = homepage?.metaKeywords || [];
  const hasKeywords = metaKeywords.length > 0 || homepageMeta.length > 50;

  // Internal linking depth
  const avgInternalLinks = pages.length > 0
    ? pages.reduce((sum, p) => sum + p.internalLinks.length, 0) / pages.length
    : 0;
  const goodLinking = avgInternalLinks >= 3;

  // Content depth (word count)
  const avgWordCount = pages.length > 0
    ? pages.reduce((sum, p) => sum + p.wordCount, 0) / pages.length
    : 0;
  const hasDepth = avgWordCount >= 300;

  return [
    {
      id: 'ta-focus',
      dimension: 'topical-authority',
      category: 'ai',
      label: 'Topical focus consistency',
      verdict: hasTopicalFocus ? 'pass' : siteContext.portalLike ? 'unknown' : 'fail',
      points: hasTopicalFocus ? 7 : 0,
      maxPoints: 7,
      detail: hasTopicalFocus
        ? `Strong topical focus detected around: ${topWords.map(([w]) => w).join(', ')}.`
        : siteContext.portalLike
        ? 'Skipped because the site appears to be a multi-topic portal or documentation hub rather than a single-topic business site.'
        : 'No clear topical focus detected across pages.',
    },
    {
      id: 'ta-keywords',
      dimension: 'topical-authority',
      category: 'ai',
      label: 'Keyword signals',
      verdict: hasKeywords ? 'pass' : 'fail',
      points: hasKeywords ? 6 : 0,
      maxPoints: 6,
      detail: hasKeywords
        ? 'Meta keywords or rich descriptions found.'
        : 'Weak keyword signals — add meta descriptions and keywords.',
    },
    {
      id: 'ta-linking',
      dimension: 'topical-authority',
      category: 'ai',
      label: 'Internal linking structure',
      verdict: goodLinking ? 'pass' : siteContext.limitedCoverage ? 'unknown' : 'fail',
      points: goodLinking ? 4 : 0,
      maxPoints: 4,
      detail: goodLinking
        ? `Good internal linking (avg ${avgInternalLinks.toFixed(1)} links per page).`
        : siteContext.limitedCoverage
        ? 'Skipped because the crawl did not cover enough pages to judge internal linking structure confidently.'
        : `Weak internal linking (avg ${avgInternalLinks.toFixed(1)} links per page). Aim for 3+.`,
    },
    {
      id: 'ta-depth',
      dimension: 'topical-authority',
      category: 'ai',
      label: 'Content depth',
      verdict: hasDepth ? 'pass' : siteContext.limitedCoverage ? 'unknown' : 'fail',
      points: hasDepth ? 3 : 0,
      maxPoints: 3,
      detail: hasDepth
        ? `Good content depth (avg ${Math.round(avgWordCount)} words per page).`
        : siteContext.limitedCoverage
        ? 'Skipped because the crawl did not cover enough pages to judge overall content depth confidently.'
        : `Low content depth (avg ${Math.round(avgWordCount)} words). Aim for 300+ words per page.`,
    },
  ];
}

function getWordFrequency(text: string): Record<string, number> {
  const stopWords = new Set(['the', 'and', 'for', 'are', 'with', 'that', 'this', 'from', 'your', 'have', 'will', 'been', 'more', 'about']);
  const words = text.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return freq;
}
