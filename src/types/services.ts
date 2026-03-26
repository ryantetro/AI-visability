import { ScanJob } from './scan';
import type { AIEngine } from './ai-mentions';

export interface DatabaseService {
  getScan(id: string): Promise<ScanJob | null>;
  saveScan(scan: ScanJob): Promise<void>;
  findScanByUrl(normalizedUrl: string, maxAgeMs?: number): Promise<ScanJob | null>;
  listCompletedScans(limit?: number, email?: string): Promise<ScanJob[]>;
  findLatestScanByDomain(domain: string, email?: string): Promise<ScanJob | null>;
}

export interface CheckoutSession {
  id: string;
  scanId: string;
  amount: number;
  currency: string;
  url: string;
}

export type PaymentPlan = 'starter_monthly' | 'starter_annual' | 'pro_monthly' | 'pro_annual' | 'growth_monthly' | 'growth_annual';

export interface PaymentService {
  createCheckout(scanId: string, plan?: PaymentPlan): Promise<CheckoutSession>;
  verifyPayment(sessionId: string): Promise<{ paid: boolean; scanId: string; plan?: string; userId?: string }>;
}

export interface SubscriptionPaymentService extends PaymentService {
  createSubscriptionCheckout(userId: string, email: string, plan?: PaymentPlan): Promise<CheckoutSession>;
  createPortalSession(userId: string, email: string): Promise<string>;
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
  engine: AIEngine;
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
  engine: AIEngine;
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
  engines: AIEngine[];
  coMentionedCount: number;
}

export interface PromptMonitoringService {
  listPrompts(domain: string, userId?: string): Promise<MonitoredPrompt[]>;
  createPrompt(prompt: Omit<MonitoredPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonitoredPrompt>;
  updatePrompt(id: string, updates: { active?: boolean; promptText?: string; category?: string }, userId?: string): Promise<void>;
  deletePrompt(id: string, userId?: string): Promise<void>;
  savePromptResult(result: Omit<PromptResult, 'id'>): Promise<void>;
  listPromptResults(domain: string, limit?: number, userId?: string): Promise<PromptResult[]>;
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

export type SourceEngine = 'chatgpt' | 'perplexity' | 'gemini' | 'claude';

export interface ReferralVisit {
  id: string;
  domain: string;
  sourceEngine: SourceEngine;
  referrerUrl: string | null;
  landingPage: string;
  userAgent: string | null;
  visitedAt: string;
}

export interface ReferralVisitService {
  logVisit(visit: Omit<ReferralVisit, 'id' | 'visitedAt'>): Promise<void>;
  listVisits(domain: string, days?: number): Promise<ReferralVisit[]>;
}

export interface OpportunityAlertProviderSummary {
  provider: string;
  visits: number;
}

export interface OpportunityAlertPageSummary {
  path: string;
  crawlerVisits: number;
  referralVisits: number;
}

export interface OpportunityAlertSummary {
  domain: string;
  latestScanId: string | null;
  crawlerVisits: number;
  referralVisits: number;
  topProviders: OpportunityAlertProviderSummary[];
  topPages: OpportunityAlertPageSummary[];
}

export interface AlertService {
  sendScoreAlert(params: {
    domain: string;
    previousScore: number;
    currentScore: number;
    threshold: number;
    recipientEmail: string;
  }): Promise<void>;
  sendOpportunityAlert(params: {
    recipientEmail: string;
    summary: OpportunityAlertSummary;
  }): Promise<void>;
}
