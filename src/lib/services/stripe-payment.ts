import Stripe from 'stripe';
import { CheckoutSession, PaymentPlan, PaymentService } from '@/types/services';
import { getPlanPriceCents, getPlanDisplayName, isPaymentPlanString, type PaymentPlanString } from '@/lib/pricing';
import { getSupabaseClient } from '@/lib/supabase';
import { sanitizeAppRelativePath } from '@/lib/app-paths';
import { getAccountAccessOverride } from '@/lib/account-access-overrides';

let _stripe: Stripe | null = null;
const STRIPE_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';
const TRANSIENT_BILLING_PARAMS = ['upgrade', 'checkout', 'session_id', 'fms', 'order_id', 'billing', 'target_plan'];
const CHANGE_PLAN_PORTAL_METADATA = {
  app: 'aiso',
  purpose: 'change_plan',
  version: 'v1',
} as const;

interface RedirectOptions {
  returnPath?: string;
  cancelPath?: string;
  scanId?: string;
}

interface PortalSessionOptions {
  returnPath?: string;
  configurationId?: string;
  flowData?: Stripe.BillingPortal.SessionCreateParams.FlowData;
}

export interface StripeSubscriptionState {
  subscriptionId: string;
  customerId: string;
  plan: PaymentPlanString | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduleId: string | null;
}

export type BillingConnectionState =
  | 'healthy'
  | 'repairing'
  | 'repairable'
  | 'unrecoverable'
  | 'free';

export type BillingRecoveryAction = 'retry' | 'contact_support' | null;

export interface BillingIdentityResolution {
  state: BillingConnectionState;
  subscription: StripeSubscriptionState | null;
  attemptedRepair: boolean;
  repaired: boolean;
  requiresStripeSubscription: boolean;
  message: string | null;
  recoveryAction: BillingRecoveryAction;
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

export function getPriceId(plan: PaymentPlan): string | null {
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

function priceIdToPlan(priceId: string | null | undefined): PaymentPlanString | null {
  if (!priceId) return null;

  const supportedPlans: PaymentPlanString[] = [
    'starter_monthly',
    'starter_annual',
    'pro_monthly',
    'pro_annual',
    'growth_monthly',
    'growth_annual',
  ];

  return supportedPlans.find((plan) => getPriceId(plan) === priceId) ?? null;
}

function getExplicitPortalConfigurationId() {
  const configId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  return configId ? configId : null;
}

function getExplicitChangePlanPortalConfigurationId() {
  const configId = process.env.STRIPE_BILLING_CHANGE_PLAN_CONFIGURATION_ID?.trim()
    || process.env.STRIPE_CHANGE_PLAN_PORTAL_CONFIGURATION_ID?.trim();
  return configId ? configId : null;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function escapeStripeSearchValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isStripeResourceMissing(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: string }).code)
    : null;
  return code === 'resource_missing';
}

function isManageableScheduleStatus(status: Stripe.SubscriptionSchedule.Status) {
  return status === 'active' || status === 'not_started';
}

function isManageableSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === 'active'
    || status === 'trialing'
    || status === 'past_due'
    || status === 'unpaid';
}

function isProvisionableSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === 'active' || status === 'trialing';
}

export function isStripeCheckoutProvisioned(
  paymentStatus: Stripe.Checkout.Session.PaymentStatus | null,
  subscriptionStatus?: Stripe.Subscription.Status | null,
) {
  return paymentStatus === 'paid'
    || (subscriptionStatus ? isProvisionableSubscriptionStatus(subscriptionStatus) : false);
}

function getSubscriptionStatusPriority(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'active':
      return 4;
    case 'trialing':
      return 3;
    case 'past_due':
      return 2;
    case 'unpaid':
      return 1;
    default:
      return 0;
  }
}

function getSubscriptionScheduleId(subscription: Stripe.Subscription) {
  return typeof subscription.schedule === 'string'
    ? subscription.schedule
    : subscription.schedule?.id ?? null;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;
  return currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;
}

