import { type PlanTier, planStringToTier, canAccess, PLANS, FEATURE_GATES } from '@/lib/pricing';
import { getAccountAccessOverride } from '@/lib/account-access-overrides';
import { getOrCreateProfile } from '@/lib/user-profile';

export interface AccessInfo {
  tier: PlanTier;
  plan: string;
  isPaid: boolean;
  canAccessFeature: (feature: string) => boolean;
  maxDomains: number;
  maxPrompts: number;
}

export async function getUserAccess(userId: string, email: string): Promise<AccessInfo> {
  const profile = await getOrCreateProfile(userId, email);
  const override = getAccountAccessOverride(email);
  const effectivePlan = override?.plan ?? profile.plan;
  const tier = override?.tier ?? planStringToTier(effectivePlan);
  const isPaid = tier !== 'free';
  const planConfig = PLANS[tier];

  return {
    tier,
    plan: effectivePlan,
    isPaid,
    canAccessFeature: (feature: string) => {
      const requiredTier = FEATURE_GATES[feature];
      if (!requiredTier) return true; // unknown feature = allow
      return canAccess(tier, requiredTier);
    },
    maxDomains: override?.maxDomains ?? planConfig.domains,
    maxPrompts: override?.maxPrompts ?? planConfig.prompts,
  };
}
