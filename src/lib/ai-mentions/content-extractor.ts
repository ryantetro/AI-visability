import type { CrawlData, CrawledPage } from '@/types/crawler';
import type { SiteContentProfile } from '@/types/ai-mentions';

const SOCIAL_CDN_DOMAINS = [
  'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com',
  'youtube.com', 'tiktok.com', 'pinterest.com', 'github.com',
  'google.com', 'googleapis.com', 'gstatic.com', 'googletagmanager.com',
  'google-analytics.com', 'doubleclick.net', 'cloudflare.com',
  'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
  'fonts.googleapis.com', 'wp.com', 'gravatar.com',
  'schema.org', 'w3.org', 'apple.com',
];

const VENDOR_APP_DOMAINS = [
  'shopify.com', 'myshopify.com', 'shopifycdn.com', 'shopifysvc.com', 'klaviyo.com', 'mailchimp.com',
  'chimpstatic.com', 'hulkapps.com', 'wisepops.com', 'adoric.com', 'getredo.com', 'doofinder.com',
  'zooomyapps.com', 'luckyorange.com', 'nfcube.com',
];

const STOREFRONT_UI_PATTERN = /\b(your cart|shopping cart|cart subtotal|view cart|mini cart|cart drawer|quick view|add to wishlist|my account|account login|sign in|log in|proceed to checkout|continue shopping|track order|product details|compare products|recently viewed|you may also like|customers also bought|related products|write a review|customer reviews|shipping & returns|shipping and returns|sort by|filter by|in stock|out of stock|sku|quantity)\b/i;
const STOREFRONT_SINGLE_PHRASE_PATTERN = /^(your|my|our)\s+(cart|account|wishlist|checkout|order|bag)$/i;

