'use client';

import Link from 'next/link';
import { FileText, Code2, Radio, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { DashboardPanel } from '@/components/app/dashboard-primitives';

interface NudgeCard {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}

export function NextStepsCard() {
  const { steps } = useOnboarding();

  const cards: NudgeCard[] = [];

  const reportStep = steps.find((s) => s.key === 'review_report');
  if (reportStep && !reportStep.completed) {
    cards.push({
      key: 'report',
      icon: FileText,
      iconColor: '#3b82f6',
      title: 'View your full report',
      description: 'See your AI visibility score breakdown and fix recommendations.',
      href: '/report',
      cta: 'View Report',
    });
  }

  const trackingStep = steps.find((s) => s.key === 'install_tracking');
  if (trackingStep && !trackingStep.completed) {
    cards.push({
      key: 'tracking',
      icon: Code2,
      iconColor: '#a855f7',
      title: 'Install tracking script',
      description: 'See which AI bots crawl your site in real time.',
      href: '/settings#tracking',
      cta: 'Set Up Tracking',
    });
  }

  const monitoringStep = steps.find((s) => s.key === 'enable_monitoring');
  if (monitoringStep && !monitoringStep.completed) {
    cards.push({
      key: 'monitoring',
      icon: Radio,
      iconColor: '#25c972',
      title: 'Enable monitoring',
      description: 'Get weekly scans and alerts when your score changes.',
      href: '/dashboard#monitoring',
      cta: 'Enable Now',
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.slice(0, 3).map((card) => {
        const Icon = card.icon;
        return (
          <DashboardPanel key={card.key} className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${card.iconColor}15` }}>
              <span style={{ color: card.iconColor }}><Icon className="h-4.5 w-4.5" /></span>
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-white">{card.title}</h3>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">{card.description}</p>
            <Link
              href={card.href}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#356df4] transition-colors hover:text-[#5b8af7]"
            >
              {card.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </DashboardPanel>
        );
      })}
    </div>
  );
}
