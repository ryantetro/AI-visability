import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseClient } from '@/lib/supabase';
import { upgradeUserPlan } from '@/lib/user-profile';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion });
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  return secret;
}

/** Map a Stripe Price ID back to a plan string */
function priceIdToPlan(priceId: string): string | null {
  const mapping: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_STARTER_MONTHLY) mapping[process.env.STRIPE_PRICE_STARTER_MONTHLY] = 'starter_monthly';
  if (process.env.STRIPE_PRICE_STARTER_ANNUAL) mapping[process.env.STRIPE_PRICE_STARTER_ANNUAL] = 'starter_annual';
  if (process.env.STRIPE_PRICE_PRO_MONTHLY) mapping[process.env.STRIPE_PRICE_PRO_MONTHLY] = 'pro_monthly';
  if (process.env.STRIPE_PRICE_PRO_ANNUAL) mapping[process.env.STRIPE_PRICE_PRO_ANNUAL] = 'pro_annual';
  return mapping[priceId] || null;
}

/** Find the userId associated with a Stripe customer ID */
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id || null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan || 'starter_monthly';

      if (userId) {
        await upgradeUserPlan(userId, plan);

        // Store subscription ID if present
        if (session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await supabase
            .from('user_profiles')
            .update({
              stripe_subscription_id: subId,
              plan_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const userId = await findUserByCustomerId(customerId);

      if (userId) {
        // Determine plan from subscription's price ID
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? priceIdToPlan(priceId) : subscription.metadata?.plan;

        if (plan) {
          await upgradeUserPlan(userId, plan);
        }

        // Update expiry and subscription ID
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
        await supabase
          .from('user_profiles')
          .update({
            stripe_subscription_id: subscription.id,
            plan_expires_at: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
            plan_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const userId = await findUserByCustomerId(customerId);

      if (userId) {
        // Downgrade to free
        await upgradeUserPlan(userId, 'free');
        await supabase
          .from('user_profiles')
          .update({
            stripe_subscription_id: null,
            plan_expires_at: null,
            plan_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
      break;
    }

    case 'invoice.payment_failed': {
      // Future: send email notification to user
      break;
    }
  }

  return NextResponse.json({ received: true });
}
