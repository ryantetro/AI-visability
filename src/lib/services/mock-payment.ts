import { PaymentService, PaymentPlan, CheckoutSession } from '@/types/services';
import { getPlanPriceCents } from '@/lib/pricing';
import { randomUUID } from 'node:crypto';

// Track mock checkout sessions
const sessions = new Map<string, { scanId: string; paid: boolean; plan: string }>();

export const mockPayment: PaymentService = {
  async createCheckout(scanId: string, plan: PaymentPlan = 'starter_monthly'): Promise<CheckoutSession> {
    const sessionId = randomUUID();
    sessions.set(sessionId, { scanId, paid: false, plan });
    return {
      id: sessionId,
      scanId,
      amount: getPlanPriceCents(plan),
      currency: 'usd',
      url: `/checkout/${sessionId}`,
    };
  },

  async verifyPayment(sessionId: string) {
    const session = sessions.get(sessionId);
    if (!session) {
      return { paid: false, scanId: '' };
    }
    // In mock mode, mark as paid on verify
    session.paid = true;
    return { paid: true, scanId: session.scanId, plan: session.plan };
  },
};

/** Mock implementation of createSubscriptionCheckout */
export async function createMockSubscriptionCheckout(
  userId: string,
  _email: string,
  plan: PaymentPlan = 'starter_monthly'
): Promise<CheckoutSession> {
  const sessionId = randomUUID();
  const scanId = `upgrade_${userId}`;
  sessions.set(sessionId, { scanId, paid: false, plan });
  return {
    id: sessionId,
    scanId,
    amount: getPlanPriceCents(plan),
    currency: 'usd',
    url: `/checkout/${sessionId}`,
  };
}

/** Mock implementation of createPortalSession */
export async function createMockPortalSession(): Promise<string> {
  return '/settings?portal=mock';
}
