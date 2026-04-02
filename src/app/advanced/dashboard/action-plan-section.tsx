'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Wrench,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreColor } from '../lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface ActionPlanSectionProps {
  overallScore: number | null;
  aiVisibility: number;
  fixes: PrioritizedFix[];
  totalMentions: number;
  totalChecks: number;
  monitoringConnected: boolean;
  hasPaidPlan: boolean;
}

interface ActionPhase {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  subtitle: string;
  status: 'complete' | 'active' | 'locked';
  cta: { label: string; href: string };
  metric?: { value: string; label: string };
}

export function ActionPlanSection({
  overallScore,
  aiVisibility,
  fixes,
  totalMentions,
  totalChecks,
  monitoringConnected,
  hasPaidPlan,
}: ActionPlanSectionProps) {
  const topFixes = fixes.slice(0, 3);
  const hasFixableIssues = topFixes.length > 0;
  const mentionRate = totalChecks > 0 ? Math.round((totalMentions / totalChecks) * 100) : null;

  const phase1Done = !hasFixableIssues || (aiVisibility >= 80);
  const phase2Done = mentionRate !== null && mentionRate >= 50;
  const phase3Done = monitoringConnected;

  const phases: ActionPhase[] = [
    {
      step: 1,
      icon: Wrench,
      iconColor: '#ef4444',
      title: 'Fix Your Ranking',
      subtitle: hasFixableIssues
        ? `${topFixes.length} high-impact fixes will boost your score by up to +${topFixes.reduce((sum, f) => sum + f.estimatedLift, 0)} pts`
        : 'Your site is well-optimized for AI discovery',
      status: phase1Done ? 'complete' : 'active',
      cta: { label: 'See All Fixes', href: '/report' },
      metric: { value: `${aiVisibility}%`, label: 'AI Visibility' },
    },
    {
      step: 2,
      icon: TrendingUp,
      iconColor: '#f59e0b',
      title: 'Improve Your AI Presence',
      subtitle: mentionRate !== null
        ? `You appear in ${mentionRate}% of AI responses — content and prompt optimization can grow this`
        : 'Run a scan to see how AI engines reference your business',
      status: phase1Done ? (phase2Done ? 'complete' : 'active') : 'locked',
      cta: { label: 'View Prompts & Content', href: '/brand' },
      metric: mentionRate !== null ? { value: `${mentionRate}%`, label: 'Mention Rate' } : undefined,
    },
    {
      step: 3,
      icon: Radio,
      iconColor: '#22c55e',
      title: 'Monitor & Grow',
      subtitle: monitoringConnected
        ? 'Weekly scans active — you\'ll be alerted to score drops and new opportunities'
        : 'Enable automatic monitoring to track progress and catch drops early',
      status: phase2Done ? (phase3Done ? 'complete' : 'active') : 'locked',
      cta: monitoringConnected
        ? { label: 'View Trends', href: '/dashboard#monitoring' }
        : { label: 'Enable Monitoring', href: '/dashboard#monitoring' },
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Your Action Plan</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Follow these steps to maximize your AI visibility
          </p>
        </div>
        {overallScore !== null && (
          <div className="text-right">
            <span className={cn('text-3xl font-bold', scoreColor(overallScore))}>
              {overallScore}%
            </span>
            <p className="text-xs font-medium text-gray-600">Overall Score</p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {phases.map((phase) => {
          const Icon = phase.icon;
          const locked = phase.status === 'locked';
          return (
            <div
              key={phase.step}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 transition-all',
                phase.status === 'active' && 'border-blue-200 bg-blue-50/50',
                phase.status === 'complete' && 'border-green-200 bg-green-50/30',
                locked && 'border-gray-200 bg-gray-50'
              )}
            >
              <div className="flex flex-col items-center gap-1">
                {phase.status === 'complete' ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : phase.status === 'active' ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${phase.iconColor}15`, color: phase.iconColor }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white">
                    <CircleDot className="h-4 w-4 text-gray-500" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-gray-600">STEP {phase.step}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className={cn('text-sm font-semibold', locked ? 'text-gray-800' : 'text-gray-900')}>
                    {phase.title}
                  </h3>
                  {phase.metric && (
                    <div className="text-right">
                      <span className={cn('text-lg font-bold', scoreColor(Number(phase.metric.value.replace(/%/g, '')) || 0))}>
                        {phase.metric.value}
                      </span>
                      <span className="ml-1 text-xs font-medium text-gray-600">{phase.metric.label}</span>
                    </div>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{phase.subtitle}</p>
                {phase.status !== 'locked' && (
                  <Link
                    href={phase.cta.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {phase.cta.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasFixableIssues && !hasPaidPlan && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Need help implementing these fixes?
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                Our team can handle all technical optimizations for you
              </p>
            </div>
            <Link
              href="/report#fix-my-site"
              className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Get Expert Help
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
