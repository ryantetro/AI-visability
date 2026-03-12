import { DatabaseService, PaymentService, AIService } from '@/types/services';
import { mockDb } from './mock-db';
import { mockPayment } from './mock-payment';
import { mockAi } from './mock-ai';

const USE_MOCKS = process.env.USE_MOCKS !== 'false'; // default to mocks

export function getDatabase(): DatabaseService {
  if (USE_MOCKS) return mockDb;
  // Future: return supabaseDb;
  return mockDb;
}

export function getPayment(): PaymentService {
  if (USE_MOCKS) return mockPayment;
  // Future: return stripePayment;
  return mockPayment;
}

export function getAI(): AIService {
  if (USE_MOCKS) return mockAi;
  // Future: return claudeAi;
  return mockAi;
}
