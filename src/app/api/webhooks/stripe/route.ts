import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseClient } from '@/lib/supabase';
import { upgradeUserPlan } from '@/lib/user-profile';
import { trimWorkspaceToFit } from '@/lib/billing';
import { planStringToTier, TIER_LEVEL } from '@/lib/pricing';
import { setStripeIds } from '@/lib/fix-my-site';
import { getDatabase } from '@/lib/services/registry';
import { sendFixMySiteOrderNotification, sendFixMySiteConfirmation } from '@/lib/services/resend-alerts';

const fallbackProcessedEvents = new Set<string>();

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

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id || null;
}

async function findUserForSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userIdFromCustomer = await findUserByCustomerId(customerId);
  if (userIdFromCustomer) {
    return userIdFromCustomer;
  }

  const userIdFromMetadata = subscription.metadata?.userId?.trim();
  return userIdFromMetadata || null;
}

async function findUserForSchedule(schedule: Stripe.SubscriptionSchedule): Promise<string | null> {
  const customerId = typeof schedule.customer === 'string' ? schedule.customer : schedule.customer?.id ?? null;
  if (!customerId) {
    return null;
  }

  const userIdFromCustomer = await findUserByCustomerId(customerId);
  if (userIdFromCustomer) {
    return userIdFromCustomer;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    return null;
  }

  return customer.metadata?.userId?.trim() || null;
}

