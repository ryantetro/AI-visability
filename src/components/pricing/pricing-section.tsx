'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLANS, type BillingCycle, type PlanTier } from '@/lib/pricing';

const FAQ_ITEMS = [
  {
    q: 'What happens after my free scan?',
    a: 'You can run unlimited scans on the Analysis page for free. To unlock the full dashboard, reports, monitoring, and all fix tools, upgrade to Starter or above.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. When upgrading, you only pay the difference. When downgrading, the change takes effect at the next billing cycle.',
  },
  {
    q: 'What is the annual discount?',
    a: 'Annual billing saves approximately 20% compared to monthly pricing. You pay once per year instead of monthly.',
  },
  {
    q: 'How many domains can I monitor?',
    a: 'Free: 1 domain for scanning. Starter: 1 domain with weekly monitoring. Pro: up to 3 domains with daily monitoring. Growth: up to 10 domains with daily monitoring and full platform coverage.',
  },
  {
    q: 'What are AI-optimized pages?',
    a: 'AI-optimized pages are content pages generated to help your site get recommended by AI search engines. Pro includes 2 per month, Growth includes 5 per month.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel at any time and your access continues until the end of the current billing period. No long-term contracts.',
  },
];

const TIER_ORDER: PlanTier[] = ['free', 'starter', 'pro', 'growth'];

const TIER_DESCRIPTIONS: Record<PlanTier, string> = {
  free: 'Get your first AI visibility baseline.',
  starter: 'Ongoing visibility monitoring and fix workflows.',
  pro: 'For teams managing multiple domains and competitors.',
  growth: 'Full platform coverage with unlimited scale.',
};

function PricingCard({
  tier,
  cycle,
  featured,
  context,
}: {
  tier: PlanTier;
  cycle: BillingCycle;
  featured?: boolean;
  context: 'home' | 'pricing';
}) {
  const plan = PLANS[tier];
  const monthlyPrice = cycle === 'annual' && plan.annualPrice > 0
    ? Math.round(plan.annualPrice / 12)
    : plan.monthlyPrice;
  const isFree = tier === 'free';
  const freeHref = context === 'home' ? '/login?next=/dashboard' : '/analysis';
  const freeLabel = context === 'home' ? 'Create free account' : 'Start free scan';
  const isGrowth = tier === 'growth';

  const ctaClasses = cn(
    'flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200',
    isFree && 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
    !isFree && tier === 'starter' && 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
    !isFree &&
      featured &&
      'border border-[var(--color-primary-600)] bg-[var(--color-primary-600)] font-bold !text-white shadow-md hover:border-[var(--color-primary-700)] hover:bg-[var(--color-primary-700)] hover:!text-white hover:shadow-lg visited:!text-white',
    !isFree && isGrowth && 'border border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200/90',
  );

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-white p-8',
        featured
          ? 'z-[1] border-gray-200 shadow-[0_22px_48px_-14px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] lg:scale-[1.02]'
          : 'border-gray-200 shadow-sm',
      )}
    >
      {featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-900 shadow-sm">
          Most popular
        </span>
      ) : null}

      <div>
        <h3 className="text-xl font-bold tracking-tight text-gray-900">{plan.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{TIER_DESCRIPTIONS[tier]}</p>
      </div>

      <div className="mt-8">
        {isFree ? (
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
            <span className="text-5xl font-bold tracking-tight text-gray-900">$0</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
            <span className="text-5xl font-bold tracking-tight text-gray-900">${monthlyPrice}</span>
            <span className="text-sm font-medium text-gray-500">/month</span>
          </div>
        )}
        {!isFree && cycle === 'annual' ? (
          <p className="mt-2 text-xs text-gray-500">
            <span className="text-gray-400 line-through">${plan.monthlyPrice}/mo</span>{' '}
            <span className="font-semibold text-emerald-700">
              Save ${plan.monthlyPrice * 12 - plan.annualPrice}/yr
            </span>
          </p>
        ) : null}
        {!isFree && cycle === 'monthly' ? (
          <p className="mt-2 text-xs text-gray-500">Billed monthly</p>
        ) : null}
        {isFree ? <p className="mt-2 text-xs text-gray-500">Forever free</p> : null}
      </div>

      <ul className="mt-8 flex-1 space-y-3.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[14px] font-medium leading-snug text-gray-800">
            <Check className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        {isFree ? (
          <Link href={freeHref} className={ctaClasses}>
            {freeLabel}
          </Link>
        ) : (
          <Link href={`/dashboard?upgrade=${tier}_${cycle}`} className={ctaClasses}>
            Get {plan.name}
          </Link>
        )}
      </div>
    </div>
  );
}

export function PricingSection({
  id,
  title,
  description,
  context = 'home',
  showBackLink = false,
  showFaq = true,
}: {
  id?: string;
  title: string;
  description: string;
  context?: 'home' | 'pricing';
  showBackLink?: boolean;
  showFaq?: boolean;
}) {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id={id} className="relative bg-white px-4 py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(15 23 42 / 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(15 23 42 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-600">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-7 text-gray-600">
            {description}
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                cycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle('annual')}
              className={cn(
                'inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                cycle === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Save ~20%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:items-stretch lg:gap-5 lg:pt-2">
          {TIER_ORDER.map((tier) => (
            <PricingCard
              key={tier}
              tier={tier}
              cycle={cycle}
              context={context}
              featured={tier === 'pro'}
            />
          ))}
        </div>

        {showFaq ? (
          <div className="mx-auto mt-20 max-w-2xl">
            <h3 className="text-center text-2xl font-bold text-gray-900">
              Frequently asked questions
            </h3>
            <div className="mt-8 space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div key={item.q} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-[14px] font-semibold text-gray-900"
                  >
                    {item.q}
                    <span className={cn(
                      'ml-4 shrink-0 text-gray-500 transition-transform',
                      openFaq === index && 'rotate-180'
                    )}>
                      &#9662;
                    </span>
                  </button>
                  {openFaq === index ? (
                    <div className="px-5 pb-4 text-[13px] font-medium leading-6 text-gray-600">
                      {item.a}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showBackLink ? (
          <div className="mt-12 text-center">
            <Link href="/" className="text-[13px] font-semibold text-gray-600 transition-colors hover:text-gray-900">
              &larr; Back to home
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