function toStripeSubscriptionState(subscription: Stripe.Subscription): StripeSubscriptionState | null {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id ?? null;

  if (!customerId) return null;

  return {
    subscriptionId: subscription.id,
    customerId,
    plan: priceIdToPlan(subscription.items.data[0]?.price?.id),
    currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    scheduleId: getSubscriptionScheduleId(subscription),
  };
}

async function persistStripeSubscriptionForUser(
  userId: string,
  subscription: StripeSubscriptionState,
): Promise<void> {
  const supabase = getSupabaseClient();
  const updatePayload: Record<string, string | boolean | null> = {
    stripe_customer_id: subscription.customerId,
    stripe_subscription_id: subscription.subscriptionId,
    stripe_subscription_schedule_id: subscription.scheduleId,
    plan_expires_at: subscription.currentPeriodEnd,
    plan_cancel_at_period_end: subscription.cancelAtPeriodEnd,
    plan_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (subscription.plan) {
    updatePayload.plan = subscription.plan;
  }

  await supabase
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', userId);
}

async function persistStripeCustomerIdForUser(userId: string, customerId: string): Promise<void> {
  await getSupabaseClient()
    .from('user_profiles')
    .update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function clearInvalidStripeSubscriptionLinkForUser(userId: string): Promise<void> {
  await getSupabaseClient()
    .from('user_profiles')
    .update({
      stripe_subscription_id: null,
      stripe_subscription_schedule_id: null,
      plan_expires_at: null,
      plan_cancel_at_period_end: false,
      plan_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function clearStaleStripeCustomerForUser(userId: string): Promise<void> {
  await getSupabaseClient()
    .from('user_profiles')
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_subscription_schedule_id: null,
      plan_expires_at: null,
      plan_cancel_at_period_end: false,
      plan_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function retrieveManageableStripeSubscriptionById(subscriptionId: string): Promise<StripeSubscriptionState | null> {
  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['schedule'],
    });
    if (!isManageableSubscriptionStatus(subscription.status)) {
      return null;
    }
    return toStripeSubscriptionState(subscription);
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return null;
    }
    throw error;
  }
}

async function retrieveScheduleIfManageable(scheduleId: string) {
  const stripe = getStripe();

  try {
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    return isManageableScheduleStatus(schedule.status) ? schedule : null;
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return null;
    }
    throw error;
  }
}

async function releaseScheduleIfManageable(scheduleId: string, preserveCancelDate = false) {
  const stripe = getStripe();
  const schedule = await retrieveScheduleIfManageable(scheduleId);
  if (!schedule) return false;
  await stripe.subscriptionSchedules.release(schedule.id, {
    preserve_cancel_date: preserveCancelDate,
  });
  return true;
}

export async function findManageableStripeSubscriptionForCustomer(customerId: string): Promise<StripeSubscriptionState | null> {
  const stripe = getStripe();

  let subscriptions;
  try {
    subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 20,
      expand: ['data.schedule'],
    });
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return null;
    }
    throw error;
  }

  const manageable = subscriptions.data
    .filter((subscription) => isManageableSubscriptionStatus(subscription.status))
    .sort((left, right) => {
      const priority = getSubscriptionStatusPriority(right.status) - getSubscriptionStatusPriority(left.status);
      if (priority !== 0) return priority;
      return right.created - left.created;
    });

  if (manageable.length === 0) {
    return null;
  }

  return toStripeSubscriptionState(manageable[0]);
}

export async function syncStripeSubscriptionForUser(
  userId: string,
  customerId: string,
): Promise<StripeSubscriptionState | null> {
  const subscription = await findManageableStripeSubscriptionForCustomer(customerId);
  if (!subscription) {
    return null;
  }
  await persistStripeSubscriptionForUser(userId, subscription);
  return subscription;
}

