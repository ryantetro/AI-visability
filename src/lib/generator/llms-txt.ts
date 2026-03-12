import { CrawlData } from '@/types/crawler';
import { getAI } from '@/lib/services/registry';
import { isLikelyPublicPage } from '@/lib/url-utils';

export async function generateLlmsTxt(data: CrawlData): Promise<string> {
  const ai = getAI();
  const homepage = data.homepage;

  const pages = data.pages
    .filter((p) => p.classification !== 'homepage' && isLikelyPublicPage(p.url))
    .map((p) => ({
      url: p.url,
      title: p.title || new URL(p.url).pathname,
      description: p.metaDescription || p.h1s[0] || '',
    }));

  return ai.generateLlmsTxt({
    url: data.url,
    title: homepage?.title || new URL(data.url).hostname,
    description: homepage?.metaDescription || homepage?.h1s[0] || 'No description available.',
    pages,
  });
}
