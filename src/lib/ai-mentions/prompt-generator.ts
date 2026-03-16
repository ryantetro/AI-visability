import type { CrawlData } from '@/types/crawler';
import type { MentionPrompt } from '@/types/ai-mentions';

function inferBusinessName(crawl: CrawlData): string {
  const hp = crawl.homepage;
  if (hp?.ogTags?.['og:site_name']) return hp.ogTags['og:site_name'];
  if (hp?.title) {
    const cleaned = hp.title.split(/[|\-–—]/)[0].trim();
    if (cleaned.length > 1 && cleaned.length < 60) return cleaned;
  }
  try {
    return new URL(crawl.url).hostname.replace(/^www\./, '');
  } catch {
    return crawl.url;
  }
}

function inferIndustry(crawl: CrawlData): string {
  const text = [
    crawl.homepage?.metaDescription,
    crawl.homepage?.textContent?.slice(0, 2000),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const industries: [string, string[]][] = [
    ['AI & Machine Learning', ['artificial intelligence', 'machine learning', 'deep learning', 'ai platform', 'llm']],
    ['SaaS', ['saas', 'software as a service', 'cloud platform', 'subscription']],
    ['E-commerce', ['shop', 'store', 'e-commerce', 'ecommerce', 'buy now', 'cart']],
    ['Marketing', ['marketing', 'seo', 'advertising', 'content marketing', 'digital marketing']],
    ['Healthcare', ['health', 'medical', 'patient', 'clinical', 'healthcare']],
    ['Finance', ['finance', 'banking', 'investment', 'fintech', 'payment']],
    ['Education', ['education', 'learning', 'course', 'training', 'tutorial']],
    ['Real Estate', ['real estate', 'property', 'realty', 'housing']],
    ['Restaurant', ['restaurant', 'dining', 'food', 'menu', 'chef']],
  ];

  for (const [industry, keywords] of industries) {
    if (keywords.some((kw) => text.includes(kw))) return industry;
  }
  return 'Technology';
}

function inferLocation(crawl: CrawlData): string | undefined {
  const text = [
    crawl.homepage?.metaDescription,
    crawl.homepage?.textContent?.slice(0, 3000),
  ]
    .filter(Boolean)
    .join(' ');

  const cityPatterns = [
    /\bin\s+([\w\s]+),\s*([A-Z]{2})\b/,
    /\b(Denver|Austin|New York|San Francisco|Chicago|Los Angeles|Seattle|Boston|Miami|Atlanta|Portland|Nashville)\b/i,
  ];

  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match) return match[1]?.trim() || match[0]?.trim();
  }

  return undefined;
}

export function generatePrompts(crawl: CrawlData): MentionPrompt[] {
  const businessName = inferBusinessName(crawl);
  const industry = inferIndustry(crawl);
  const location = inferLocation(crawl);

  const prompts: MentionPrompt[] = [
    {
      id: 'direct-1',
      text: `Tell me about ${businessName}`,
      category: 'direct',
      industry,
      location,
    },
    {
      id: 'direct-2',
      text: `What does ${businessName} do?`,
      category: 'direct',
      industry,
      location,
    },
    {
      id: 'category-1',
      text: `What are the best ${industry} companies${location ? ` in ${location}` : ''}?`,
      category: 'category',
      industry,
      location,
    },
    {
      id: 'category-2',
      text: `Top ${industry} tools and platforms${location ? ` in ${location}` : ''} in 2025`,
      category: 'category',
      industry,
      location,
    },
    {
      id: 'comparison-1',
      text: `Compare the best ${industry} solutions${location ? ` in ${location}` : ''}`,
      category: 'comparison',
      industry,
      location,
    },
    {
      id: 'recommendation-1',
      text: `I need a ${industry.toLowerCase()} tool, what do you recommend?`,
      category: 'recommendation',
      industry,
      location,
    },
  ];

  if (location) {
    prompts.push({
      id: 'category-local',
      text: `Best ${industry.toLowerCase()} services near ${location}`,
      category: 'category',
      industry,
      location,
    });
  }

  return prompts;
}

export { inferBusinessName, inferIndustry, inferLocation };