function unique(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function isJunk(s: string): boolean {
  const t = s.trim().toLowerCase();

  // Very short phrases (stray fragments)
  if (t.length < 4) return true;

  // Numbered legal headings (e.g. "1. acceptance of terms", "12. governing law")
  if (/^\d+\.\s+/.test(t)) return true;

  // ToS / privacy policy terms
  if (/\b(terms of service|terms of use|privacy policy|cookie policy|acceptable use|governing law|limitation of liability|indemnification|intellectual property rights|disclaimer of warranties)\b/.test(t)) return true;

  // CTA / pricing noise
  if (/\b(cancel anytime|best value|sign up|free trial|get started|buy now|add to cart|subscribe now|money back|no credit card|per month|per year|\/mo|\/yr|most popular)\b/.test(t)) return true;

  // E-commerce UI patterns
  if (/\b(frequently bought together|add to wishlist|compare products|recently viewed|you may also like|customers also bought|related products|product details|write a review|customer reviews|shipping & returns|shipping and returns)\b/.test(t)) return true;
  if (STOREFRONT_UI_PATTERN.test(t) || STOREFRONT_SINGLE_PHRASE_PATTERN.test(t)) return true;

  // Storefront fragments and personalized UI copy
  if (/^(your|my|our)\b/.test(t) && t.length < 40) return true;
  if (/\b(welcome back|shop now|continue shopping|view details|add item|remove item)\b/.test(t)) return true;

  // Social/navigation CTAs
  if (/^(follow us|contact us|learn more|read more|see more|view all|show more|load more|back to top|share this|subscribe|newsletter)$/i.test(t)) return true;
  if (/\b(follow us|contact us|learn more|read more|see more|view all|show more|load more|back to top|share this)\b/.test(t) && t.length < 30) return true;

  // Personalization fragments — "tailored/personalized for <name>"
  if (/\b(?:tailored for|personalized for|customized for)\s+\w/i.test(t)) return true;

  // Measurement/spec-heavy text: if >30% of text is numbers/measurements/units, reject
  const measureChars = (t.match(/[\d\/]+["']+|\d+\s*(?:mm|cm|lbs|oz|ft|in\.?|kg|ml|gal|qt|pt)\b/gi) || []).join('').length;
  if (t.length > 0 && measureChars / t.length > 0.3) return true;

  // Exclamation marks (product warnings/alerts)
  if (t.includes('!')) return true;

  // Trailing period on short text (sentence fragments like "made for all.")
  if (t.endsWith('.') && t.length < 40) return true;

  return false;
}

export function looksLikeFragment(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return true;

  // Starts mid-sentence (lowercase first letter, not a question/action word)
  const actionStarts = /^(what|how|why|when|where|who|can|do|does|is|are|will|should|which|best|top|compare|tell|help|find|get|show|list)\b/i;
  if (/^[a-z]/.test(t) && !actionStarts.test(t)) return true;

  // Ends with comma, conjunction, or preposition (truncated)
  if (/[,]\s*$/.test(t)) return true;
  if (/\b(and|or|but|for|with|to|in|of|the|a|an)\s*$/i.test(t)) return true;

  // Contains raw HTML artifacts or encoding
  if (/&amp;|&#\d+;|&[a-z]+;|<\/?[a-z]/i.test(t)) return true;

  return false;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function headingsAtLevel(page: CrawledPage, levels: number[]): string[] {
  return page.headings
    .filter((h) => levels.includes(h.level))
    .map((h) => clean(h.text))
    .filter((t) => t.length > 2 && t.length < 120);
}

function pagesByClassification(crawl: CrawlData, cls: string): CrawledPage[] {
  return crawl.pages.filter((p) => p.classification === cls);
}

function getSchemasByType(crawl: CrawlData, type: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  for (const page of crawl.pages) {
    for (const schema of page.schemaObjects) {
      if (schema.type.toLowerCase() === type.toLowerCase()) {
        results.push(schema.raw);
      }
    }
  }
  return results;
}

export function extractProducts(crawl: CrawlData): string[] {
  const products: string[] = [];

  // JSON-LD Product schemas
  for (const schema of getSchemasByType(crawl, 'Product')) {
    const name = schema.name as string | undefined;
    if (name && typeof name === 'string') products.push(clean(name));
  }

  // H2/H3 headings on service-classified pages
  for (const page of pagesByClassification(crawl, 'service')) {
    products.push(...headingsAtLevel(page, [2, 3]).filter((h) => !isJunk(h)));
  }

  return unique(products).filter((p) => wordCount(p) >= 2).slice(0, 10);
}

export function extractServices(crawl: CrawlData): string[] {
  const services: string[] = [];

  // H2s on service pages (filtered like products)
  for (const page of pagesByClassification(crawl, 'service')) {
    services.push(...headingsAtLevel(page, [2]).filter((h) => !isJunk(h) && wordCount(h) >= 2));
  }

  // Homepage sections with offer/provide patterns
  if (crawl.homepage) {
    const text = crawl.homepage.textContent?.slice(0, 5000) || '';
    const patterns = [
      /we (?:offer|provide|deliver|specialize in)\s+([^.]{5,60})/gi,
      /our\s+([^.]{5,40})\s+service/gi,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        services.push(clean(match[1]));
      }
    }
  }

  return unique(services).slice(0, 8);
}

export function extractFeatures(crawl: CrawlData): string[] {
  const features: string[] = [];
  const featurePattern = /feature|capability|benefit|advantage|function/i;

  for (const page of crawl.pages) {
    if (page.classification === 'service' || page.classification === 'homepage') {
      for (const h of page.headings) {
        if (h.level === 3 && featurePattern.test(h.text)) {
          features.push(clean(h.text));
        }
      }
    }
  }

  // Also look at H3s on service pages that aren't explicitly "feature" titled
  for (const page of pagesByClassification(crawl, 'service')) {
    features.push(...headingsAtLevel(page, [3]).filter((h) => !isJunk(h) && wordCount(h) >= 2));
  }

  return unique(features).filter((f) => wordCount(f) >= 2).slice(0, 8);
}

export function extractCompetitors(crawl: CrawlData): string[] {
  const competitors: string[] = [];
  const ownDomain = getDomain(crawl.url);

  // External links (filter out social/CDN/analytics)
  for (const page of crawl.pages) {
    for (const link of page.externalLinks) {
      const domain = getDomain(link);
      if (!domain || domain === ownDomain) continue;
      if (SOCIAL_CDN_DOMAINS.some((d) => domain.endsWith(d))) continue;
      if (VENDOR_APP_DOMAINS.some((d) => domain.endsWith(d))) continue;
      if (domain.includes('shopify') || domain.includes('analytics') || domain.includes('widget')) continue;
      // Extract the brand-ish name from domain
      const name = domain.replace(/^www\./, '').split('.')[0];
      if (name.length > 2 && name.length < 30) {
        competitors.push(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  }

  // Scan for "vs"/"alternative" patterns in text
  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 5000) || '';
    const vsPattern = /\bvs\.?\s+([A-Z][\w]+(?:\s+[\w]+)?)/g;
    const altPattern = /alternative(?:s)?\s+to\s+([A-Z][\w]+(?:\s+[\w]+)?)/gi;
    for (const pattern of [vsPattern, altPattern]) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        competitors.push(clean(match[1]));
      }
    }
  }

  return unique(competitors).slice(0, 8);
}

export function extractUSPs(crawl: CrawlData): string[] {
  const usps: string[] = [];

  if (crawl.homepage) {
    // H1/H2 headings
    const headings = headingsAtLevel(crawl.homepage, [1, 2]);
    const superlativePattern = /(?:the only|#1|number one|\bleading\b|\bbest-in-class\b|\baward-winning\b|\bfastest\b|\bmost trusted\b|\btop-rated\b|\bfirst\b)/i;
    for (const h of headings) {
      if (superlativePattern.test(h)) usps.push(h);
    }

    // Meta description
    const meta = crawl.homepage.metaDescription || '';
    if (superlativePattern.test(meta)) usps.push(clean(meta));
  }

  // JSON-LD Organization description
  for (const schema of getSchemasByType(crawl, 'Organization')) {
    const desc = schema.description as string | undefined;
    if (desc && typeof desc === 'string') usps.push(clean(desc).slice(0, 100));
  }

  return unique(usps).slice(0, 5);
}

export function extractTargetAudience(crawl: CrawlData): string[] {
  const audiences: string[] = [];
  const genericPattern = /\bfor\s+(small businesses|enterprises?|startups|developers?|marketers?|teams|agencies|freelancers?|creators?|educators?|students?|professionals?|businesses)\b/gi;

  const broadPatterns = [
    /(?:designed for|built for|ideal for|perfect for|created for)\s+(.{3,50}?)(?:\.|,|!|\band\b|$)/gi,
    /(?:trusted by|used by|loved by|chosen by)\s+(.{3,80}?)(?:\.|,|!|\band\b|$)/gi,
  ];

  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 5000) || '';
    let match;
    while ((match = genericPattern.exec(text)) !== null) {
      const val = clean(match[1]);
      if (!isJunk(val)) audiences.push(val);
    }
    for (const pattern of broadPatterns) {
      while ((match = pattern.exec(text)) !== null) {
        const value = clean(match[1]);
        // Filter out overly generic single-word matches and junk
        if ((value.split(/\s+/).length >= 2 || value.length >= 5) && !isJunk(value)) {
          audiences.push(value);
        }
      }
    }
  }

  return unique(audiences).slice(0, 8);
}

export function extractGeoAreas(crawl: CrawlData): string[] {
  const areas: string[] = [];

  // JSON-LD address
  for (const schema of getSchemasByType(crawl, 'LocalBusiness')) {
    const addr = schema.address as Record<string, unknown> | undefined;
    if (addr) {
      const city = addr.addressLocality as string;
      const state = addr.addressRegion as string;
      if (city) areas.push(clean(city));
      if (state) areas.push(clean(state));
    }
  }

  // City patterns across all pages
  const cityPatterns = [
    /\bin\s+([\w\s]+),\s*([A-Z]{2})\b/g,
    /\b(Denver|Austin|New York|San Francisco|Chicago|Los Angeles|Seattle|Boston|Miami|Atlanta|Portland|Nashville|Dallas|Houston|Phoenix|Philadelphia|San Diego|San Jose|Charlotte|Minneapolis|Tampa|Orlando|Sacramento|Pittsburgh|St\.? Louis|Kansas City|Salt Lake City|Raleigh|Cleveland|Cincinnati|Milwaukee|Indianapolis|Columbus|Virginia Beach|Las Vegas|Memphis|Louisville|Baltimore|Oklahoma City|Tucson|Albuquerque|Fresno|Mesa|Omaha|Colorado Springs|Long Beach|Reno|Boise|Richmond|Des Moines|Birmingham|Spokane|Rochester|Modesto|Fayetteville|Tacoma|Oxnard|Fontana|Moreno Valley|Glendale|Huntington Beach|Amarillo|Little Rock|Grand Rapids|Salt Lake|Knoxville|Newport News|Brownsville|Chattanooga|Tempe|Providence|Honolulu|Overland Park|Garden Grove|Oceanside|Rancho Cucamonga|Santa Clarita|Ontario|Vancouver|Toronto|Montreal|London|Manchester|Berlin|Munich|Paris|Sydney|Melbourne|Auckland)\b/gi,
  ];

  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 5000) || '';
    for (const pattern of cityPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        areas.push(clean(match[1] || match[0]));
      }
    }
  }

  return unique(areas).slice(0, 5);
}

