'use client';

import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Globe,
  MessageSquareText,
  Plug,
  Sparkles,
  Users,
  FolderKanban,
} from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { cn } from '@/lib/utils';

function GridBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.5]"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(15 23 42 / 0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(15 23 42 / 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '28px 28px',
      }}
    />
  );
}

function PillBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-700">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
      {children}
    </span>
  );
}

const FEATURES: readonly {
  label: string;
  Icon: LucideIcon;
  iconWrap: string;
}[] = [
  {
    label: 'AI visibility & scoring',
    Icon: MessageSquareText,
    iconWrap: 'border-blue-200 bg-blue-50 text-blue-600',
  },
  {
    label: 'Prompt tracking',
    Icon: FolderKanban,
    iconWrap: 'border-amber-200 bg-amber-50 text-amber-600',
  },
  {
    label: 'Built-in analytics',
    Icon: BarChart3,
    iconWrap: 'border-orange-200 bg-orange-50 text-orange-600',
  },
  {
    label: 'Multi-domain workspace',
    Icon: Globe,
    iconWrap: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Exports & fix workflows',
    Icon: Plug,
    iconWrap: 'border-cyan-200 bg-cyan-50 text-cyan-600',
  },
  {
    label: 'Teams & invitations',
    Icon: Users,
    iconWrap: 'border-rose-200 bg-rose-50 text-rose-600',
  },
];

const PLATFORM_TAGS: readonly {
  name: string;
  Icon: ComponentType<{ className?: string }>;
  className: string;
}[] = [
  { name: 'ChatGPT', Icon: ChatGPTIcon, className: 'text-[#74aa9c]' },
  { name: 'Perplexity', Icon: PerplexityIcon, className: 'text-[#20B8CD]' },
  { name: 'Gemini', Icon: GeminiIcon, className: 'text-[#4285F4]' },
  { name: 'Claude', Icon: ClaudeIcon, className: 'text-[#d97757]' },
  { name: 'Grok', Icon: GrokIcon, className: 'text-neutral-600' },
];

export function BentoPlatformSection() {
  return (
    <section className="relative border-t border-gray-200/80 bg-gray-50/80 px-4 py-20 sm:py-24" aria-labelledby="bento-platform-heading">
      <GridBackdrop />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <FadeIn>
            <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-8 sm:p-10 lg:p-11">
              <PillBadge>AI Visibility Platform</PillBadge>
              <h2
                id="bento-platform-heading"
                className="font-display mt-5 text-2xl font-bold tracking-tight text-gray-900 sm:text-[1.75rem] sm:leading-tight lg:text-3xl"
              >
                Understand how AI talks about your brand
              </h2>
              <p className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-gray-600">
                Monitor how your brand appears in AI-generated answers and discover the prompts that drive visibility across the
                platforms your customers actually use.
              </p>
              <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-5">
                {FEATURES.map(({ label, Icon, iconWrap }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        iconWrap,
                      )}
                      aria-hidden
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-8 sm:p-10 lg:p-11">
              <PillBadge>AI Platform Coverage</PillBadge>
              <h2 className="font-display mt-5 text-2xl font-bold tracking-tight text-gray-900 sm:text-[1.75rem] sm:leading-tight lg:text-3xl">
                Track responses across leading AI models
              </h2>
              <p className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-gray-600">
                See how different AI platforms respond to the same prompts and understand where your brand appears—or where
                competitors take the lead.
              </p>
              <div className="mt-10 flex flex-wrap gap-2.5">
                {PLATFORM_TAGS.map(({ name, Icon, className }) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm"
                  >
                    <span className={cn('flex h-5 w-5 items-center justify-center', className)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