async function searchStripeCustomerByMetadataUserId(userId: string): Promise<string | null> {
  const stripe = getStripe();
  const query = `metadata['userId']:'${escapeStripeSearchValue(userId)}'`;
  const results = await stripe.customers.search({
    query,
    limit: 10,
  });

  const customer = results.data.find((entry) => !entry.deleted);
  return customer?.id ?? null;
}

async function searchStripeCustomerByEmail(email: string): Promise<string | null> {
  const stripe = getStripe();
  const results = await stripe.customers.list({
    email,
    limit: 10,
  });

  const customer = results.data.find((entry) => !entry.deleted);
  return customer?.id ?? null;
}

function buildBillingRecoveryMessage(
  state: BillingConnectionState,
  requiresStripeSubscription: boolean,
) {
  if (!requiresStripeSubscription) {
    return null;
  }

  if (state === 'repairable') {
    return 'We can reconnect this workspace to its Stripe billing record before making plan changes.';
  }

  if (state === 'unrecoverable') {
    return 'We couldn’t reconnect an active Stripe subscription for this workspace. Billing changes are temporarily unavailable until this record is reviewed.';
  }

  return null;
}

export function requiresStripeBillingForPlan(plan: string, email?: string | null) {
  const override = getAccountAccessOverride(email);
  if (override?.plan === plan) {
    return false;
  }
  return isPaymentPlanString(plan);
}

export async function resolveBillingIdentityForUser(
  userId: string,
  billingProfile: {
    email?: string | null;
    plan?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  },
  options: {
    attemptRepair?: boolean;
  } = {},
): Promise<BillingIdentityResolution> {
  const directSubscriptionId = normalizeNullableString(billingProfile.stripe_subscription_id);
  const customerId = normalizeNullableString(billingProfile.stripe_customer_id);
  const currentPlan = normalizeNullableString(billingProfile.plan) ?? 'free';
  const normalizedEmail = normalizeEmail(billingProfile.email);
  const attemptRepair = options.attemptRepair ?? false;
  const requiresStripeSubscription = Boolean(
    directSubscriptionId
    || requiresStripeBillingForPlan(currentPlan, billingProfile.email),
  );

  if (directSubscriptionId) {
    const directSubscription = await retrieveManageableStripeSubscriptionById(directSubscriptionId);
    if (directSubscription) {
      await persistStripeSubscriptionForUser(userId, directSubscription);
      return {
        state: 'healthy',
        subscription: directSubscription,
        attemptedRepair: attemptRepair,
        repaired: false,
        requiresStripeSubscription,
        message: null,
        recoveryAction: null,
      };
    }

    await clearInvalidStripeSubscriptionLinkForUser(userId);
  }

  if (customerId) {
    // Verify the customer exists in the current Stripe mode before syncing
    let customerValid = true;
    try {
      const stripe = getStripe();
      await stripe.customers.retrieve(customerId);
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        customerValid = false;
        await clearStaleStripeCustomerForUser(userId);
      } else {
        throw error;
      }
    }

    if (customerValid) {
      const synced = await syncStripeSubscriptionForUser(userId, customerId);
      if (synced) {
        return {
          state: 'healthy',
          subscription: synced,
          attemptedRepair: attemptRepair,
          repaired: false,
          requiresStripeSubscription,
          message: null,
          recoveryAction: null,
        };
      }
    }
  }

  if (!requiresStripeSubscription) {
    return {
      state: 'free',
      subscription: null,
      attemptedRepair: attemptRepair,
      repaired: false,
      requiresStripeSubscription: false,
      message: null,
      recoveryAction: null,
    };
  }

  if (!attemptRepair) {
    return {
      state: 'repairable',
      subscription: null,
      attemptedRepair: false,
      repaired: false,
      requiresStripeSubscription,
      message: buildBillingRecoveryMessage('repairable', requiresStripeSubscription),
      recoveryAction: 'retry',
    };
  }

  const discoveredCustomerId = await searchStripeCustomerByMetadataUserId(userId)
    || (normalizedEmail ? await searchStripeCustomerByEmail(normalizedEmail) : null);

  if (discoveredCustomerId) {
    const synced = await syncStripeSubscriptionForUser(userId, discoveredCustomerId);
    if (synced) {
      return {
        state: 'healthy',
        subscription: synced,
        attemptedRepair: true,
        repaired: discoveredCustomerId !== customerId || synced.subscriptionId !== directSubscriptionId,
        requiresStripeSubscription,
        message: null,
        recoveryAction: null,
      };
    }

    if (discoveredCustomerId !== customerId) {
      await persistStripeCustomerIdForUser(userId, discoveredCustomerId);
    }
  }

  return {
    state: 'unrecoverable',
    subscription: null,
    attemptedRepair: true,
    repaired: false,
    requiresStripeSubscription,
    message: buildBillingRecoveryMessage('unrecoverable', requiresStripeSubscription),
    recoveryAction: 'contact_support',
  };
}