async function clearPendingPlanState(userId: string, scheduleId?: string | null) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('user_profiles')
    .update({
      pending_plan: null,
      pending_plan_effective_at: null,
      stripe_subscription_schedule_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (scheduleId) {
    query = query.eq('stripe_subscription_schedule_id', scheduleId);
  }

  await query;
}

function isMissingWebhookEventsSchemaError(error: { message?: string | null } | null | undefined) {
  const message = error?.message ?? '';
  return message.includes('stripe_webhook_events')
    && (message.includes('Could not find the table') || message.includes('does not exist'));
}

async function beginWebhookEventProcessing(eventId: string, eventType: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from('stripe_webhook_events')
    .select('processing_status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (isMissingWebhookEventsSchemaError(existingError)) {
    return !fallbackProcessedEvents.has(eventId);
  }

  if (existingError) {
    throw new Error(existingError.message ?? 'Failed to read Stripe webhook event state.');
  }

  if (existing?.processing_status === 'processed') {
    return false;
  }

  const payload = {
    event_id: eventId,
    event_type: eventType,
    processing_status: 'processing',
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase
      .from('stripe_webhook_events')
      .update(payload)
      .eq('event_id', eventId);
    return true;
  }

  const { error } = await supabase
    .from('stripe_webhook_events')
    .insert(payload);

  if (isMissingWebhookEventsSchemaError(error)) {
    return !fallbackProcessedEvents.has(eventId);
  }

  if (!error) {
    return true;
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from('stripe_webhook_events')
    .select('processing_status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (isMissingWebhookEventsSchemaError(duplicateError)) {
    return !fallbackProcessedEvents.has(eventId);
  }

  if (duplicateError) {
    throw new Error(duplicateError.message ?? 'Failed to re-read Stripe webhook event state.');
  }

  if (duplicate?.processing_status === 'processed') {
    return false;
  }

  await supabase
    .from('stripe_webhook_events')
    .update(payload)
    .eq('event_id', eventId);

  return true;
}

async function markWebhookEventProcessed(eventId: string) {
  const { error } = await getSupabaseClient()
    .from('stripe_webhook_events')
    .update({
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId);

  if (isMissingWebhookEventsSchemaError(error)) {
    fallbackProcessedEvents.add(eventId);
    if (fallbackProcessedEvents.size > 10000) {
      const first = fallbackProcessedEvents.values().next().value as string | undefined;
      if (first) fallbackProcessedEvents.delete(first);
    }
    return;
  }

  if (error) {
    throw new Error(error.message ?? 'Failed to mark Stripe webhook event as processed.');
  }
}

async function markWebhookEventFailed(eventId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const { error: updateError } = await getSupabaseClient()
    .from('stripe_webhook_events')
    .update({
      processing_status: 'failed',
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId);

  if (isMissingWebhookEventsSchemaError(updateError)) {
    return;
  }

  if (updateError) {
    console.error('Failed to record Stripe webhook failure state:', updateError.message ?? updateError);
  }
}

function getSchedulePhasePriceId(phase: Stripe.SubscriptionSchedule.Phase | undefined) {
  const price = phase?.items[0]?.price;
  if (!price) {
    return null;
  }

  return typeof price === 'string' ? price : price.id;
}

function getScheduleTargetPlan(schedule: Stripe.SubscriptionSchedule) {
  const targetPhase = schedule.phases[schedule.phases.length - 1];
  const currentPhase = schedule.phases[0];
  const currentPriceId = getSchedulePhasePriceId(currentPhase);
  const targetPriceId = getSchedulePhasePriceId(targetPhase);
  if (!targetPriceId || targetPriceId === currentPriceId) {
    return null;
  }

  return priceIdToPlan(targetPriceId);
}

function getScheduleEffectiveAt(schedule: Stripe.SubscriptionSchedule) {
  const transitionPhase = schedule.phases[1];
  const effectiveAt = transitionPhase?.start_date ?? null;
  return effectiveAt ? new Date(effectiveAt * 1000).toISOString() : null;
}

function isProvisionableSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === 'active' || status === 'trialing';
}

function isRetainableSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === 'active'
    || status === 'trialing'
    || status === 'past_due'
    || status === 'unpaid';
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseClient();

  if (session.metadata?.type === 'fix_my_site') {
    const orderId = session.metadata.orderId;
    const paymentIntent = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    if (orderId) {
      await setStripeIds(orderId, session.id, paymentIntent);

      const customerEmail = session.customer_details?.email || session.customer_email || '';
      const { data: order } = await supabase
        .from('fix_my_site_orders')
        .select('domain, notes, files_requested')
        .eq('id', orderId)
        .single();

      if (order) {
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

    return;
  }

  const userId = session.metadata?.userId;
  const scanId = session.metadata?.scanId?.trim() || null;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null;

  if (!userId) {
    return;
  }

  let sessionProvisioned = session.payment_status === 'paid';
  if (!sessionProvisioned && subscriptionId) {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    sessionProvisioned = isProvisionableSubscriptionStatus(subscription.status);
  }

  if (sessionProvisioned && scanId && !scanId.startsWith('upgrade_')) {
    const db = getDatabase();
    const scan = await db.getScan(scanId);
    if (scan) {
      scan.paid = true;
      await db.saveScan(scan);
    }
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null;

  if (session.subscription) {
    await supabase
      .from('user_profiles')
      .update({
        stripe_customer_id: customerId,
        plan_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    return;
  }

  if (customerId) {
    await supabase
      .from('user_profiles')
      .update({
        stripe_customer_id: customerId,
        plan_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }
}

async function handleSubscriptionUpsert(eventType: Stripe.Event.Type, subscription: Stripe.Subscription) {
  const supabase = getSupabaseClient();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = await findUserForSubscription(subscription);

  if (!userId) {
    console.warn(`${eventType}: no user found for customer`, customerId, '— acknowledging to prevent retry storm');
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? priceIdToPlan(priceId) : subscription.metadata?.plan;
  const scheduleId = typeof subscription.schedule === 'string'
    ? subscription.schedule
    : subscription.schedule?.id ?? null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan, pending_plan')
    .eq('id', userId)
    .single();
  const currentPlan = profile?.plan ?? 'free';
  const pendingPlan = typeof profile?.pending_plan === 'string' ? profile.pending_plan : null;
  const planMatchesPending = Boolean(plan && pendingPlan && plan === pendingPlan);
  const provisionable = isProvisionableSubscriptionStatus(subscription.status);
  const retainable = isRetainableSubscriptionStatus(subscription.status);

  if (plan && provisionable && eventType === 'customer.subscription.updated') {
    const currentTier = planStringToTier(currentPlan);
    const newTier = planStringToTier(plan);

    if (TIER_LEVEL[newTier] < TIER_LEVEL[currentTier]) {
      try {
        await trimWorkspaceToFit(userId, plan, currentPlan);
      } catch (trimError) {
        console.error('[webhook] trimWorkspaceToFit failed:', trimError);
        await supabase
          .from('user_profiles')
          .update({ trim_failed: true, updated_at: new Date().toISOString() })
          .eq('id', userId);
      }
    }
  }

  if (plan && provisionable && currentPlan !== plan) {
    await upgradeUserPlan(userId, plan);
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const updatePayload: Record<string, string | boolean | null> = {
    stripe_customer_id: customerId,
    plan_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (retainable) {
    updatePayload.stripe_subscription_id = subscription.id;
    updatePayload.stripe_subscription_schedule_id = scheduleId;
    updatePayload.plan_expires_at = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;
    updatePayload.plan_cancel_at_period_end = subscription.cancel_at_period_end;
  } else if (currentPlan === 'free') {
    updatePayload.stripe_subscription_id = null;
    updatePayload.stripe_subscription_schedule_id = null;
    updatePayload.plan_expires_at = null;
    updatePayload.plan_cancel_at_period_end = false;
  }

  if (planMatchesPending && provisionable) {
    updatePayload.pending_plan = null;
    updatePayload.pending_plan_effective_at = null;
  }

  await supabase
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = getSupabaseClient();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = await findUserForSubscription(subscription);

  if (!userId) {
    console.warn('customer.subscription.deleted: no user found for customer', customerId, '— acknowledging to prevent retry storm');
    return;
  }

  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single();
  const currentPlan = currentProfile?.plan ?? 'free';

  if (currentPlan !== 'free') {
    try {
      await trimWorkspaceToFit(userId, 'free', currentPlan);
    } catch (trimError) {
      console.error('[webhook] trimWorkspaceToFit failed on deletion:', trimError);
      await supabase
        .from('user_profiles')
        .update({ trim_failed: true, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  }

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
}

async function handleScheduleCreated(schedule: Stripe.SubscriptionSchedule) {
  const userId = await findUserForSchedule(schedule);
  if (!userId) {
    return;
  }

  const pendingPlan = getScheduleTargetPlan(schedule);
  const effectiveAt = getScheduleEffectiveAt(schedule);

  const updatePayload: Record<string, string | null> = {
    stripe_subscription_schedule_id: schedule.id,
    updated_at: new Date().toISOString(),
  };

  if (pendingPlan) {
    updatePayload.pending_plan = pendingPlan;
    updatePayload.pending_plan_effective_at = effectiveAt;
  }

  await getSupabaseClient()
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', userId);
}

async function handleScheduleReleased(schedule: Stripe.SubscriptionSchedule) {
  const customerId = typeof schedule.customer === 'string' ? schedule.customer : schedule.customer?.id ?? null;
  if (!customerId) {
    return;
  }

  const userId = await findUserByCustomerId(customerId);
  if (!userId) {
    return;
  }

  await clearPendingPlanState(userId, schedule.id);
}

async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      return;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpsert(event.type, event.data.object as Stripe.Subscription);
      return;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      return;
    case 'invoice.payment_failed':
      return;
    case 'subscription_schedule.created':
      await handleScheduleCreated(event.data.object as Stripe.SubscriptionSchedule);
      return;
    case 'subscription_schedule.aborted':
    case 'subscription_schedule.canceled':
    case 'subscription_schedule.completed':
    case 'subscription_schedule.released':
      await handleScheduleReleased(event.data.object as Stripe.SubscriptionSchedule);
      return;
    default:
      return;
  }
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

  const shouldProcess = await beginWebhookEventProcessing(event.id, event.type);
  if (!shouldProcess) {
    return NextResponse.json({ received: true });
  }

  try {
    await handleWebhookEvent(event);
    await markWebhookEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error handling Stripe webhook ${event.type}:`, error);
    await markWebhookEventFailed(event.id, error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
