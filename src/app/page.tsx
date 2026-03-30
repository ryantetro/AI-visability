'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UrlInput } from '@/components/ui/url-input';
import { useAuth } from '@/hooks/use-auth';
import { AnimatedStat } from '@/components/ui/animated-stat';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/radix-accordion';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { PricingSection } from '@/components/pricing/pricing-section';
import { HeroRotatingAiHeadline } from '@/components/ui/hero-rotating-ai-headline';
import { ShiftSection } from '@/components/marketing/shift-section';
import { CapabilityPillars } from '@/components/marketing/capability-pillars';
import { HowItWorksSection } from '@/components/marketing/how-it-works-section';
import { AiEnginesSection } from '@/components/marketing/ai-engines-section';
import { DimensionsSection } from '@/components/marketing/dimensions-section';
import { ReportPreviewBand } from '@/components/marketing/report-preview-band';
import { SampleScoreCta } from '@/components/marketing/sample-score-cta';
import { AgenciesCtaBand } from '@/components/marketing/agencies-cta-band';
import { FadeIn } from '@/components/marketing/motion';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (url: string) => {
    if (!user) {
      router.push(`/login?scanUrl=${encodeURIComponent(url)}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429 && data.retryAfterSec) {
          const retryMinutes = Math.ceil(data.retryAfterSec / 60);
          throw new Error(`Free audit limit reached. Try again in about ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`);
        }
        throw new Error(data.error || 'Failed to start scan');
      }
      const { id } = await res.json();
      router.push(`/report?report=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section id="scan" className="relative overflow-hidden px-4 pb-24 pt-36 z-0" style={{ backgroundColor: 'var(--surface-page)' }}>
        {/* Soft ambient glow — very subtle, centered high */}
        <div
          className="absolute left-1/2 top-0 -z-10 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-[0.08] blur-[160px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-primary-400), transparent 70%)' }}
        />

        {/* Secondary warm accent glow — barely visible */}
        <div
          className="absolute left-1/2 top-20 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-accent-400), transparent 70%)' }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* Kicker pill */}
          <div className="mb-8 flex justify-center animate-hero-fade" style={{ animationDelay: '0ms' }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-[12px] font-medium tracking-wide text-white/40 uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary-400)] animate-pulse" />
              See How AI Finds Your Business
            </span>
          </div>

          <HeroRotatingAiHeadline
            className="animate-hero-fade sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '80ms' }}
          />

          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed animate-hero-fade text-white/45" style={{ animationDelay: '160ms' }}>
            Your customers are asking AI for recommendations.
            Find out if AI can find and recommend you — in 30 seconds.
          </p>

          <div className="mt-10 flex justify-center animate-hero-fade" style={{ animationDelay: '240ms' }}>
            <UrlInput onSubmit={handleSubmit} loading={loading} variant="elevated" />
          </div>
          {error && <p className="mt-3 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <div className="mt-5 flex items-center justify-center gap-6 animate-hero-fade" style={{ animationDelay: '320ms' }}>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-white/25 font-medium tracking-wide uppercase">Works with</span>
              <div className="flex items-center gap-3">
                {([
                  { Icon: ChatGPTIcon, color: 'text-[#8fd6c6]' },
                  { Icon: PerplexityIcon, color: 'text-[#62dbef]' },
                  { Icon: GeminiIcon, color: 'text-[#7ba9ff]' },
                  { Icon: ClaudeIcon, color: 'text-[#f1a07b]' },
                  { Icon: GrokIcon, color: 'text-[#f5f5f5]' },
                ] as const).map(({ Icon, color }, i) => (
                  <span key={i} className={`flex items-center justify-center ${color}`}>
                    <Icon className="size-4.5" />
                  </span>
                ))}
              </div>
            </div>
            <span className="text-white/10">|</span>
            <Link href="/pricing" className="text-[12px] font-medium text-white/30 transition-colors duration-150 hover:text-white/60 tracking-wide uppercase">
              View Pricing
            </Link>
          </div>

          {/* Stats Row */}
          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-2xl flex-nowrap items-center justify-between animate-hero-fade" style={{ animationDelay: '400ms' }}>
            <AnimatedStat value={19} label="Factors Analyzed" />
            <div className="h-6 w-px bg-white/[0.06]" />
            <AnimatedStat value={6} label="AI Dimensions" />
            <div className="h-6 w-px bg-white/[0.06]" />
            <AnimatedStat value={30} suffix="s" label="Scan Time" />
            <div className="h-6 w-px bg-white/[0.06]" />
            <AnimatedStat value={100} suffix="%" label="Free Audit" />
          </div>
        </div>

        {/* Soft bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--surface-page)] via-[var(--surface-page)]/80 to-transparent" />
      </section>

      <div className="relative overflow-hidden" style={{ backgroundColor: 'var(--surface-page)' }}>
      <ShiftSection />
      <CapabilityPillars />
      <HowItWorksSection />
      <AiEnginesSection />
      <DimensionsSection />
      <ReportPreviewBand />

      <PricingSection
        id="pricing"
        title="Choose the plan that matches your AI visibility workflow"
        description="Start with a free account, then upgrade when you need monitoring, multi-domain tracking, and a full implementation workspace."
        context="home"
        showFaq={false}
      />

      <SampleScoreCta />
      <AgenciesCtaBand />

      {/* FAQ */}
      <section id="resources" className="relative px-4 py-24">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Frequently asked questions
            </h2>
          </FadeIn>
          <div className="mt-10">
            <Accordion type="single" collapsible className="w-full">
              {[
                { q: 'Is the audit really free?', a: 'Yes. The full audit with score breakdown is completely free — no credit card required. You only pay if you want auto-generated fix files and ongoing monitoring.' },
                { q: 'How long does the scan take?', a: 'About 30 seconds. We crawl up to 10 pages, check your key files, extract structured data, and score everything in real time.' },
                { q: 'Will you crawl my site safely?', a: 'Yes. We respect robots.txt, crawl at 1 request per second, limit to 10 pages, and use standard browser rendering. We don\'t store your content beyond the audit.' },
                { q: 'What is AI search optimization?', a: 'AI search engines like ChatGPT, Perplexity, and Gemini are increasingly used to find businesses. Unlike traditional SEO, AI search relies on structured data, special files, and clear content to recommend your business. airadr audits how well your site is optimized for these AI platforms.' },
                { q: 'How does the scoring work?', a: 'We check 19 factors across 6 categories: Crawler Access, Structured Data, Content Quality, Your Expertise, Your Identity, and AI Access. Higher score means AI engines can find and recommend you more easily. Scores range from 0–100.' },
                { q: 'What is an llms.txt file?', a: 'llms.txt is a new standard (like robots.txt, but for AI). It\'s a file on your site that describes your business in a format AI models can easily read. airadr generates a custom one from your actual site content.' },
              ].map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-lg hover:no-underline" style={{ color: 'var(--text-primary)' }}>
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-4 py-24 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Most businesses aren&apos;t optimized for AI search yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/40">
            See what ChatGPT knows about you — takes 30 seconds, completely free.
          </p>
          <UrlInput onSubmit={handleSubmit} loading={loading} variant="elevated" className="mx-auto mt-8" />
        </FadeIn>
      </section>
      </div>
    </div>
  );
}