export async function resolveActiveStripeSubscriptionForUser(
  userId: string,
  billingProfile: {
    email?: string | null;
    plan?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  },
): Promise<StripeSubscriptionState | null> {
  const resolution = await resolveBillingIdentityForUser(userId, billingProfile, { attemptRepair: false });
  return resolution.state === 'healthy' ? resolution.subscription : null;
}

export async function scheduleSubscriptionPlanChange(
  subscriptionId: string,
  targetPlan: PaymentPlan,
  existingScheduleId?: string | null,
): Promise<{ scheduleId: string; effectiveAt: string }> {
  const stripe = getStripe();
  const targetPriceId = getPriceId(targetPlan);
  if (!targetPriceId) {
    throw new Error(`Stripe price is not configured for ${targetPlan}.`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['schedule'],
  });
  const currentItem = subscription.items.data[0];
  const currentPriceId = currentItem?.price?.id;
  const currentPeriodStart = currentItem?.current_period_start;
  const currentPeriodEnd = currentItem?.current_period_end;

  if (!currentPriceId || !currentPeriodStart || !currentPeriodEnd) {
    throw new Error('Unable to schedule a plan change for this subscription.');
  }

  const attachedSchedule = typeof subscription.schedule === 'string'
    ? await retrieveScheduleIfManageable(subscription.schedule)
    : subscription.schedule && isManageableScheduleStatus(subscription.schedule.status)
      ? subscription.schedule
      : null;

  // Always release any existing schedule so we start fresh — reusing a multi-phase
  // schedule can trigger "You can not modify the start date of the current phase"
  if (attachedSchedule) {
    await releaseScheduleIfManageable(attachedSchedule.id);
  } else if (existingScheduleId) {
    await releaseScheduleIfManageable(existingScheduleId);
  }

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
  });

  // Fresh schedule has exactly one phase — use its timestamps as-is
  const currentPhase = schedule.phases[0];
  if (!currentPhase) {
    throw new Error('Subscription schedule has no current phase.');
  }
  const phaseStart = currentPhase.start_date;
  const phaseEnd = currentPhase.end_date ?? currentPeriodEnd;

  const updated = await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        start_date: phaseStart,
        end_date: phaseEnd,
        items: [{ price: currentPriceId, quantity: currentItem.quantity ?? 1 }],
      },
      {
        start_date: phaseEnd,
        items: [{ price: targetPriceId, quantity: 1 }],
        metadata: {
          plan: targetPlan,
        },
      },
    ],
  });

  return {
    scheduleId: updated.id,
    effectiveAt: new Date(currentPeriodEnd * 1000).toISOString(),
  };
}

export async function cancelSubscriptionPlanChange(scheduleId: string): Promise<void> {
  await releaseScheduleIfManageable(scheduleId);
}

