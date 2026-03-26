import Stripe from 'stripe';
import { CheckoutSession, PaymentPlan, PaymentService } from '@/types/services';
import { getPlanPriceCents, getPlanDisplayName } from '@/lib/pricing';
import { getSupabaseClient } from '@/lib/supabase';
import { sanitizeAppRelativePath } from '@/lib/app-paths';

let _stripe: Stripe | null = null;
const STRIPE_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';
const TRANSIENT_BILLING_PARAMS = ['upgrade', 'checkout', 'session_id', 'fms', 'order_id'];

interface RedirectOptions {
  returnPath?: string;
  cancelPath?: string;
}

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
  _stripe = new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion });
  return _stripe;
}

function hasStripeConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function canUseStripe() {
  return hasStripeConfig();
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function buildAppRedirectUrl(
  path: string | null | undefined,
  queryParams: Record<string, string> = {},
  fallback = '/dashboard'
) {
  const appUrl = getAppUrl();
  const normalizedPath = sanitizeAppRelativePath(path, fallback);
  const url = new URL(normalizedPath, appUrl);

  for (const key of TRANSIENT_BILLING_PARAMS) {
    url.searchParams.delete(key);
  }

  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }

  return url
    .toString()
    .replace(encodeURIComponent(STRIPE_SESSION_PLACEHOLDER), STRIPE_SESSION_PLACEHOLDER);
}

function getPriceId(plan: PaymentPlan): string | null {
  const envMap: Record<PaymentPlan, string> = {
    starter_monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
    starter_annual: 'STRIPE_PRICE_STARTER_ANNUAL',
    pro_monthly: 'STRIPE_PRICE_PRO_MONTHLY',
    pro_annual: 'STRIPE_PRICE_PRO_ANNUAL',
    growth_monthly: 'STRIPE_PRICE_GROWTH_MONTHLY',
    growth_annual: 'STRIPE_PRICE_GROWTH_ANNUAL',
  };
  return process.env[envMap[plan]] || null;
}

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const supabase = getSupabaseClient();

  // Check if user already has a stripe_customer_id
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Store customer ID
  await supabase
    .from('user_profiles')
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return customer.id;
}

export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  plan: PaymentPlan = 'starter_monthly',
  options: RedirectOptions = {}
): Promise<CheckoutSession> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(userId, email);
  const priceId = getPriceId(plan);
  const returnPath = sanitizeAppRelativePath(options.returnPath, '/dashboard');
  const cancelPath = sanitizeAppRelativePath(options.cancelPath, returnPath);

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        price_data: {
          currency: 'usd',
          unit_amount: getPlanPriceCents(plan),
          product_data: {
            name: `AISO ${getPlanDisplayName(plan)}`,
            description: 'AI visibility dashboard, monitoring, and fix tools access.',
          },
          recurring: { interval: plan.endsWith('_annual') ? 'year' : 'month' },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [lineItem],
    success_url: buildAppRedirectUrl(returnPath, {
      checkout: 'success',
      session_id: STRIPE_SESSION_PLACEHOLDER,
    }),
    cancel_url: buildAppRedirectUrl(cancelPath),
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  });

  return {
    id: session.id,
    scanId: `upgrade_${userId}`,
    amount: session.amount_total ?? getPlanPriceCents(plan),
    currency: 'usd',
    url: session.url || '',
  };
}

export async function createFixMySiteCheckout(
  userId: string,
  email: string,
  orderId: string,
  options: RedirectOptions = {},
): Promise<CheckoutSession> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(userId, email);
  const priceId = process.env.STRIPE_PRICE_FIX_MY_SITE || null;
  const returnPath = sanitizeAppRelativePath(options.returnPath, '/dashboard');
  const cancelPath = sanitizeAppRelativePath(options.cancelPath, returnPath);

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        price_data: {
          currency: 'usd',
          unit_amount: 49900,
          product_data: {
            name: 'AISO Fix My Site — AI Visibility Optimization',
            description: 'One-time professional optimization of robots.txt, llms.txt, structured data, sitemap, and other AI visibility files.',
          },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [lineItem],
    success_url: buildAppRedirectUrl(returnPath, {
      fms: 'success',
      order_id: orderId,
    }),
    cancel_url: buildAppRedirectUrl(cancelPath, { fms: 'cancelled' }),
    metadata: { userId, orderId, type: 'fix_my_site' },
  });

  return {
    id: session.id,
    scanId: `fms_${orderId}`,
    amount: session.amount_total ?? 49900,
    currency: 'usd',
    url: session.url || '',
  };
}

export async function createPortalSession(
  userId: string,
  email: string,
  returnPath?: string,
): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(userId, email);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: buildAppRedirectUrl(returnPath, {}, '/settings'),
  });

  return session.url;
}

export const stripePayment: PaymentService = {
  async createCheckout(): Promise<CheckoutSession> {
    throw new Error('Use createSubscriptionCheckout() for Stripe payments. Legacy createCheckout does not support userId metadata.');
  },

  async verifyPayment(sessionId: string) {
    if (!hasStripeConfig()) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      paid: session.payment_status === 'paid' || session.status === 'complete',
      scanId: (session.metadata?.scanId) || '',
      plan: session.metadata?.plan,
      userId: session.metadata?.userId,
    };
  },
};
