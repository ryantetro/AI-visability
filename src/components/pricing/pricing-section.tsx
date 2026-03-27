'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Wrench } from 'lucide-react';
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

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[28px] border p-6',
        featured
          ? 'border-[var(--color-primary)] bg-[linear-gradient(180deg,rgba(53,109,244,0.08)_0%,rgba(8,10,14,0.98)_100%)] shadow-[0_0_40px_rgba(53,109,244,0.10)]'
          : 'border-white/10 bg-white/[0.02]'
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-[11px] font-semibold text-white">
          Most Popular
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {TIER_DESCRIPTIONS[tier]}
          </p>
        </div>
        {featured ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {isFree ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">$0</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">${monthlyPrice}</span>
            <span className="text-sm text-zinc-400">/mo</span>
          </div>
        )}
        {!isFree && cycle === 'annual' ? (
          <p className="mt-2 text-[12px] text-zinc-500">
            <span className="text-zinc-600 line-through">${plan.monthlyPrice}/mo</span>
            {' '}
            <span className="font-medium text-[#25c972]">
              Save ${plan.monthlyPrice * 12 - plan.annualPrice}/yr
            </span>
          </p>
        ) : null}
        {!isFree && cycle === 'monthly' ? (
          <p className="mt-2 text-[12px] text-zinc-500">Billed monthly</p>
        ) : null}
        {isFree ? (
          <p className="mt-2 text-[12px] text-zinc-500">Forever free</p>
        ) : null}
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#25c972]/15">
              <Check className="h-2.5 w-2.5 text-[#25c972]" />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {isFree ? (
          <Link
            href={freeHref}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
          >
            {freeLabel}
          </Link>
        ) : (
          <Link
            href={`/dashboard?upgrade=${tier}_${cycle}`}
            className={cn(
              'flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90',
              featured
                ? 'bg-[var(--color-primary)]'
                : 'bg-white/[0.08] hover:bg-white/[0.12]'
            )}
          >
            {featured ? <Sparkles className="h-4 w-4" /> : null}
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
    <section id={id} className="relative px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-zinc-400">
            {description}
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              cycle === 'monthly'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              cycle === 'annual'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Annual
            <span className="ml-1.5 rounded-full bg-[#25c972]/15 px-2 py-0.5 text-[10px] font-bold text-[#25c972]">
              Save ~20%
            </span>
          </button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Fix My Site Add-on */}
        <div className="mx-auto mt-16 max-w-2xl">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Add-on Service
            </p>
            <h3 className="mt-3 text-2xl font-bold text-white">
              Need hands-on help?
            </h3>
            <p className="mt-2 text-[15px] text-zinc-400">
              Let our team optimize your site for AI visibility
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-[#25c972]/20 bg-[linear-gradient(180deg,rgba(37,201,114,0.06)_0%,rgba(8,10,14,0.98)_100%)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-white">Fix My Site</h4>
                <p className="mt-1 text-sm text-zinc-400">
                  Professional AI visibility optimization by the airadr team
                </p>
              </div>
              <div className="rounded-2xl border border-[#25c972]/20 bg-[#25c972]/10 p-2.5">
                <Wrench className="h-4 w-4 text-[#25c972]" />
              </div>
            </div>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">$499</span>
              <span className="text-sm text-zinc-400">one-time</span>
            </div>
            <p className="mt-1 text-[12px] text-zinc-500">3-5 business day delivery</p>

            <ul className="mt-6 space-y-3">
              {[
                'robots.txt optimization',
                'llms.txt creation & configuration',
                'Structured data (JSON-LD) setup',
                'Sitemap optimization',
                'Schema markup implementation',
                'Meta tags for AI discoverability',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#25c972]/15">
                    <Check className="h-2.5 w-2.5 text-[#25c972]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/dashboard?fms=start"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25c972] text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                <Wrench className="h-4 w-4" />
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {showFaq ? (
          <div className="mx-auto mt-20 max-w-2xl">
            <h3 className="text-center text-2xl font-semibold text-white">
              Frequently asked questions
            </h3>
            <div className="mt-8 space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div key={item.q} className="rounded-xl border border-white/8 bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-[14px] font-medium text-zinc-200"
                  >
                    {item.q}
                    <span className={cn(
                      'ml-4 shrink-0 text-zinc-500 transition-transform',
                      openFaq === index && 'rotate-180'
                    )}>
                      &#9662;
                    </span>
                  </button>
                  {openFaq === index ? (
                    <div className="px-5 pb-4 text-[13px] leading-6 text-zinc-400">
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
            <Link href="/" className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-300">
              &larr; Back to home
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
