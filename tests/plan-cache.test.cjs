require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clearPlanCache,
  getPlanCacheSnapshot,
  hydratePlanCache,
  refreshPlanCache,
} = require('../src/lib/plan-cache.ts');

test.beforeEach(() => {
  clearPlanCache();
});

test('plan cache hydrates from auth payload data', () => {
  const snapshot = hydratePlanCache({
    plan: 'pro-annual',
    isPaid: true,
    maxDomains: 999,
    maxPrompts: 100,
    user: { email: 'ryan@example.com' },
  });

  assert.deepEqual(snapshot, {
    tier: 'pro',
    plan: 'pro-annual',
    isPaid: true,
    maxDomains: 999,
    maxPrompts: 100,
    email: 'ryan@example.com',
  });
});

test('plan cache clears fully on invalidation', () => {
  hydratePlanCache({
    plan: 'starter-monthly',
    isPaid: true,
    maxDomains: 3,
    maxPrompts: 25,
    user: { email: 'stale@example.com' },
  });

  clearPlanCache();

  assert.deepEqual(getPlanCacheSnapshot(), {
    tier: null,
    plan: null,
    isPaid: null,
    maxDomains: null,
    maxPrompts: null,
    email: null,
  });
});

test('plan cache dedupes concurrent refresh requests', async () => {
  let fetchCalls = 0;

  const fetcher = async () => {
    fetchCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      ok: true,
      async json() {
        return {
          plan: 'pro-annual',
          isPaid: true,
          maxDomains: 999,
          maxPrompts: 100,
          user: { email: 'ryan@example.com' },
        };
      },
    };
  };

  const [first, second] = await Promise.all([
    refreshPlanCache(fetcher),
    refreshPlanCache(fetcher),
  ]);

  assert.equal(fetchCalls, 1);
  assert.deepEqual(first, second);
  assert.equal(first.email, 'ryan@example.com');
  assert.equal(first.tier, 'pro');
});

test('plan cache replaces prior user data when auth resolves to no session', async () => {
  hydratePlanCache({
    plan: 'pro-annual',
    isPaid: true,
    maxDomains: 999,
    maxPrompts: 100,
    user: { email: 'old-owner@example.com' },
  });

  const snapshot = await refreshPlanCache(async () => ({
    ok: true,
    async json() {
      return {
        user: null,
        plan: 'free',
        reason: 'no_session',
      };
    },
  }));

  assert.deepEqual(snapshot, {
    tier: 'free',
    plan: 'free',
    isPaid: false,
    maxDomains: 1,
    maxPrompts: 5,
    email: '',
  });
});
