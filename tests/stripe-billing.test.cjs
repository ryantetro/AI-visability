require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const { isStripeCheckoutProvisioned } = require('../src/lib/services/stripe-payment.ts');

test('stripe checkout is not provisioned from a merely complete unpaid session', () => {
  assert.equal(isStripeCheckoutProvisioned('unpaid', 'incomplete'), false);
  assert.equal(isStripeCheckoutProvisioned('unpaid', null), false);
});

test('stripe checkout is provisioned once funds are paid', () => {
  assert.equal(isStripeCheckoutProvisioned('paid', 'incomplete'), true);
});

test('stripe checkout is provisioned when the subscription is active or trialing', () => {
  assert.equal(isStripeCheckoutProvisioned('unpaid', 'active'), true);
  assert.equal(isStripeCheckoutProvisioned('no_payment_required', 'trialing'), true);
});