export function extractPricingTiers(crawl: CrawlData): string[] {
  const tiers: string[] = [];
  const tierPattern = /\b(free|basic|starter|pro|professional|premium|enterprise|business|team|growth|unlimited|plus|standard)\b/i;

  for (const page of crawl.pages) {
    // Check if page URL or title suggests pricing
    const isPricing = /pricing|plans|packages/i.test(page.url + ' ' + page.title);
    if (!isPricing) continue;

    for (const h of page.headings) {
      if ((h.level === 2 || h.level === 3) && tierPattern.test(h.text)) {
        tiers.push(clean(h.text));
      }
    }
  }

  return unique(tiers).slice(0, 5);
}

export function extractFAQQueries(crawl: CrawlData): string[] {
  const faqs: string[] = [];

  // JSON-LD FAQPage
  for (const schema of getSchemasByType(crawl, 'FAQPage')) {
    const mainEntity = schema.mainEntity as Array<{ name?: string }> | undefined;
    if (Array.isArray(mainEntity)) {
      for (const item of mainEntity) {
        if (item.name && typeof item.name === 'string') faqs.push(clean(item.name));
      }
    }
  }

  // FAQ page headings that look like questions
  for (const page of pagesByClassification(crawl, 'faq')) {
    for (const h of page.headings) {
      if (h.text.includes('?') || /^(what|how|why|when|where|who|can|do|does|is|are|will|should)\b/i.test(h.text)) {
        faqs.push(clean(h.text));
      }
    }
  }

  return unique(faqs).slice(0, 8);
}

