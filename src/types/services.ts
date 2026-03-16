import { ScanJob } from './scan';

export interface DatabaseService {
  getScan(id: string): Promise<ScanJob | null>;
  saveScan(scan: ScanJob): Promise<void>;
  findScanByUrl(normalizedUrl: string, maxAgeMs?: number): Promise<ScanJob | null>;
  listCompletedScans(limit?: number): Promise<ScanJob[]>;
  findLatestScanByDomain(domain: string): Promise<ScanJob | null>;
}

export interface CheckoutSession {
  id: string;
  scanId: string;
  amount: number;
  currency: string;
  url: string;
}

export type PaymentPlan = 'lifetime' | 'monthly';

export interface PaymentService {
  createCheckout(scanId: string, plan?: PaymentPlan): Promise<CheckoutSession>;
  verifyPayment(sessionId: string): Promise<{ paid: boolean; scanId: string; plan?: string }>;
}

export interface AIService {
  generateLlmsTxt(context: {
    url: string;
    title: string;
    description: string;
    pages: { url: string; title: string; description: string }[];
  }): Promise<string>;
}

export interface MonitoredPrompt {
  id: string;
  domain: string;
  userId: string;
  promptText: string;
  category: 'brand' | 'competitor' | 'industry' | 'custom';
  industry: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptResult {
  id: string;
  promptId: string;
  domain: string;
  engine: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  citationPresent: boolean;
  citationUrls: unknown[] | null;
  rawSnippet: string | null;
  testedAt: string;
}

export interface CompetitorAppearance {
  id: string;
  domain: string;
  competitor: string;
  competitorDomain: string | null;
  engine: string;
  promptId: string | null;
  position: number | null;
  coMentioned: boolean;
  weekStart: string;
  detectedAt: string;
}

export interface CompetitorSummary {
  competitor: string;
  appearances: number;
  avgPosition: number | null;
  engines: string[];
  coMentionedCount: number;
}

export interface PromptMonitoringService {
  listPrompts(domain: string): Promise<MonitoredPrompt[]>;
  createPrompt(prompt: Omit<MonitoredPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonitoredPrompt>;
  updatePrompt(id: string, updates: { active?: boolean; promptText?: string; category?: string }): Promise<void>;
  deletePrompt(id: string): Promise<void>;
  savePromptResult(result: Omit<PromptResult, 'id'>): Promise<void>;
  listPromptResults(domain: string, limit?: number): Promise<PromptResult[]>;
  listResultsByPrompt(promptId: string, limit?: number): Promise<PromptResult[]>;
  listActiveDomainsWithPrompts(): Promise<string[]>;
  saveCompetitorAppearance(appearance: Omit<CompetitorAppearance, 'id' | 'detectedAt'>): Promise<void>;
  listCompetitorSummaries(domain: string, days?: number): Promise<CompetitorSummary[]>;
}

export interface CrawlerVisit {
  id: string;
  domain: string;
  botName: string;
  botCategory: 'indexing' | 'citation' | 'training' | 'unknown';
  pagePath: string;
  userAgent: string | null;
  responseCode: number | null;
  visitedAt: string;
}

export interface CrawlerVisitSummary {
  botName: string;
  botCategory: string;
  visitCount: number;
  uniquePaths: number;
  lastSeen: string;
}

export interface CrawlerVisitService {
  logVisit(visit: Omit<CrawlerVisit, 'id' | 'visitedAt'>): Promise<void>;
  listVisits(domain: string, days?: number): Promise<CrawlerVisit[]>;
  listVisitSummaries(domain: string, days?: number): Promise<CrawlerVisitSummary[]>;
}

export interface AlertService {
  sendScoreAlert(params: {
    domain: string;
    previousScore: number;
    currentScore: number;
    threshold: number;
    recipientEmail: string;
  }): Promise<void>;
}