export async function reactivateSubscription(
  subscriptionId: string,
  existingScheduleId?: string | null,
): Promise<{ currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; scheduleId: string | null }> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['schedule'],
  });

  const attachedSchedule = typeof subscription.schedule === 'string'
    ? await retrieveScheduleIfManageable(subscription.schedule)
    : subscription.schedule && isManageableScheduleStatus(subscription.schedule.status)
      ? subscription.schedule
      : null;

  if (attachedSchedule) {
    await releaseScheduleIfManageable(attachedSchedule.id, false);
  } else if (existingScheduleId) {
    await releaseScheduleIfManageable(existingScheduleId, false);
  }

  let refreshed = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['schedule'],
  });

  const refreshedSchedule = typeof refreshed.schedule === 'string'
    ? await retrieveScheduleIfManageable(refreshed.schedule)
    : refreshed.schedule && isManageableScheduleStatus(refreshed.schedule.status)
      ? refreshed.schedule
      : null;

  if (refreshed.cancel_at_period_end && !refreshedSchedule) {
    refreshed = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  const currentPeriodEnd = refreshed.items.data[0]?.current_period_end ?? null;
  const scheduleId = typeof refreshed.schedule === 'string'
    ? refreshed.schedule
    : refreshed.schedule?.id ?? null;
  return {
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: refreshed.cancel_at_period_end,
    scheduleId,
  };
}

async function buildChangePlanPortalProducts() {
  const stripe = getStripe();
  const supportedPlans: PaymentPlanString[] = [
    'starter_monthly',
    'starter_annual',
    'pro_monthly',
    'pro_annual',
    'growth_monthly',
    'growth_annual',
  ];
  const productPriceMap = new Map<string, string[]>();

  await Promise.all(supportedPlans.map(async (plan) => {
    const priceId = getPriceId(plan);
    if (!priceId) return;

    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === 'string' ? price.product : price.product?.id ?? null;
    if (!productId) {
      throw new Error(`Stripe product is not configured for ${plan}.`);
    }

    const prices = productPriceMap.get(productId) ?? [];
    if (!prices.includes(priceId)) {
      prices.push(priceId);
    }
    productPriceMap.set(productId, prices);
  }));

  return [...productPriceMap.entries()].map(([product, prices]) => ({
    product,
    prices,
  }));
}

async function buildChangePlanPortalConfigurationPayload() {
  const products = await buildChangePlanPortalProducts();
  if (products.length === 0) {
    throw new Error('No Stripe prices are configured for hosted plan changes.');
  }

  const appUrl = getAppUrl();

  return {
    name: 'airadr Change Plan',
    default_return_url: buildAppRedirectUrl('/settings'),
    business_profile: {
      headline: 'Change your AI Visibility subscription securely in Stripe.',
      privacy_policy_url: `${appUrl}/privacy`,
      terms_of_service_url: `${appUrl}/terms`,
    },
    metadata: CHANGE_PLAN_PORTAL_METADATA,
    features: {
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: false,
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'] as Array<'price'>,
        products,
        proration_behavior: 'none' as const,
        billing_cycle_anchor: 'unchanged' as const,
        trial_update_behavior: 'end_trial' as const,
      },
    },
  };
}

