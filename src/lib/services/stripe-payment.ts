import { CheckoutSession, PaymentService } from '@/types/services';

const STRIPE_URL = 'https://api.stripe.com/v1/checkout/sessions';

function hasStripeConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function canUseStripe() {
  return hasStripeConfig();
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function parseStripeResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Stripe request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

export const stripePayment: PaymentService = {
  async createCheckout(scanId: string): Promise<CheckoutSession> {
    if (!hasStripeConfig()) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    const appUrl = getAppUrl();
    const body = new URLSearchParams();
    body.set('mode', 'payment');
    body.set('success_url', `${appUrl}/checkout/success?scanId=${encodeURIComponent(scanId)}&session_id={CHECKOUT_SESSION_ID}`);
    body.set('cancel_url', `${appUrl}/analysis?report=${encodeURIComponent(scanId)}#share`);
    body.set('metadata[scanId]', scanId);

    if (process.env.STRIPE_IMPLEMENTATION_PRICE_ID) {
      body.set('line_items[0][price]', process.env.STRIPE_IMPLEMENTATION_PRICE_ID);
      body.set('line_items[0][quantity]', '1');
    } else {
      body.set('line_items[0][price_data][currency]', 'usd');
      body.set('line_items[0][price_data][unit_amount]', process.env.STRIPE_IMPLEMENTATION_AMOUNT_CENTS || '9900');
      body.set('line_items[0][price_data][product_data][name]', 'AISO Implementation Package');
      body.set('line_items[0][price_data][product_data][description]', 'Generated AI visibility files, implementation prompts, and advanced deployment tools access.');
      body.set('line_items[0][quantity]', '1');
    }

    const payload = await parseStripeResponse<{
      id: string;
      url: string;
      amount_total?: number | null;
      currency?: string | null;
    }>(
      await fetch(STRIPE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    );

    return {
      id: payload.id,
      scanId,
      amount: payload.amount_total ?? Number(process.env.STRIPE_IMPLEMENTATION_AMOUNT_CENTS || 9900),
      currency: payload.currency || 'usd',
      url: payload.url,
    };
  },

  async verifyPayment(sessionId: string) {
    if (!hasStripeConfig()) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    const payload = await parseStripeResponse<{
      id: string;
      payment_status?: string;
      status?: string;
      metadata?: {
        scanId?: string;
      };
    }>(
      await fetch(`${STRIPE_URL}/${encodeURIComponent(sessionId)}`, {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      })
    );

    return {
      paid: payload.payment_status === 'paid' || payload.status === 'complete',
      scanId: payload.metadata?.scanId || '',
    };
  },
};
