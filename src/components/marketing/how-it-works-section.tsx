'use client';

import { Search, BarChart3, Wrench } from 'lucide-react';
import { FadeIn, StaggerGrid, StaggerItem } from '@/components/marketing/motion';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    step: '1',
    title: 'Enter your URL',
    desc: 'We crawl your site the same way AI bots do — checking 19 factors across content, structure, and AI crawler access.',
    icon: Search,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    step: '2',
    title: 'See your score',
    desc: 'Get a 0–100 score with a clear breakdown of what AI engines can (and can\'t) find, plus a prioritized fix list.',
    icon: BarChart3,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50 border-green-200',
  },
  {
    step: '3',
    title: 'Fix everything',
    desc: 'Download ready-to-install files customized for your site — plus copy-paste prompts for ChatGPT or Claude to guide you step by step.',
    icon: Wrench,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative border-t border-gray-200/80 bg-gray-50/60 px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Three steps to AI visibility
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Sign in once, then scan and reopen your reports whenever you need them.
            </p>
          </div>
        </FadeIn>

        <StaggerGrid className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <StaggerItem key={item.step}>
                <div className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border',
                    item.iconBg,
                  )}>
                    <Icon className={cn('h-5 w-5', item.iconColor)} strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                    {item.desc}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      </div>
    </section>
  );
}
