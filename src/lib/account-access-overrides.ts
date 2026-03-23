import type { PlanTier } from '@/lib/pricing';

export const UNLIMITED_PLAN_LIMIT = 1_000_000_000;

interface AccountAccessOverride {
  plan: string;
  tier: PlanTier;
  maxDomains?: number;
  maxPrompts?: number;
}

const ACCOUNT_ACCESS_OVERRIDES = new Map<string, AccountAccessOverride>([
  ['cydtetro@gmail.com', { plan: 'pro_annual', tier: 'pro', maxDomains: UNLIMITED_PLAN_LIMIT }],
]);

export function getAccountAccessOverride(email: string | null | undefined): AccountAccessOverride | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  return ACCOUNT_ACCESS_OVERRIDES.get(normalized) ?? null;
}

export function isUnlimitedPlanLimit(limit: number): boolean {
  return limit >= UNLIMITED_PLAN_LIMIT;
}
