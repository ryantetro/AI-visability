'use client';

import { AIBeamVisual } from '@/components/ui/ai-beam-visual';
import { FadeIn } from '@/components/marketing/motion';

export function AiEnginesSection() {
  return (
    <section className="relative px-4 py-8 pb-24 text-center">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            We scan everywhere your customers are searching
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Our engine queries the top AI platforms in real-time to see exactly what they know about you.
          </p>
        </FadeIn>
        <FadeIn delay={0.06} className="mt-8">
          <AIBeamVisual />
        </FadeIn>
      </div>
    </section>
  );
}
