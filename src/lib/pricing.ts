export type PlanTier = 'free' | 'starter' | 'pro' | 'growth';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanConfig {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  domains: number;
  prompts: number;
  platforms: number;
  competitors: number;
  regions: number;
  seats: number;
  contentPages: number;
  monitoring: 'none' | 'weekly' | 'daily';
  features: string[];
}

/** All available AI platforms */
export const AI_PLATFORMS = [
  'chatgpt',
  'perplexity',
  'gemini',
  'claude',
  'copilot',
  'grok',
] as const;
export type AIPlatform = (typeof AI_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<AIPlatform, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  copilot: 'Copilot',
  grok: 'Grok',
};

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    domains: 1,
    prompts: 5,
    platforms: 2,
    competitors: 0,
    regions: 1,
    seats: 1,
    contentPages: 0,
    monitoring: 'none',
    features: [
      'AI visibility scan',
      'Score overview',
      'Top 3 fix preview',
      '2 AI platforms',
    ],
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 468,
    domains: 1,
    prompts: 25,
    platforms: 2,
    competitors: 0,
    regions: 1,
    seats: 1,
    contentPages: 0,
    monitoring: 'weekly',
    features: [
      'Unlimited scans',
      '1 domain',
      '25 prompts tracked',
      '2 AI platforms',
      'Weekly monitoring',
      'All fixes + copy-to-LLM',
      'Score badge & certified page',
      'Do-follow backlink',
      'AI referral tracking',
      'Email alerts',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 948,
    domains: 3,
    prompts: 75,
    platforms: 4,
    competitors: 3,
    regions: 3,
    seats: 3,
    contentPages: 2,
    monitoring: 'daily',
    features: [
      'Everything in Starter',
      'Up to 3 domains',
      '75 prompts tracked',
      '4 AI platforms',
      'Daily monitoring',
      '3 competitors tracked',
      '3 regions',
      '2 AI-optimized pages/mo',
      'AI crawler analytics',
      'Data export (CSV)',
      'Priority support',
    ],
  },
  growth: {
    name: 'Growth',
    monthlyPrice: 249,
    annualPrice: 2388,
    domains: 10,
    prompts: 200,
    platforms: AI_PLATFORMS.length,
    competitors: 10,
    regions: -1, // unlimited
    seats: -1, // unlimited
    contentPages: 5,
    monitoring: 'daily',
    features: [
      'Everything in Pro',
      'Up to 10 domains',
      '200 prompts tracked',
      'All 6 AI platforms',
      '10 competitors tracked',
      'Unlimited regions',
      '5 AI-optimized pages/mo',
      'Unlimited seats',
      'Full data export (CSV/JSON)',
      'Onboarding + strategy session',
    ],
  },
};

/** Tier hierarchy for access checks */
export const TIER_LEVEL: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  growth: 3,
};

/** Check if a user's plan meets or exceeds the required tier */
export function canAccess(userPlan: PlanTier, requiredTier: PlanTier): boolean {
  return TIER_LEVEL[userPlan] >= TIER_LEVEL[requiredTier];
}

/** Which nav items require which minimum tier */
export const NAV_GATES: Record<string, PlanTier> = {
  dashboard: 'free',
  report: 'starter',
  actions: 'free',
  brand: 'starter',
  competitors: 'pro',
  history: 'starter',
  analytics: 'starter',
  prompts: 'starter',
  'content-studio': 'pro',
  leaderboard: 'free',
  settings: 'free',
  export: 'pro',
};

/** Feature-level gates for content within pages */
export const FEATURE_GATES: Record<string, PlanTier> = {
  // Starter features
  copy_to_llm: 'starter',
  file_download: 'starter',
  full_fixes: 'starter',
  prompt_tracking_25: 'starter',
  competitor_leaderboard: 'starter',
  sentiment_analysis: 'starter',
  prompt_metrics: 'starter',
  ai_referral: 'starter',

  // Pro features
  multi_domain: 'pro',
  competitor_radar: 'pro',
  ai_crawler: 'pro',
  daily_monitoring: 'pro',
  prompt_tracking_75: 'pro',
  topic_performance: 'pro',
  data_export: 'pro',
  content_generation: 'pro',
  content_studio: 'pro',
  multi_region: 'pro',
  multi_seat: 'pro',

  // Growth features
  prompt_tracking_200: 'growth',
  all_platforms: 'growth',
  full_export: 'growth',
  white_label: 'growth',
  onboarding_session: 'growth',
};

/** Convert a stored plan string (e.g. 'starter_monthly') to a PlanTier */
export function planStringToTier(plan: string): PlanTier {
  if (plan.startsWith('growth')) return 'growth';
  if (plan.startsWith('pro')) return 'pro';
  if (plan.startsWith('starter')) return 'starter';
  if (plan === 'lifetime' || plan === 'monthly' || plan === 'paid') return 'starter';
  return 'free';
}

export const PAYMENT_PLAN_IDS = [
  'starter_monthly',
  'starter_annual',
  'pro_monthly',
  'pro_annual',
  'growth_monthly',
  'growth_annual',
] as const;

export type PaymentPlanString = (typeof PAYMENT_PLAN_IDS)[number];

export function isPaymentPlanString(plan: string): plan is PaymentPlanString {
  return (PAYMENT_PLAN_IDS as readonly string[]).includes(plan);
}

/** Get price in cents for a payment plan */
export function getPlanPriceCents(plan: PaymentPlanString): number {
  const prices: Record<PaymentPlanString, number> = {
    starter_monthly: 4900,
    starter_annual: 46800,
    pro_monthly: 9900,
    pro_annual: 94800,
    growth_monthly: 24900,
    growth_annual: 238800,
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
    growth_monthly: 'Growth Monthly',
    growth_annual: 'Growth Annual',
  };
  return labels[plan];
}
