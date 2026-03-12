export type SitePlatform = 'wordpress' | 'squarespace' | 'webflow' | 'custom';

export interface CrawledPage {
  url: string;
  title: string;
  h1s: string[];
  metaDescription: string;
  metaKeywords: string[];
  ogTags: Record<string, string>;
  schemaObjects: SchemaObject[];
  internalLinks: string[];
  externalLinks: string[];
  textContent: string;
  wordCount: number;
  lastModified?: string;
  statusCode: number;
  loadTimeMs: number;
  classification: PageClassification;
  detectedPlatform?: SitePlatform;
}

export type PageClassification =
  | 'homepage'
  | 'about'
  | 'contact'
  | 'service'
  | 'blog'
  | 'faq'
  | 'other';

export interface SchemaObject {
  type: string;
  raw: Record<string, unknown>;
}

export interface RobotsTxtData {
  exists: boolean;
  raw: string;
  allowsGPTBot: boolean;
  allowsPerplexityBot: boolean;
  allowsClaudeBot: boolean;
  allowsGoogleBot: boolean;
  sitemapReferences: string[];
}

export interface SitemapData {
  exists: boolean;
  urls: string[];
  urlCount: number;
  referencedInRobots: boolean;
}

export interface LlmsTxtData {
  exists: boolean;
  raw: string;
  title?: string;
  description?: string;
  sections: LlmsTxtSection[];
  links: LlmsTxtLink[];
}

export interface LlmsTxtSection {
  heading: string;
  content: string;
}

export interface LlmsTxtLink {
  url: string;
  title: string;
  description?: string;
}

export interface CrawlData {
  url: string;
  normalizedUrl: string;
  detectedPlatform: SitePlatform;
  robotsTxt: RobotsTxtData;
  sitemap: SitemapData;
  llmsTxt: LlmsTxtData;
  pages: CrawledPage[];
  homepage: CrawledPage | null;
  crawledAt: number;
  durationMs: number;
  errors: string[];
}
