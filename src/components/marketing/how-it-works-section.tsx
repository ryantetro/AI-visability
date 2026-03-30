'use client';

import { FadeIn, StaggerGrid, StaggerItem } from '@/components/marketing/motion';

const STEPS = [
  { step: '1', title: 'Enter your URL', desc: 'We crawl your site the same way AI bots do — checking 19 factors across content, structure, and AI crawler access.' },
  { step: '2', title: 'See your score', desc: 'Get a 0–100 score with a clear breakdown of what AI engines can (and can’t) find, plus a prioritized fix list.' },
  { step: '3', title: 'Fix everything', desc: 'Download ready-to-install files customized for your site — plus copy-paste prompts for ChatGPT or Claude to guide you step by step.' },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Three steps to AI visibility
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center" style={{ color: 'var(--text-tertiary)' }}>
            Sign in once, then scan and reopen your reports whenever you need them.
          </p>
        </FadeIn>
        <StaggerGrid className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((item) => (
            <StaggerItem key={item.step}>
              <div className="text-center">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center text-sm font-semibold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    color: 'var(--color-primary-400)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {item.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
