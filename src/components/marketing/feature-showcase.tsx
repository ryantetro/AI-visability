'use client';

import {
  BarChart3,
  Bot,
  Eye,
  FileText,
  MessageSquareText,
  Radio,
  Search,
  Shield,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { FadeIn, StaggerGrid, StaggerItem } from '@/components/marketing/motion';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Eye,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
    title: 'AI Visibility Score',
    description: 'Get a 0–100 score showing exactly how well AI engines can find and recommend your business.',
  },
  {
    icon: Search,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
    title: 'Prompt Monitoring',
    description: 'See which questions people ask AI about your industry — and whether you show up in the answers.',
  },
  {
    icon: Wrench,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
    title: 'Prioritized Fixes',
    description: 'Get a ranked list of exactly what to fix first, with copy-paste instructions and downloadable files.',
  },
  {
    icon: TrendingUp,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50 border-green-200',
    title: 'Competitor Tracking',
    description: 'Compare your AI visibility against competitors and see who AI engines recommend instead of you.',
  },
  {
    icon: Bot,
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-50 border-cyan-200',
    title: 'Crawler Analytics',
    description: 'See which AI bots visit your site, how often, and whether those visits turn into referral traffic.',
  },
  {
    icon: Radio,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200',
    title: 'Automated Monitoring',
    description: 'Weekly scans with alerts when your score drops or new opportunities appear. Set it and forget it.',
  },
] as const;

const HIGHLIGHT_FEATURES = [
  {
    icon: Zap,
    title: '30-Second Scan',
    description: 'Full audit in under a minute. 19 factors across 6 dimensions.',
  },
  {
    icon: Shield,
    title: '5 AI Platforms',
    description: 'ChatGPT, Perplexity, Gemini, Claude, and Grok coverage.',
  },
  {
    icon: Users,
    title: 'Team Workspaces',
    description: 'Shared domains, invitations, and role-based access for agencies.',
  },
] as const;

export function FeatureShowcase() {
  return (
    <section className="relative border-t border-gray-200/80 px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <FadeIn>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to win in AI search
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              From your first free audit to ongoing monitoring — one platform to understand, track, and improve how AI engines see your business.
            </p>
          </div>
        </FadeIn>

        {/* Feature cards grid */}
        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.title}>
                <div className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
                  <div className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl border',
                    feature.iconBg,
                  )}>
                    <Icon className={cn('h-5 w-5', feature.iconColor)} strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>

        {/* Bottom highlight bar */}
        <FadeIn delay={0.15}>
          <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50/80 p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-3">
              {HIGHLIGHT_FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700">
                      <Icon className="h-4 w-4" strokeWidth={2.25} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
