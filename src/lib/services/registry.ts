import { DatabaseService, PaymentService, AIService, AlertService, PromptMonitoringService, CrawlerVisitService } from '@/types/services';
import { mockDb } from './mock-db';
import { mockPayment } from './mock-payment';
import { mockAi } from './mock-ai';
import { supabaseDb, canUseSupabase } from './supabase-db';
import { stripePayment, canUseStripe } from './stripe-payment';
import { openAiService, canUseOpenAI } from './openai-ai';
import { mockMentionTester } from './mention-tester-mock';
import { realMentionTester, canUseMentionTester } from './mention-tester-real';
import { mockAlertService } from '@/lib/monitoring-alerts';
import { resendAlertService, canUseResend } from './resend-alerts';
import { supabasePromptMonitoring } from './supabase-prompt-monitoring';
import { mockPromptMonitoring } from './mock-prompt-monitoring';
import { supabaseCrawlerVisits } from './supabase-crawler-visits';
import { mockCrawlerVisits } from './mock-crawler-visits';
import type { MentionTesterService } from '@/lib/ai-mentions/engine-tester';

const FORCE_MOCKS = process.env.USE_MOCKS === 'true';

export function getDatabase(): DatabaseService {
  if (FORCE_MOCKS) return mockDb;
  if (canUseSupabase()) return supabaseDb;
  return mockDb;
}

export function getPayment(): PaymentService {
  if (FORCE_MOCKS) return mockPayment;
  if (canUseStripe()) return stripePayment;
  return mockPayment;
}

export function getAI(): AIService {
  if (FORCE_MOCKS) return mockAi;
  if (canUseOpenAI()) return openAiService;
  return mockAi;
}

export function getMentionTester(): MentionTesterService {
  if (FORCE_MOCKS) return mockMentionTester;
  if (canUseMentionTester()) return realMentionTester;
  return mockMentionTester;
}

export function getAlertService(): AlertService {
  if (FORCE_MOCKS) return mockAlertService;
  if (canUseResend()) return resendAlertService;
  return mockAlertService;
}

export function getPromptMonitoring(): PromptMonitoringService {
  if (FORCE_MOCKS) return mockPromptMonitoring;
  if (canUseSupabase()) return supabasePromptMonitoring;
  return mockPromptMonitoring;
}

export function getCrawlerVisits(): CrawlerVisitService {
  if (FORCE_MOCKS) return mockCrawlerVisits;
  if (canUseSupabase()) return supabaseCrawlerVisits;
  return mockCrawlerVisits;
}
