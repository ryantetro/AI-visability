import { PaymentService, PaymentPlan, CheckoutSession } from '@/types/services';
import { randomUUID } from 'node:crypto';

// Track mock checkout sessions
const sessions = new Map<string, { scanId: string; paid: boolean; plan: string }>();

export const mockPayment: PaymentService = {
  async createCheckout(scanId: string, plan: PaymentPlan = 'lifetime'): Promise<CheckoutSession> {
    const sessionId = randomUUID();
    sessions.set(sessionId, { scanId, paid: false, plan });
    return {
      id: sessionId,
      scanId,
      amount: plan === 'monthly' ? 500 : 3500,
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
