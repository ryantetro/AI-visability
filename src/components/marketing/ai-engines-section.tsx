'use client';

import { Radio } from 'lucide-react';
import { AIBeamVisual } from '@/components/ui/ai-beam-visual';
import { FadeIn } from '@/components/marketing/motion';

export function AiEnginesSection() {
  return (
    <section className="relative border-t border-gray-200/80 px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              We scan everywhere your customers are searching
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Our engine queries the top AI platforms in real-time to see exactly what they know about you.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <AIBeamVisual />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
