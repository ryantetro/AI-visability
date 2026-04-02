'use client';

import { Sparkles } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';

const previewRows = [
  { prompt: 'Best project management tools for startups', volume: '12.4K', trend: '+18%', difficulty: 'High' },
  { prompt: 'How to improve team productivity', volume: '8.1K', trend: '+5%', difficulty: 'Medium' },
  { prompt: 'Top CRM software for small business', volume: '6.7K', trend: '+22%', difficulty: 'High' },
  { prompt: 'Free invoicing tools comparison', volume: '3.2K', trend: '-3%', difficulty: 'Low' },
];

export function PromptVolumeTeaser() {
  return (
    <DashboardPanel className="relative overflow-hidden p-5">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px]">
        <div className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-4 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-purple-500" />
          <p className="mt-2 text-sm font-semibold text-gray-900">Prompt Volume Intelligence</p>
          <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-gray-500">
            Discover how often real users ask AI engines the prompts that matter to your brand.
            Search volume, demand trends, and competitive density — coming soon.
          </p>
          <span className="mt-3 inline-block rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-purple-600">Coming soon</span>
        </div>
      </div>

      <SectionTitle eyebrow="Volume" title="Prompt search volume" description="Monthly search volume and demand trends for your tracked prompts" />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
          <p className="text-lg font-bold text-gray-700">30.4K</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total volume</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center">
          <p className="text-lg font-bold text-emerald-600">+12%</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Avg trend</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
          <p className="text-lg font-bold text-gray-700">4</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Tracked</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="pb-2 pr-4 font-medium">Prompt</th>
              <th className="pb-2 pr-4 font-medium">Volume</th>
              <th className="pb-2 pr-4 font-medium">Trend</th>
              <th className="pb-2 font-medium">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="max-w-[200px] truncate py-2.5 pr-4 text-gray-700">{row.prompt}</td>
                <td className="py-2.5 pr-4 font-medium tabular-nums text-gray-800">{row.volume}</td>
                <td className={cn('py-2.5 pr-4 font-medium tabular-nums', row.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500')}>{row.trend}</td>
                <td className="py-2.5">
                  <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', row.difficulty === 'High' && 'bg-red-50 text-red-600', row.difficulty === 'Medium' && 'bg-amber-50 text-amber-600', row.difficulty === 'Low' && 'bg-emerald-50 text-emerald-600')}>{row.difficulty}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}
