export type PlanTier = 'free' | 'starter' | 'pro';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanConfig {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  domains: number;
  prompts: number;
  monitoring: 'none' | 'weekly' | 'daily';
  features: string[];
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    domains: 1,
    prompts: 5,
    monitoring: 'none',
    features: [
      'AI visibility scan',
      'Score overview',
      'Top 3 fix preview',
    ],
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 279,
    domains: 1,
    prompts: 25,
    monitoring: 'weekly',
    features: [
      'Unlimited scans',
      '1 domain',
      '25 prompts tracked',
      'Weekly monitoring',
      'All fixes + copy-to-LLM',
      'Score badge & certified page',
      'Do-follow backlink',
      'Email alerts',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 79,
    annualPrice: 749,
    domains: 5,
    prompts: 100,
    monitoring: 'daily',
    features: [
      'Everything in Starter',
      'Up to 5 domains',
      '100 prompts tracked',
      'Daily monitoring',
      'Competitor radar',
      'AI crawler analytics',
      'Priority support',
    ],
  },
};

/** Tier hierarchy for access checks */
const TIER_LEVEL: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

/** Check if a user's plan meets or exceeds the required tier */
export function canAccess(userPlan: PlanTier, requiredTier: PlanTier): boolean {
  return TIER_LEVEL[userPlan] >= TIER_LEVEL[requiredTier];
}

/** Which nav items require which minimum tier */
export const NAV_GATES: Record<string, PlanTier> = {
  dashboard: 'starter',
  report: 'free',
  brand: 'starter',
  competitors: 'pro',
  history: 'starter',
  leaderboard: 'free',
  settings: 'starter',
};

/** Feature-level gates for content within pages */
export const FEATURE_GATES: Record<string, PlanTier> = {
  copy_to_llm: 'starter',
  file_download: 'starter',
  full_fixes: 'starter',
  multi_domain: 'pro',
  competitor_radar: 'pro',
  ai_crawler: 'pro',
  daily_monitoring: 'pro',
  prompt_tracking_25: 'starter',
  prompt_tracking_100: 'pro',
  topic_performance: 'pro',
  competitor_leaderboard: 'starter',
  sentiment_analysis: 'starter',
  prompt_metrics: 'starter',
};

/** Convert a stored plan string (e.g. 'starter_monthly') to a PlanTier */
export function planStringToTier(plan: string): PlanTier {
  if (plan.startsWith('pro')) return 'pro';
  if (plan.startsWith('starter')) return 'starter';
  if (plan === 'lifetime' || plan === 'monthly' || plan === 'paid') return 'starter';
  return 'free';
}

export type PaymentPlanString = 'starter_monthly' | 'starter_annual' | 'pro_monthly' | 'pro_annual';

/** Get price in cents for a payment plan */
export function getPlanPriceCents(plan: PaymentPlanString): number {
  const prices: Record<PaymentPlanString, number> = {
    starter_monthly: 2900,
    starter_annual: 27900,
    pro_monthly: 7900,
    pro_annual: 74900,
  };
  return prices[plan];
}

/** Get display label for a payment plan */
export function getPlanDisplayName(plan: PaymentPlanString): string {
  const labels: Record<PaymentPlanString, string> = {
    starter_monthly: 'Starter Monthly',
    starter_annual: 'Starter Annual',
    pro_monthly: 'Pro Monthly',
    pro_annual: 'Pro Annual',
  };
  return labels[plan];
}
