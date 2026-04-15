import { type PlanTier, planStringToTier } from '@/lib/pricing';
import { fetchClientAuthMe } from '@/lib/client-auth-me';

export interface PlanCacheSnapshot {
  tier: PlanTier | null;
  plan: string | null;
  isPaid: boolean | null;
  maxDomains: number | null;
  maxPrompts: number | null;
  maxPlatforms: number | null;
  maxCompetitors: number | null;
  maxRegions: number | null;
  maxSeats: number | null;
  maxContentPages: number | null;
  email: string | null;
  teamId: string | null;
  teamRole: 'owner' | 'member' | null;
  teamName: string | null;
  planExpiresAt: string | null;
  planCancelAtPeriodEnd: boolean | null;
}

interface AuthMePayload {
  plan?: string;
  isPaid?: boolean;
  maxDomains?: number;
  maxPrompts?: number;
  maxPlatforms?: number;
  maxCompetitors?: number;
  maxRegions?: number;
  maxSeats?: number;
  maxContentPages?: number;
  teamId?: string | null;
  teamRole?: 'owner' | 'member' | null;
  teamName?: string | null;
  planExpiresAt?: string | null;
  planCancelAtPeriodEnd?: boolean;
  reason?: string;
  user?: {
    email?: string | null;
    plan?: string;
  } | null;
}

const EMPTY_PLAN_CACHE: PlanCacheSnapshot = {
  tier: null,
  plan: null,
  isPaid: null,
  maxDomains: null,
  maxPrompts: null,
  maxPlatforms: null,
  maxCompetitors: null,
  maxRegions: null,
  maxSeats: null,
  maxContentPages: null,
  email: null,
  teamId: null,
  teamRole: null,
  teamName: null,
  planExpiresAt: null,
  planCancelAtPeriodEnd: null,
};

let snapshot: PlanCacheSnapshot = { ...EMPTY_PLAN_CACHE };
let refreshPromise: Promise<PlanCacheSnapshot> | null = null;

function isAuthMePayload(value: unknown): value is AuthMePayload {
  if (!value || typeof value !== 'object') return false;
  return (
    'user' in value
    || 'plan' in value
    || 'reason' in value
    || 'isPaid' in value
    || 'maxDomains' in value
    || 'maxPrompts' in value
  );
}

export function getPlanCacheSnapshot(): PlanCacheSnapshot {
  return { ...snapshot };
}

export function clearPlanCache() {
  snapshot = { ...EMPTY_PLAN_CACHE };
  refreshPromise = null;
}

export function hydratePlanCache(payload: AuthMePayload | null | undefined): PlanCacheSnapshot {
  const userPlan = payload?.plan ?? payload?.user?.plan ?? 'free';
  const resolvedTier = planStringToTier(userPlan);

  snapshot = {
    tier: resolvedTier,
    plan: userPlan,
    isPaid: payload?.isPaid ?? resolvedTier !== 'free',
    maxDomains: payload?.maxDomains ?? 1,
    maxPrompts: payload?.maxPrompts ?? 5,
    maxPlatforms: payload?.maxPlatforms ?? 2,
    maxCompetitors: payload?.maxCompetitors ?? 0,
    maxRegions: payload?.maxRegions ?? 1,
    maxSeats: payload?.maxSeats ?? 1,
    maxContentPages: payload?.maxContentPages ?? 0,
    email: payload?.user?.email ?? '',
    teamId: payload?.teamId ?? null,
    teamRole: payload?.teamRole ?? null,
    teamName: payload?.teamName ?? null,
    planExpiresAt: payload?.planExpiresAt ?? null,
    planCancelAtPeriodEnd: payload?.planCancelAtPeriodEnd ?? false,
  };

  return getPlanCacheSnapshot();
}

export async function refreshPlanCache(fetcher: typeof fetch = fetch): Promise<PlanCacheSnapshot> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { payload } = fetcher === fetch
          ? await fetchClientAuthMe<AuthMePayload>(fetcher)
          : await (async () => {
              const res = await fetcher('/api/auth/me', { cache: 'no-store' });
              return {
                payload: await res.json().catch(() => null),
              };
            })();

        if (isAuthMePayload(payload)) {
          return hydratePlanCache(payload);
        }
      } catch {
        // Keep the current cache on transient failures.
      }

      return getPlanCacheSnapshot();
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}