async function ensureChangePlanPortalConfiguration() {
  const stripe = getStripe();
  const payload = await buildChangePlanPortalConfigurationPayload();
  const configuredId = getExplicitChangePlanPortalConfigurationId();

  if (configuredId) {
    try {
      const updated = await stripe.billingPortal.configurations.update(configuredId, payload);
      return updated.id;
    } catch (error) {
      if (!isStripeResourceMissing(error)) {
        throw error;
      }
    }
  }

  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const existing = configurations.data.find((configuration) => (
    configuration.metadata?.app === CHANGE_PLAN_PORTAL_METADATA.app
    && configuration.metadata?.purpose === CHANGE_PLAN_PORTAL_METADATA.purpose
  ));

  if (existing) {
    const updated = await stripe.billingPortal.configurations.update(existing.id, payload);
    return updated.id;
  }

  const created = await stripe.billingPortal.configurations.create(payload);
  return created.id;
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
    // Verify the customer still exists in the current Stripe mode (test vs live)
    try {
      const stripe = getStripe();
      await stripe.customers.retrieve(profile.stripe_customer_id);
      return profile.stripe_customer_id;
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        // Stale customer ID (e.g. test-mode ID used with live key) — clear it and create a new one
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: null, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } else {
        throw error;
      }
    }
  }

  const existingCustomerId = await searchStripeCustomerByMetadataUserId(userId)
    || await searchStripeCustomerByEmail(normalizeEmail(email) ?? email);
  if (existingCustomerId) {
    await persistStripeCustomerIdForUser(userId, existingCustomerId);
    return existingCustomerId;
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
            name: `airadr ${getPlanDisplayName(plan)}`,
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
    metadata: {
      userId,
      plan,
      ...(options.scanId ? { scanId: options.scanId } : {}),
    },
    subscription_data: {
      metadata: {
        userId,
        plan,
        ...(options.scanId ? { scanId: options.scanId } : {}),
      },
    },
  });

  return {
    id: session.id,
    scanId: options.scanId || `upgrade_${userId}`,
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
            name: 'airadr Fix My Site — AI Visibility Optimization',
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
  options: PortalSessionOptions = {},
): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(userId, email);
  const configuredPortalId = options.configurationId ?? getExplicitPortalConfigurationId() ?? undefined;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    configuration: configuredPortalId,
    flow_data: options.flowData,
    return_url: buildAppRedirectUrl(options.returnPath, {}, '/settings'),
  });

  return session.url;
}

export async function createChangePlanPortalSession(
  userId: string,
  email: string,
  subscriptionId: string,
  targetPlan: PaymentPlanString,
  returnPath?: string,
): Promise<string> {
  const stripe = getStripe();
  const targetPriceId = getPriceId(targetPlan);
  if (!targetPriceId) {
    throw new Error(`Stripe price is not configured for ${targetPlan}.`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['schedule'],
  });
  const currentItem = subscription.items.data[0] ?? null;
  if (!currentItem) {
    throw new Error('No subscription item was found for this subscription.');
  }

  const attachedScheduleId = typeof subscription.schedule === 'string'
    ? subscription.schedule
    : subscription.schedule?.id ?? null;
  if (attachedScheduleId) {
    throw new Error('This subscription already has a scheduled change. Please use the guided change flow instead.');
  }

  if (currentItem.price?.id === targetPriceId) {
    throw new Error('This plan is already active.');
  }

  const configurationId = await ensureChangePlanPortalConfiguration();

  return createPortalSession(userId, email, {
    returnPath,
    configurationId,
    flowData: {
      type: 'subscription_update_confirm',
      after_completion: {
        type: 'redirect',
        redirect: {
          return_url: buildAppRedirectUrl(returnPath, {
            billing: 'plan_updated',
            target_plan: targetPlan,
          }, '/settings'),
        },
      },
      subscription_update_confirm: {
        subscription: subscriptionId,
        items: [{
          id: currentItem.id,
          price: targetPriceId,
          quantity: currentItem.quantity ?? 1,
        }],
      },
    },
  });
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    const expandedSubscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription, { expand: ['schedule'] })
      : session.subscription;
    const subscriptionState = expandedSubscription ? toStripeSubscriptionState(expandedSubscription) : null;
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? subscriptionState?.customerId ?? null;
    const subscriptionProvisioned = isStripeCheckoutProvisioned(
      session.payment_status,
      expandedSubscription?.status,
    );

    return {
      paid: subscriptionProvisioned,
      scanId: (session.metadata?.scanId) || '',
      plan: session.metadata?.plan ?? subscriptionState?.plan ?? undefined,
      userId: session.metadata?.userId,
      customerId: customerId ?? undefined,
      subscriptionId: subscriptionState?.subscriptionId,
      currentPeriodEnd: subscriptionState?.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: subscriptionState?.cancelAtPeriodEnd,
      scheduleId: subscriptionState?.scheduleId ?? undefined,
    };
  },
};
