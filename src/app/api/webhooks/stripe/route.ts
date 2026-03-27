import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseClient } from '@/lib/supabase';
import { upgradeUserPlan } from '@/lib/user-profile';
import { trimWorkspaceToFit } from '@/lib/billing';
import { planStringToTier, TIER_LEVEL } from '@/lib/pricing';
import { setStripeIds } from '@/lib/fix-my-site';
import { sendFixMySiteOrderNotification, sendFixMySiteConfirmation } from '@/lib/services/resend-alerts';

const processedEvents = new Set<string>();

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
  if (process.env.STRIPE_PRICE_GROWTH_MONTHLY) mapping[process.env.STRIPE_PRICE_GROWTH_MONTHLY] = 'growth_monthly';
  if (process.env.STRIPE_PRICE_GROWTH_ANNUAL) mapping[process.env.STRIPE_PRICE_GROWTH_ANNUAL] = 'growth_annual';
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

async function clearPendingPlanState(userId: string) {
  const supabase = getSupabaseClient();
  await supabase
    .from('user_profiles')
    .update({
      pending_plan: null,
      pending_plan_effective_at: null,
      stripe_subscription_schedule_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
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

  // Idempotency: skip already-processed events
  if (processedEvents.has(event.id)) {
    return NextResponse.json({ received: true });
  }
  processedEvents.add(event.id);
  // Keep set bounded
  if (processedEvents.size > 10000) {
    const first = processedEvents.values().next().value as string;
    if (first) processedEvents.delete(first);
  }

  const supabase = getSupabaseClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      try {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle Fix My Site one-time payment
        if (session.metadata?.type === 'fix_my_site') {
          const orderId = session.metadata.orderId;
          const paymentIntent = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (orderId) {
            await setStripeIds(orderId, session.id, paymentIntent);

            // Look up customer email for notifications
            const customerEmail = session.customer_details?.email || session.customer_email || '';

            // Get order details for notifications
            const { data: order } = await supabase
              .from('fix_my_site_orders')
              .select('domain, notes, files_requested')
              .eq('id', orderId)
              .single();

            if (order) {
              // Notify AISO team
              try {
                await sendFixMySiteOrderNotification({
                  orderId,
                  customerEmail,
                  domain: order.domain,
                  notes: order.notes || '',
                  filesRequested: order.files_requested || [],
                });
              } catch (emailErr) {
                console.error('Failed to send Fix My Site team notification:', emailErr);
              }

              // Send confirmation to customer
              if (customerEmail) {
                try {
                  await sendFixMySiteConfirmation({
                    recipientEmail: customerEmail,
                    domain: order.domain,
                    orderId,
                  });
                } catch (emailErr) {
                  console.error('Failed to send Fix My Site customer confirmation:', emailErr);
                }
              }
            }
          }
          break;
        }

        // Handle subscription checkout
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
                plan_cancel_at_period_end: false,
                pending_plan: null,
                pending_plan_effective_at: null,
                stripe_subscription_schedule_id: null,
                plan_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
        }
      } catch (err) {
        console.error('Error handling checkout.session.completed:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      try {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const userId = await findUserByCustomerId(customerId);

        if (!userId) {
          console.warn(`${event.type}: no user found for customer`, customerId, '— acknowledging to prevent retry storm');
          return NextResponse.json({ received: true });
        }

        // Determine plan from subscription's price ID
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? priceIdToPlan(priceId) : subscription.metadata?.plan;
        const scheduleId = typeof subscription.schedule === 'string'
          ? subscription.schedule
          : subscription.schedule?.id ?? null;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('pending_plan')
          .eq('id', userId)
          .single();
        const pendingPlan = typeof profile?.pending_plan === 'string' ? profile.pending_plan : null;
        const planMatchesPending = Boolean(plan && pendingPlan && plan === pendingPlan);

        // Auto-trim workspace on subscription UPDATES that are downgrades
        // Skip for subscription.created — those are always upgrades from free
        if (plan && event.type === 'customer.subscription.updated') {
          const { data: currentProfile } = await supabase
            .from('user_profiles')
            .select('plan')
            .eq('id', userId)
            .single();
          const currentPlan = currentProfile?.plan ?? 'free';
          const currentTier = planStringToTier(currentPlan);
          const newTier = planStringToTier(plan);

          if (TIER_LEVEL[newTier] < TIER_LEVEL[currentTier]) {
            try {
              await trimWorkspaceToFit(userId, plan, currentPlan);
            } catch (trimError) {
              // Best-effort: log and set trim_failed flag, but still proceed with plan update
              console.error('[webhook] trimWorkspaceToFit failed:', trimError);
              await supabase
                .from('user_profiles')
                .update({ trim_failed: true, updated_at: new Date().toISOString() })
                .eq('id', userId);
            }
          }
        }

        if (plan) {
          await upgradeUserPlan(userId, plan);
        }

        // Update expiry and subscription ID
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
        const updatePayload: Record<string, string | boolean | null> = {
          stripe_subscription_id: subscription.id,
          stripe_subscription_schedule_id: scheduleId,
          plan_expires_at: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          plan_cancel_at_period_end: subscription.cancel_at_period_end,
          plan_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (planMatchesPending) {
          updatePayload.pending_plan = null;
          updatePayload.pending_plan_effective_at = null;
        }

        await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', userId);
      } catch (err) {
        console.error(`Error handling ${event.type}:`, err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      try {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const userId = await findUserByCustomerId(customerId);

        if (!userId) {
          console.warn('customer.subscription.deleted: no user found for customer', customerId, '— acknowledging to prevent retry storm');
          return NextResponse.json({ received: true });
        }

        // Read current plan before downgrading to free
        const { data: currentProfileDel } = await supabase
          .from('user_profiles')
          .select('plan')
          .eq('id', userId)
          .single();
        const currentPlanDel = currentProfileDel?.plan ?? 'free';

        if (currentPlanDel !== 'free') {
          try {
            await trimWorkspaceToFit(userId, 'free', currentPlanDel);
          } catch (trimError) {
            console.error('[webhook] trimWorkspaceToFit failed on deletion:', trimError);
            await supabase
              .from('user_profiles')
              .update({ trim_failed: true, updated_at: new Date().toISOString() })
              .eq('id', userId);
          }
        }

        // Downgrade to free
        await upgradeUserPlan(userId, 'free');
        await supabase
          .from('user_profiles')
          .update({
            stripe_subscription_id: null,
            stripe_subscription_schedule_id: null,
            plan_expires_at: null,
            plan_cancel_at_period_end: false,
            pending_plan: null,
            pending_plan_effective_at: null,
            plan_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (err) {
        console.error('Error handling customer.subscription.deleted:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
      break;
    }

    case 'invoice.payment_failed': {
      // Future: send email notification to user
      break;
    }

    case 'subscription_schedule.aborted':
    case 'subscription_schedule.canceled':
    case 'subscription_schedule.completed':
    case 'subscription_schedule.released': {
      try {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const customerId = typeof schedule.customer === 'string' ? schedule.customer : schedule.customer?.id ?? null;
        if (!customerId) {
          break;
        }

        const userId = await findUserByCustomerId(customerId);
        if (!userId) {
          break;
        }

        await clearPendingPlanState(userId);
      } catch (err) {
        console.error(`Error handling ${event.type}:`, err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
