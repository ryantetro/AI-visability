'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, Hash, MessageSquare, TrendingUp, Wrench, Zap } from 'lucide-react';
import Link from 'next/link';
import { FadeIn } from '@/components/marketing/motion';
import { cn } from '@/lib/utils';

type DemoTab = 'score' | 'fixes' | 'prompts';

const TABS: { key: DemoTab; label: string; icon: typeof Eye }[] = [
  { key: 'score', label: 'Your Score', icon: Eye },
  { key: 'fixes', label: 'Fix List', icon: Wrench },
  { key: 'prompts', label: 'AI Mentions', icon: MessageSquare },
];

const MOCK_FIXES = [
  { label: 'Create an llms.txt file', lift: 8, effort: 'Quick', category: 'AI' },
  { label: 'Add Organization JSON-LD schema', lift: 6, effort: 'Medium', category: 'Web' },
  { label: 'Allow GPTBot in robots.txt', lift: 5, effort: 'Quick', category: 'AI' },
  { label: 'Add FAQ structured data', lift: 4, effort: 'Medium', category: 'Web' },
  { label: 'Expand About page to 300+ words', lift: 3, effort: 'Medium', category: 'Web' },
];

const MOCK_PROMPTS = [
  { text: 'Best plumbers in Austin TX', mentioned: true, engines: 4, total: 5 },
  { text: 'Who should I hire for kitchen remodel', mentioned: false, engines: 0, total: 5 },
  { text: 'Affordable home repair services near me', mentioned: true, engines: 2, total: 5 },
  { text: 'Emergency plumbing companies with good reviews', mentioned: false, engines: 0, total: 5 },
  { text: 'Top rated contractors for bathroom renovation', mentioned: true, engines: 3, total: 5 },
];

const TAB_VARIANTS = {
  enter: { opacity: 0, y: 6 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function ScoreTab() {
  return (
    <div className="p-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">AI Visibility</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-green-600">72</span>
            <span className="text-sm text-gray-400">%</span>
          </div>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-green-600">
            <TrendingUp className="h-3 w-3" />
            +28% potential
          </span>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Average Rank</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">#3</span>
          </div>
          <span className="mt-1 text-[10px] text-gray-500">Across ranked AI responses</span>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mention Rate</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">48</span>
            <span className="text-sm text-gray-400">%</span>
          </div>
          <span className="mt-1 text-[10px] text-gray-500">Across 5 AI platforms</span>
        </div>
      </div>

      {/* Action plan preview */}
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
        <h4 className="text-xs font-bold text-gray-800">Your Action Plan</h4>
        <div className="mt-3 space-y-2">
          {[
            { step: 1, label: 'Fix Your Ranking', status: 'active' },
            { step: 2, label: 'Improve AI Presence', status: 'locked' },
            { step: 3, label: 'Monitor & Grow', status: 'locked' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-2">
              {item.status === 'active' ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{item.step}</div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-400">{item.step}</div>
              )}
              <span className={cn('text-xs font-medium', item.status === 'active' ? 'text-gray-800' : 'text-gray-400')}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixesTab() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-bold text-gray-900">Quick Wins</span>
        <span className="text-xs text-gray-500">— highest-impact fixes</span>
      </div>
      <div className="space-y-2">
        {MOCK_FIXES.map((fix, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
            <span className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
              i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            )}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800">{fix.label}</p>
            </div>
            <span className="text-[10px] font-semibold text-green-600">+{fix.lift} pts</span>
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-semibold',
              fix.effort === 'Quick' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            )}>
              {fix.effort}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-center">
        <p className="text-xs font-semibold text-gray-700">Want these done for you?</p>
        <p className="mt-0.5 text-[10px] text-gray-500">Our experts handle everything — typically within 48 hours</p>
      </div>
    </div>
  );
}

function PromptsTab() {
  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          2 not mentioned
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
          3 performing well
        </span>
      </div>
      <div className="space-y-1.5">
        {MOCK_PROMPTS.map((prompt, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
            {prompt.mentioned ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-red-300" />
            )}
            <p className="min-w-0 flex-1 truncate text-[11px] text-gray-700">{prompt.text}</p>
            <span className="shrink-0 text-[10px] text-gray-400">
              {prompt.engines}/{prompt.total}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
        <p className="text-xs font-semibold text-gray-700">Improve your mention rate</p>
        <p className="mt-0.5 text-[10px] text-gray-500">Targeted content helps AI engines recommend you for these prompts</p>
      </div>
    </div>
  );
}

const TAB_CONTENT: Record<DemoTab, React.FC> = {
  score: ScoreTab,
  fixes: FixesTab,
  prompts: PromptsTab,
};

export function InteractiveDemoSection() {
  const [activeTab, setActiveTab] = useState<DemoTab>('score');

  const ActiveContent = TAB_CONTENT[activeTab];

  return (
    <section className="relative border-t border-gray-200/80 bg-gray-50/60 px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <FadeIn>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Your AI visibility dashboard, instantly
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                In 30 seconds, see your score, a prioritized list of fixes, and which AI prompts mention your business. Everything you need to take action — no guesswork.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { label: 'See your score & how to fix it', desc: 'A clear 0-100 score with the exact steps to improve' },
                  { label: 'Track what AI says about you', desc: 'Monitor which prompts mention you across 5 platforms' },
                  { label: 'Get expert implementation', desc: 'Our team handles the fixes so you can focus on your business' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/#scan"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Try It Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>

          {/* Right: Interactive demo */}
          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 rounded-md bg-white border border-gray-200 px-3 py-1 text-[10px] text-gray-400 font-mono">
                  app.aiso.ai/dashboard
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-gray-100">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors duration-200',
                        activeTab === tab.key
                          ? 'text-blue-700 bg-blue-50/30'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {/* Animated underline */}
                      {activeTab === tab.key && (
                        <motion.div
                          layoutId="demo-tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content — fixed height with crossfade */}
              <div className="relative h-[390px] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    variants={TAB_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="absolute inset-0 overflow-y-auto"
                  >
                    <ActiveContent />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
