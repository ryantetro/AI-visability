'use client';

import Link from 'next/link';
import { Check, Users, Wrench } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';

const FMS_FEATURES = [
  'robots.txt & llms.txt setup',
  'Structured data (JSON-LD)',
  'Sitemap optimization',
  'Schema markup',
  'AI meta tags',
  '3-5 day delivery',
];

export function ServicesBand() {
  return (
    <section className="relative px-4 py-16">
      <FadeIn>
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-5">
          {/* Fix My Site — wider */}
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm lg:col-span-3">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100">
                  <Wrench className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Fix My Site</h3>
                  <p className="text-xs text-gray-500">Professional AI visibility optimization</p>
                </div>
                <div className="ml-auto flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">$499</span>
                  <span className="text-xs text-gray-500">one-time</span>
                </div>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {FMS_FEATURES.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[12px] font-medium text-gray-700">
                    <Check className="h-3 w-3 shrink-0 text-emerald-600" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/dashboard?fms=start"
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Wrench className="h-3.5 w-3.5" />
              Get Started
            </Link>
          </div>

          {/* Agencies — narrower */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm lg:col-span-2">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-base font-bold text-gray-900">For agencies & teams</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                Shared domains, invitations, and plan-aware limits — run AI visibility audits for every client from one workspace.
              </p>
            </div>
            <Link
              href="/pricing"
              className="mt-5 flex h-10 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100"
            >
              See team plans
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