export function extractBlogTopics(crawl: CrawlData): string[] {
  const topics: string[] = [];

  // JSON-LD Article (require >= 3 words for generic headlines)
  for (const schema of getSchemasByType(crawl, 'Article')) {
    const headline = schema.headline as string | undefined;
    if (headline && typeof headline === 'string') {
      const cleaned = clean(headline);
      if (!isJunk(cleaned) && wordCount(cleaned) >= 3) topics.push(cleaned);
    }
  }

  // Blog-classified page titles and H1s (require >= 2 words)
  for (const page of pagesByClassification(crawl, 'blog')) {
    if (page.title) {
      const cleaned = clean(page.title.split(/[|\-–—]/)[0].trim());
      if (!isJunk(cleaned) && wordCount(cleaned) >= 2) topics.push(cleaned);
    }
    topics.push(...headingsAtLevel(page, [1]).filter((h) => !isJunk(h) && wordCount(h) >= 2));
  }

  return unique(topics).slice(0, 8);
}

export function extractUseCases(crawl: CrawlData): string[] {
  const useCases: string[] = [];

  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 8000) || '';

    const patterns = [
      /helps?\s+(?:you|teams?|coaches?|users?|businesses?|companies?|organizations?)\s+([^.]{5,80})/gi,
      /(?:designed|built|made)\s+(?:for|to)\s+([^.]{5,80})/gi,
      /(?:enables?|allows?|lets?)\s+(?:you|teams?|users?)\s+to?\s*([^.]{5,80})/gi,
      /use\s+\w+\s+to\s+([^.]{5,80})/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const val = clean(match[1]);
        if (!isJunk(val) && wordCount(val) >= 3 && val.length <= 70) {
          useCases.push(val);
        }
      }
    }
  }

  // H2/H3 headings with action verbs on homepage/service pages
  const actionVerbs = /\b(automate|generate|track|analyze|create|export|share|monitor|streamline|convert|manage|schedule|optimize|collaborate)\b/i;
  for (const page of crawl.pages) {
    if (page.classification === 'homepage' || page.classification === 'service') {
      for (const h of page.headings) {
        if ((h.level === 2 || h.level === 3) && actionVerbs.test(h.text)) {
          const val = clean(h.text);
          if (!isJunk(val) && wordCount(val) >= 2) {
            useCases.push(val);
          }
        }
      }
    }
  }

  return unique(useCases).slice(0, 8);
}

export function extractProblemStatements(crawl: CrawlData): string[] {
  const problems: string[] = [];

  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 8000) || '';

    const patterns = [
      /(?:tired of|struggling with|frustrated by|no more|instead of)\s+([^.]{5,80})/gi,
      /(?:eliminat|reduc|sav|solv|fix|prevent|avoid)\w*\s+([^.]{5,80})/gi,
      /(?:without|stop)\s+(\w+ing[^.]{3,60})/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const val = clean(match[1]);
        if (!isJunk(val) && wordCount(val) >= 3 && !/^\w+ing\b/.test(val)) {
          problems.push(val);
        }
      }
    }
  }

  return unique(problems).slice(0, 6);
}

