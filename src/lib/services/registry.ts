import { DatabaseService, PaymentService, AIService } from '@/types/services';
import { mockDb } from './mock-db';
import { mockPayment } from './mock-payment';
import { mockAi } from './mock-ai';
import { supabaseDb, canUseSupabase } from './supabase-db';
import { stripePayment, canUseStripe } from './stripe-payment';
import { openAiService, canUseOpenAI } from './openai-ai';

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
