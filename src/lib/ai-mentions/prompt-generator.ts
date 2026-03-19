import type { CrawlData } from '@/types/crawler';
import type { BusinessProfile, MentionPrompt } from '@/types/ai-mentions';
import { extractSiteContent } from './content-extractor';

const MIN_PROMPTS = 15;
const MAX_PROMPTS = 25;

const SAFE_SOURCES = new Set(['core', 'fallback', 'backfill']);
const KEYWORD_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'your', 'that', 'this', 'what', 'best', 'top', 'about',
  'products', 'product', 'services', 'service', 'company', 'companies', 'business', 'businesses',
  'online', 'today', 'leading', 'available', 'tools', 'tool', 'solutions', 'solution', 'gear',
]);

export function isValidPromptText(text: string): boolean {
  if (text.length < 10 || text.length > 200) return false;
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return false;

  // Leaked legal heading patterns
  if (/\b\d+\.\s+(acceptance|governing|limitation|indemnification|intellectual property|disclaimer)\b/i.test(text)) return false;
  if (/\b(terms of service|terms of use|privacy policy|cookie policy|acceptable use)\b/i.test(text)) return false;

  // CTA / pricing noise
  if (/\b(cancel anytime|best value|sign up|free trial|get started|buy now|add to cart|subscribe now|money back|no credit card|per month|per year|most popular)\b/i.test(text)) return false;

  // Truncated text ending with short word + "?"  (e.g. "...yo?")
  if (/\b\w{1,2}\?$/.test(text)) return false;

  // Measurement/spec text in prompts (raw measurements like 1/4", 3/8", unit patterns)
  if (/\d+[/"']\s*\w/.test(text) || /\d+\s*(?:mm|cm|lbs|oz|ft|in\.?|kg|ml|gal)\b/i.test(text)) return false;

  // Exclamation marks — real prompts don't yell
  if (text.includes('!')) return false;

  // Embedded periods in dynamic content (concatenated fragments like "for noah flegel. made for all.")
  // Strip the template prefix/suffix (text before first dynamic word and after last)
  // Check if the middle content has sentence-ending periods followed by more text
  if (/[a-z]\.\s+[a-z]/i.test(text) && !/\?$/.test(text.trim())) return false;

  // Dynamic part too long (> 80 chars of inserted content suggests a paragraph)
  // Detect by looking for content between known template patterns
  const dynamicMatch = text.match(/(?:best|about|compare|help me|for|offer|integrate with|know about)\s+(.{81,}?)(?:\?|$)/i);
  if (dynamicMatch) return false;

  // Proper name detection (e.g., "for noah flegel" in a non-comparison template)
  if (/\bfor\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text) && !/compare/i.test(text)) return false;

  // Raw product data patterns (set of N, pack of N, dimensions)
  if (/\b(?:set of|pack of)\s+\d+\b/i.test(text)) return false;
  if (/\d+\s*x\s*\d+\s*x\s*\d+/i.test(text)) return false;

  return true;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !KEYWORD_STOPWORDS.has(token));
}

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
  // Analyze homepage + first 3 sub-pages for broader coverage
  const subPages = crawl.pages
    .filter((p) => p !== crawl.homepage)
    .slice(0, 3)
    .map((p) => p.textContent?.slice(0, 1500) || '');

  const text = [
    crawl.homepage?.metaDescription,
    crawl.homepage?.textContent?.slice(0, 2000),
    ...subPages,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Ordered from most specific to least specific
  const industries: [string, string[]][] = [
    ['Marine & Watersports', ['marine', 'boat parts', 'boats', 'boating', 'wakeboard', 'wakeboards', 'watersports', 'water ski', 'water skis', 'wakesurf', 'surfer', 'pontoon', 'outboard', 'marine gear']],
    ['Sports Technology', ['coaching', 'postgame', 'athlete', 'sports analytics', 'player evaluation', 'game film', 'scouting']],
    ['Fitness & Wellness', ['fitness', 'gym', 'workout', 'wellness', 'yoga', 'personal training']],
    ['Legal Technology', ['legal', 'law firm', 'attorney', 'lawyer', 'litigation', 'compliance']],
    ['Construction', ['construction', 'contractor', 'building', 'renovation', 'plumbing', 'hvac']],
    ['Automotive', ['automotive', 'car dealer', 'vehicle', 'auto repair', 'fleet management']],
    ['Travel & Hospitality', ['travel', 'hotel', 'booking', 'tourism', 'hospitality', 'resort']],
    ['HR & Recruiting', ['human resources', 'hr software', 'recruiting', 'hiring', 'talent acquisition']],
    ['Cybersecurity', ['cybersecurity', 'security platform', 'threat detection', 'vulnerability']],
    ['Non-Profit', ['non-profit', 'nonprofit', 'charity', 'foundation', 'donation', 'fundraising']],
    ['Logistics & Supply Chain', ['logistics', 'supply chain', 'shipping', 'warehouse', 'freight']],
    ['Agriculture Technology', ['agriculture', 'farming', 'agritech', 'crop', 'irrigation']],
    ['Energy', ['energy', 'solar', 'renewable', 'utilities', 'oil and gas', 'ev charging']],
    ['Insurance', ['insurance', 'insurtech', 'underwriting', 'claims']],
    ['Media & Entertainment', ['media', 'streaming', 'podcast', 'entertainment', 'broadcasting']],
    ['Manufacturing', ['manufacturing', 'factory', 'production line', 'quality control']],
    ['AI & Machine Learning', ['artificial intelligence', 'machine learning', 'deep learning', 'ai platform', 'llm', 'ai-powered', 'generative ai', 'natural language processing']],
    ['SaaS', ['saas', 'software as a service', 'cloud platform', 'subscription', 'subscription software']],
    ['E-commerce', ['shop', 'store', 'e-commerce', 'ecommerce', 'buy now', 'cart', 'shopify', 'online store']],
    ['Marketing', ['marketing', 'seo', 'advertising', 'content marketing', 'digital marketing', 'social media marketing', 'email marketing']],
    ['Healthcare', ['health', 'medical', 'patient', 'clinical', 'healthcare', 'telehealth', 'ehr']],
    ['Finance', ['finance', 'banking', 'investment', 'fintech', 'payment', 'accounting', 'bookkeeping']],
    ['Education', ['education', 'learning', 'course', 'training', 'tutorial', 'lms', 'e-learning']],
    ['Real Estate', ['real estate', 'property', 'realty', 'housing', 'mortgage', 'listings']],
    ['Restaurant & Food Service', ['restaurant', 'dining', 'food', 'menu', 'chef', 'catering', 'food delivery']],
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

function inferTopic(category: MentionPrompt['category'], industry: string, source?: string): string {
  if (source) {
    switch (source) {
      case 'product': return 'Product Visibility';
      case 'service': return 'Service Visibility';
      case 'feature': return 'Feature Awareness';
      case 'competitor': return 'Competitive Landscape';
      case 'audience': return 'Audience Reach';
      case 'geo': return 'Local Visibility';
      case 'faq': return 'FAQ Coverage';
      case 'blog': return 'Content Visibility';
      case 'use-case': return 'Use-Case Visibility';
      case 'workflow': return 'Workflow Discovery';
      case 'problem': return 'Problem-Solution Fit';
      case 'buyer': return 'Buyer Intent';
      case 'integration': return 'Integration Ecosystem';
      case 'industry-term': return 'Industry Terminology';
    }
  }
  switch (category) {
    case 'direct': return 'Brand Awareness';
    case 'category': return `${industry} Tools`;
    case 'comparison': return 'Competitive Landscape';
    case 'recommendation': return 'Product Recommendations';
    case 'workflow': return 'Workflow Discovery';
    case 'use-case': return 'Use-Case Visibility';
    case 'problem-solution': return 'Problem-Solution Fit';
    case 'buyer-intent': return 'Buyer Intent';
  }
}

function detectSiteModel(text: string): BusinessProfile['siteModel'] {
  if (/\b(shopify|add to cart|cart|online store|buy now|product details|checkout)\b/.test(text)) {
    return 'ecommerce_storefront';
  }
  if (/\b(saas|software as a service|cloud platform|api|dashboard|workspace|automation platform)\b/.test(text)) {
    return 'software_platform';
  }
  if (/\b(contact us|request a quote|book an appointment|our services|service area)\b/.test(text)) {
    return 'service_site';
  }
  if (/\b(blog|article|newsroom|resources)\b/.test(text)) {
    return 'content_site';
  }
  return 'unknown';
}

function detectBusinessType(text: string, siteModel: BusinessProfile['siteModel']): BusinessProfile['businessType'] {
  if (/\bdealer(ship)?\b/.test(text)) return 'dealer';
  if (/\bmanufacturer|factory|fabrication\b/.test(text)) return 'manufacturer';
  if (/\b(platform|software|dashboard|api)\b/.test(text) && siteModel === 'software_platform') return 'software_platform';
  if (/\b(service|consulting|agency|contractor|provider)\b/.test(text)) return 'service_business';
  if (/\bstore|shop|retail|parts|inventory\b/.test(text) && siteModel === 'ecommerce_storefront') return 'retailer';
  if (/\bserving|local|visit our showroom|salt lake city|denver|austin\b/.test(text)) return 'local_business';
  return 'unknown';
}

function detectVertical(industry: string, text: string): BusinessProfile['vertical'] {
  if (industry === 'Marine & Watersports' || /\b(marine|boat|wakeboard|wakesurf|watersports|water ski)\b/.test(text)) {
    return 'marine_watersports';
  }
  if (industry === 'Logistics & Supply Chain' || /\b(logistics|supply chain|freight|warehouse|shipping)\b/.test(text)) {
    return 'logistics_supply_chain';
  }
  if (industry === 'SaaS' || /\b(saas|software|platform|api|automation)\b/.test(text)) {
    return 'saas';
  }
  if (/\b(merchant|store builder|shopping cart|ecommerce platform)\b/.test(text)) {
    return 'ecommerce_platform';
  }
  if (/\b(service area|local|serving|near me)\b/.test(text)) {
    return 'local_service';
  }
  return 'general';
}

function categoryPhrasesForProfile(industry: string, profile: ReturnType<typeof extractSiteContent>): string[] {
  const phrases = [
    ...profile.products.slice(0, 4),
    ...profile.services.slice(0, 3),
    ...profile.industryTerms.slice(0, 3),
  ].filter(Boolean);

  if (phrases.length > 0) return Array.from(new Set(phrases));

  if (industry === 'Marine & Watersports') {
    return ['marine parts', 'boat accessories', 'wakeboards', 'watersports gear'];
  }

  return [`${industry} companies`, `${industry} providers`];
}

export function buildBusinessProfile(crawl: CrawlData): BusinessProfile {
  const brand = inferBusinessName(crawl);
  const industry = inferIndustry(crawl);
  const location = inferLocation(crawl);
  const profile = extractSiteContent(crawl);
  let domain = crawl.url;
  try {
    domain = new URL(crawl.url).hostname.replace(/^www\./, '');
  } catch {
    domain = crawl.url;
  }

  const text = [
    crawl.homepage?.title,
    crawl.homepage?.metaDescription,
    crawl.homepage?.textContent?.slice(0, 5000),
    ...crawl.pages.slice(0, 4).map((page) => page.textContent?.slice(0, 2000) || ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const siteModel = detectSiteModel(text);
  const businessType = detectBusinessType(text, siteModel);
  const vertical = detectVertical(industry, text);
  const categoryPhrases = categoryPhrasesForProfile(industry, profile);
  const similarityKeywords = Array.from(new Set([
    ...tokenize(brand),
    ...tokenize(industry),
    ...tokenize(categoryPhrases.join(' ')),
    ...tokenize(profile.geoAreas.join(' ')),
    ...tokenize(location ?? ''),
  ])).slice(0, 24);

  return {
    brand,
    domain,
    industry,
    location,
    vertical,
    businessType,
    siteModel,
    categoryPhrases,
    productCategories: profile.products.slice(0, 6),
    serviceSignals: profile.services.slice(0, 6),
    geoSignals: (profile.geoAreas.length > 0 ? profile.geoAreas : location ? [location] : []).slice(0, 5),
    similarityKeywords,
    scanCompetitorSeeds: profile.competitors.slice(0, 8),
  };
}

interface PromptBase {
  text: string;
  category: MentionPrompt['category'];
  source: string;
}

function makePrompt(
  base: PromptBase,
  id: string,
  industry: string,
  location: string | undefined,
  brand: string,
): MentionPrompt {
  return {
    id,
    text: base.text,
    category: base.category,
    industry,
    location,
    brand,
    topic: inferTopic(base.category, industry, base.source),
    source: base.source,
  };
}

export function generatePrompts(crawl: CrawlData, businessProfile?: BusinessProfile): MentionPrompt[] {
  const resolvedProfile = businessProfile ?? buildBusinessProfile(crawl);
  const businessName = resolvedProfile.brand;
  const industry = resolvedProfile.industry;
  const location = resolvedProfile.location;
  const profile = extractSiteContent(crawl);
  const year = new Date().getFullYear();
  const isMarineRetail = resolvedProfile.vertical === 'marine_watersports';

  // --- Tier builders (each returns array of PromptBase) ---

  // Core brand (always 2)
  const core: PromptBase[] = [
    { text: `Tell me about ${businessName}`, category: 'direct', source: 'core' },
    { text: `What does ${businessName} do?`, category: 'direct', source: 'core' },
  ];

  // FAQ-derived (0-2)
  const faqPrompts: PromptBase[] = [];
  for (const faq of profile.faqQueries.slice(0, 2)) {
    faqPrompts.push({
      text: faq,
      category: 'recommendation',
      source: 'faq',
    });
  }

  // Product/service (0-3)
  const productService: PromptBase[] = [];
  for (const item of profile.products.slice(0, 2)) {
    productService.push({
      text: isMarineRetail
        ? `Where should I buy ${item.toLowerCase()}${location ? ` in ${location}` : ''}?`
        : `What is the best ${item.toLowerCase()} tool?`,
      category: isMarineRetail ? 'buyer-intent' : 'recommendation',
      source: 'product',
    });
  }
  for (const item of profile.services.slice(0, 1)) {
    productService.push({
      text: isMarineRetail
        ? `Who offers the best ${item.toLowerCase()}${location ? ` in ${location}` : ''}?`
        : `Who provides the best ${item.toLowerCase()} services?`,
      category: 'recommendation',
      source: 'service',
    });
  }

  // Use-case prompts (0-3)
  const useCasePrompts: PromptBase[] = [];
  for (const uc of profile.useCases.slice(0, 3)) {
    useCasePrompts.push({
      text: `What tools can help me ${uc.toLowerCase()}?`,
      category: 'use-case',
      source: 'use-case',
    });
  }

  // Competitor (0-2)
  const competitorPrompts: PromptBase[] = [];
  for (const comp of resolvedProfile.scanCompetitorSeeds.slice(0, 2)) {
    competitorPrompts.push({
      text: `How does ${businessName} compare to ${comp}?`,
      category: 'comparison',
      source: 'competitor',
    });
  }

  if (resolvedProfile.vertical === 'marine_watersports') {
    competitorPrompts.push(
      {
        text: `Which marine parts stores are best${location ? ` in ${location}` : ''}?`,
        category: 'comparison',
        source: 'competitor',
      },
      {
        text: `What are the top wakeboard and watersports retailers${location ? ` near ${location}` : ''}?`,
        category: 'comparison',
        source: 'competitor',
      },
      {
        text: `Compare boating gear dealers${location ? ` in ${location}` : ''}`,
        category: 'comparison',
        source: 'competitor',
      }
    );
  }

  // Problem-solution prompts (0-2)
  const problemPrompts: PromptBase[] = [];
  for (const problem of profile.problemStatements.slice(0, 2)) {
    problemPrompts.push({
      text: `How can I ${problem.toLowerCase()}?`,
      category: 'problem-solution',
      source: 'problem',
    });
  }

  // Feature comparison (0-2)
  const featurePrompts: PromptBase[] = [];
  for (const feature of profile.features.slice(0, 2)) {
    featurePrompts.push({
      text: `Which ${industry.toLowerCase()} tools offer ${feature.toLowerCase()}?`,
      category: 'comparison',
      source: 'feature',
    });
  }

  // Workflow prompts (0-2)
  const workflowPrompts: PromptBase[] = [];
  for (const cap of profile.actionCapabilities.slice(0, 2)) {
    workflowPrompts.push({
      text: `What is the best way to ${cap.toLowerCase()} for ${industry.toLowerCase()}?`,
      category: 'workflow',
      source: 'workflow',
    });
  }

  // Audience prompts (0-2)
  const audiencePrompts: PromptBase[] = [];
  for (const audience of profile.targetAudience.slice(0, 1)) {
    audiencePrompts.push({
      text: `Best ${industry.toLowerCase()} solutions for ${audience.toLowerCase()}?`,
      category: 'recommendation',
      source: 'audience',
    });
  }
  for (const usp of profile.usps.slice(0, 1)) {
    audiencePrompts.push({
      text: `What ${industry.toLowerCase()} companies are known for ${usp.toLowerCase().slice(0, 60)}?`,
      category: 'category',
      source: 'audience',
    });
  }

  // Buyer-intent prompts (0-2)
  const buyerPrompts: PromptBase[] = [];
  if (profile.products.length > 0 && profile.targetAudience.length > 0) {
    buyerPrompts.push({
      text: `Best ${profile.products[0].toLowerCase()} for ${profile.targetAudience[0].toLowerCase()}`,
      category: 'buyer-intent',
      source: 'buyer',
    });
  }
  if (profile.useCases.length > 0) {
    buyerPrompts.push({
      text: isMarineRetail
        ? `I need help to ${profile.useCases[0].toLowerCase()}, which boating retailers should I consider?`
        : `I need software that can ${profile.useCases[0].toLowerCase()}, what should I use?`,
      category: 'buyer-intent',
      source: 'buyer',
    });
  }

  // Local/geo (0-2)
  const geoPrompts: PromptBase[] = [];
  const geoAreas = profile.geoAreas.length > 0 ? profile.geoAreas : (location ? [location] : []);
  for (const area of geoAreas.slice(0, 2)) {
    geoPrompts.push({
      text: resolvedProfile.vertical === 'marine_watersports'
        ? `Best marine and watersports dealers in ${area}`
        : `Best ${industry.toLowerCase()} companies in ${area}`,
      category: 'category',
      source: 'geo',
    });
  }

  // Integration prompts (0-1)
  const integrationPrompts: PromptBase[] = [];
  if (profile.integrations.length > 0) {
    integrationPrompts.push({
      text: `Which ${industry.toLowerCase()} tools integrate with ${profile.integrations[0]}?`,
      category: 'recommendation',
      source: 'integration',
    });
  }

  // Industry-term prompts (0-2)
  const industryTermPrompts: PromptBase[] = [];
  for (const term of profile.industryTerms.slice(0, 2)) {
    industryTermPrompts.push({
      text: `What are the best ${term.toLowerCase()} tools available today?`,
      category: 'category',
      source: 'industry-term',
    });
  }

  // Blog long-tail (0-1)
  const blogPrompts: PromptBase[] = [];
  if (profile.blogTopics.length > 0) {
    blogPrompts.push({
      text: `What should I know about ${profile.blogTopics[0].toLowerCase()}?`,
      category: 'recommendation',
      source: 'blog',
    });
  }

  // Fallback category (always 1)
  const fallback: PromptBase[] = [
    {
      text: resolvedProfile.vertical === 'marine_watersports'
        ? `What are the best marine parts and watersports retailers${location ? ` in ${location}` : ''}?`
        : `What are the best ${industry} companies${location ? ` in ${location}` : ''}?`,
      category: 'category',
      source: 'fallback',
    },
  ];

  // --- Assemble in priority order ---
  // core > FAQ > product > use-case > competitor > problem > feature > workflow > audience > buyer > geo > integration > industry-term > blog > fallback
  const ordered: PromptBase[] = [
    ...core,
    ...faqPrompts,
    ...productService,
    ...useCasePrompts,
    ...competitorPrompts,
    ...problemPrompts,
    ...featurePrompts,
    ...workflowPrompts,
    ...audiencePrompts,
    ...buyerPrompts,
    ...geoPrompts,
    ...integrationPrompts,
    ...industryTermPrompts,
    ...blogPrompts,
    ...fallback,
  ];

  // Cap at MAX_PROMPTS
  let selected = ordered.slice(0, MAX_PROMPTS);

  // Filter out junk content-derived prompts (keep safe templates)
  selected = selected.filter(
    (p) => SAFE_SOURCES.has(p.source) || isValidPromptText(p.text)
  );

  // Backfill if below MIN_PROMPTS with intent-driven templates
  const ind = industry.toLowerCase();
  const categoryPhrase = resolvedProfile.categoryPhrases[0]?.toLowerCase() ?? ind;
  const genericBackfill: PromptBase[] = [
    resolvedProfile.vertical === 'marine_watersports'
      ? { text: `Who do boat owners trust for ${categoryPhrase}${location ? ` in ${location}` : ''}?`, category: 'recommendation', source: 'backfill' }
      : { text: `What ${ind} software do professionals recommend in ${year}?`, category: 'recommendation', source: 'backfill' },
    resolvedProfile.vertical === 'marine_watersports'
      ? { text: `Compare the top boating and watersports retailers${location ? ` in ${location}` : ''}`, category: 'comparison', source: 'backfill' }
      : { text: `How to choose the right ${ind} platform for my business`, category: 'recommendation', source: 'backfill' },
    resolvedProfile.vertical === 'marine_watersports'
      ? { text: `Where should I buy marine parts and wakeboards${location ? ` near ${location}` : ''}?`, category: 'buyer-intent', source: 'backfill' }
      : { text: `What problems does ${ind} software typically solve?`, category: 'recommendation', source: 'backfill' },
    { text: `Compare the leading ${resolvedProfile.vertical === 'marine_watersports' ? 'marine retail' : ind} solutions`, category: 'comparison', source: 'backfill' },
    { text: `What should I look for when evaluating ${resolvedProfile.vertical === 'marine_watersports' ? 'marine and watersports dealers' : `${ind} tools`}?`, category: 'recommendation', source: 'backfill' },
    { text: `Which ${resolvedProfile.vertical === 'marine_watersports' ? 'boating retailers' : `${ind} platforms`} are growing fastest right now?`, category: 'category', source: 'backfill' },
    { text: `What are the newest ${resolvedProfile.vertical === 'marine_watersports' ? 'marine gear retailers' : `${ind} tools`} for ${year}?`, category: 'category', source: 'backfill' },
    { text: `Best ${resolvedProfile.vertical === 'marine_watersports' ? 'watersports shops' : `${ind} tools`} for small and mid-size teams`, category: 'recommendation', source: 'backfill' },
    { text: `What ${resolvedProfile.vertical === 'marine_watersports' ? 'boating retailers' : `${ind} automation tools`} save the most time?`, category: 'recommendation', source: 'backfill' },
    { text: `How is AI changing the ${resolvedProfile.vertical === 'marine_watersports' ? 'marine retail' : ind} industry?`, category: 'category', source: 'backfill' },
  ];

  if (selected.length < MIN_PROMPTS) {
    const existing = new Set(selected.map((p) => p.text));
    for (const backfill of genericBackfill) {
      if (selected.length >= MIN_PROMPTS) break;
      if (!existing.has(backfill.text)) {
        selected.push(backfill);
        existing.add(backfill.text);
      }
    }
  }

  // Deduplicate by text
  const seen = new Set<string>();
  selected = selected.filter((p) => {
    if (seen.has(p.text)) return false;
    seen.add(p.text);
    return true;
  });

  // Convert to MentionPrompt[]
  return selected.map((base, i) =>
    makePrompt(base, `prompt-${i + 1}`, industry, location, businessName)
  );
}

export { inferBusinessName, inferIndustry, inferLocation, inferTopic };
