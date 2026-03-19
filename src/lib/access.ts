import { type PlanTier, planStringToTier, canAccess, PLANS, FEATURE_GATES } from '@/lib/pricing';
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
  const tier = planStringToTier(profile.plan);
  const isPaid = tier !== 'free';
  const planConfig = PLANS[tier];

  return {
    tier,
    plan: profile.plan,
    isPaid,
    canAccessFeature: (feature: string) => {
      const requiredTier = FEATURE_GATES[feature];
      if (!requiredTier) return true; // unknown feature = allow
      return canAccess(tier, requiredTier);
    },
    maxDomains: planConfig.domains,
    maxPrompts: planConfig.prompts,
  };
}