export function extractIntegrations(crawl: CrawlData): string[] {
  const integrations: string[] = [];

  const knownPlatforms = [
    'Slack', 'Zapier', 'Google Sheets', 'Salesforce', 'HubSpot', 'Stripe',
    'Zoom', 'Microsoft Teams', 'Notion', 'Asana', 'Trello', 'Jira',
    'Shopify', 'Mailchimp', 'Intercom', 'Zendesk', 'Twilio', 'Airtable',
    'Figma', 'GitHub', 'GitLab', 'Confluence', 'Monday.com', 'Basecamp',
    'QuickBooks', 'Xero', 'Calendly', 'Dropbox', 'OneDrive',
  ];

  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 8000) || '';

    // Pattern-based extraction
    const patterns = [
      /integrat\w+\s+with\s+([A-Z][\w\s.]+?)(?:\.|,|and\b)/gi,
      /works?\s+with\s+([A-Z][\w\s.]+?)(?:\.|,|and\b)/gi,
      /connects?\s+to\s+([A-Z][\w\s.]+?)(?:\.|,|and\b)/gi,
      /syncs?\s+with\s+([A-Z][\w\s.]+?)(?:\.|,|and\b)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        integrations.push(clean(match[1]));
      }
    }

    // Known platform scanning
    const textLower = text.toLowerCase();
    for (const platform of knownPlatforms) {
      if (textLower.includes(platform.toLowerCase())) {
        integrations.push(platform);
      }
    }
  }

  return unique(integrations).slice(0, 6);
}

export function extractActionCapabilities(crawl: CrawlData): string[] {
  const capabilities: string[] = [];
  const actionPattern = /\b(automate|generate|track|analyze|create|export|share|schedule|monitor|optimize|streamline|customize|collaborate)\s+([\w\s]{2,40}?)(?:\.|,|;|\band\b|$)/gi;
  const measurementPattern = /\d+[/"']|\b\d+\s*(?:mm|cm|lbs|oz|ft|in|kg)\b/;

  for (const page of crawl.pages) {
    const text = page.textContent?.slice(0, 8000) || '';
    let match;
    while ((match = actionPattern.exec(text)) !== null) {
      const phrase = clean(`${match[1]} ${match[2]}`);
      const words = phrase.split(/\s+/);
      if (words.length >= 2 && words.length <= 6 && !isJunk(phrase) && !measurementPattern.test(phrase)) {
        capabilities.push(phrase);
      }
    }
  }

  return unique(capabilities).slice(0, 8);
}

export function extractIndustryTerms(crawl: CrawlData): string[] {
  const terms: string[] = [];
  const navCtaVerbs = /^(follow|contact|learn|view|show|read|see|load|share|subscribe|back)\b/i;

  // Meta keywords
  for (const page of crawl.pages) {
    if (page.metaKeywords.length > 0) {
      terms.push(...page.metaKeywords.map((k) => clean(k)).filter((k) => k.includes(' ') && !isJunk(k)));
    }
  }

  // Multi-word heading phrases (2-4 words) from across all pages
  for (const page of crawl.pages) {
    for (const h of page.headings) {
      const text = clean(h.text);
      const words = text.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && text.length < 50 && !isJunk(text) && !navCtaVerbs.test(text)) {
        terms.push(text.toLowerCase());
      }
    }
  }

  return unique(terms).slice(0, 10);
}

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function extractSiteContent(crawl: CrawlData): SiteContentProfile {
  return {
    products: extractProducts(crawl),
    services: extractServices(crawl),
    features: extractFeatures(crawl),
    usps: extractUSPs(crawl),
    competitors: extractCompetitors(crawl),
    targetAudience: extractTargetAudience(crawl),
    geoAreas: extractGeoAreas(crawl),
    pricingTiers: extractPricingTiers(crawl),
    faqQueries: extractFAQQueries(crawl),
    industryTerms: extractIndustryTerms(crawl),
    blogTopics: extractBlogTopics(crawl),
    useCases: extractUseCases(crawl),
    problemStatements: extractProblemStatements(crawl),
    integrations: extractIntegrations(crawl),
    actionCapabilities: extractActionCapabilities(crawl),
  };
}
