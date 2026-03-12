import { PaymentService, CheckoutSession } from '@/types/services';
import { randomUUID } from 'node:crypto';

// Track mock checkout sessions
const sessions = new Map<string, { scanId: string; paid: boolean }>();

export const mockPayment: PaymentService = {
  async createCheckout(scanId: string): Promise<CheckoutSession> {
    const sessionId = randomUUID();
    sessions.set(sessionId, { scanId, paid: false });
    return {
      id: sessionId,
      scanId,
      amount: 9900, // $99.00
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
    return { paid: true, scanId: session.scanId };
  },
};
