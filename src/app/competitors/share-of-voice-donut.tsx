'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { BrandFavicon } from '@/app/advanced/panels/shared';
import type { CompetitorComparisonData, ShareOfVoiceSlice } from '@/types/competitors';

// User always gets blue (identity color), competitors get distinct colors
const USER_COLOR = '#3b82f6';
const COMPETITOR_COLORS = ['#f59e0b', '#a855f7', '#ef4444'];

function buildSlices(data: CompetitorComparisonData): ShareOfVoiceSlice[] {
  const userVisibility = data.userBrand.mentionSummary?.visibilityPct ?? 0;

  const entries: { name: string; raw: number; isUser: boolean }[] = [
    { name: data.userBrand.domain, raw: userVisibility, isUser: true },
  ];

  for (const comp of data.competitors) {
    if (comp.status !== 'complete' || !comp.scanData?.mentionSummary) continue;
    entries.push({
      name: comp.competitorDomain,
      raw: comp.scanData.mentionSummary.visibilityPct ?? 0,
      isUser: false,
    });
  }

  const totalRaw = entries.reduce((sum, e) => sum + e.raw, 0);
  let compIdx = 0;

  function getColor(isUser: boolean) {
    if (isUser) return USER_COLOR;
    return COMPETITOR_COLORS[compIdx++ % COMPETITOR_COLORS.length];
  }

  if (totalRaw === 0) {
    return entries.map((e) => ({
      name: e.name,
      value: Math.round(100 / entries.length),
      color: getColor(e.isUser),
      isUser: e.isUser,
    }));
  }

  return entries.map((e) => ({
    name: e.name,
    value: Math.round((e.raw / totalRaw) * 100),
    color: getColor(e.isUser),
    isUser: e.isUser,
  }));
}

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = Date.now();
    const startVal = 0;

    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + (target - startVal) * eased));

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }, [target]);

  return <>{count}</>;
}

export function ShareOfVoiceDonut({ data }: { data: CompetitorComparisonData }) {
  const slices = buildSlices(data);
  const userSlice = slices.find((s) => s.isUser);
  const hasData = data.competitors.some(
    (c) => c.status === 'complete' && c.scanData?.mentionSummary
  );

  if (!hasData) return null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="AI presence"
        title="Share of Voice"
        description="How your AI visibility compares across all tracked brands."
      />

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-12">
        {/* Donut chart */}
        <div className="relative h-[200px] w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                strokeWidth={0}
                animationDuration={1200}
              >
                {slices.map((slice, i) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-3xl font-bold"
              style={{ color: userSlice?.color ?? '#25c972' }}
            >
              <AnimatedCounter target={userSlice?.value ?? 0} />%
            </motion.span>
            <span className="text-[10px] text-zinc-500">Your SOV</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3">
          {slices.map((slice) => (
            <div key={slice.name} className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex items-center gap-2">
                <BrandFavicon name={slice.name} size={16} />
                <span className="text-[12px] text-zinc-300">{slice.name}</span>
              </div>
              <span
                className="ml-auto text-[12px] font-semibold tabular-nums"
                style={{ color: slice.color }}
              >
                {slice.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}
