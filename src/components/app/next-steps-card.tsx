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
      title: 'See your score & fixes',
      description: 'View your full AI visibility breakdown and what to fix to rank higher with ChatGPT and Perplexity.',
      href: '/report',
      cta: 'See Your Score',
    });
  }

  const trackingStep = steps.find((s) => s.key === 'install_tracking');
  if (trackingStep && !trackingStep.completed) {
    cards.push({
      key: 'tracking',
      icon: Code2,
      iconColor: '#a855f7',
      title: 'Track AI bot visits',
      description: 'See which AI crawlers visit your site (ChatGPT, Perplexity, etc.) and which send you real visitors. Takes ~5 min to install.',
      href: '/dashboard#tracking',
      cta: 'Install Tracking (5 min)',
    });
  }

  const monitoringStep = steps.find((s) => s.key === 'enable_monitoring');
  if (monitoringStep && !monitoringStep.completed) {
    cards.push({
      key: 'monitoring',
      icon: Radio,
      iconColor: '#25c972',
      title: 'Get weekly score updates',
      description: 'Automatic weekly scans so you know when your AI visibility improves or drops.',
      href: '/dashboard#monitoring',
      cta: 'Enable Weekly Scans',
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
              onClick={(e) => {
                const hash = card.href.split('#')[1];
                if (hash) {
                  const el = document.getElementById(hash);
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
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
