'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UrlInput } from '@/components/ui/url-input';
import { useAuth } from '@/hooks/use-auth';
import { AnimatedStat } from '@/components/ui/animated-stat';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/radix-accordion';
import { AIBeamVisual } from '@/components/ui/ai-beam-visual';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon } from '@/components/ui/ai-icons';
import { PricingSection } from '@/components/pricing/pricing-section';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (url: string) => {
    if (!user) {
      router.push(`/login?next=/analysis&scanUrl=${encodeURIComponent(url)}`);
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
      router.push(`/analysis?scan=${id}`);
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
              AI Search Optimization
            </span>
          </div>

          <h1
            className="text-4xl font-bold leading-[1.08] tracking-tight animate-hero-fade sm:text-5xl lg:text-6xl text-text-primary"
            style={{ animationDelay: '80ms' }}
          >
            Is your business visible
            <br />
            <span className="bg-gradient-to-r from-[var(--color-primary-300)] to-[var(--color-primary-500)] bg-clip-text text-transparent">to AI search?</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed animate-hero-fade text-white/45" style={{ animationDelay: '160ms' }}>
            ChatGPT, Perplexity, and Gemini are replacing Google for millions of searches.
            See if they can find and recommend your business.
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

      {/* How it works */}
      <section id="how-it-works" className="relative px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Three steps to AI visibility
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center" style={{ color: 'var(--text-tertiary)' }}>
            Sign in once, then scan and reopen your reports whenever you need them.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-3 stagger-children">
            {[
              { step: '1', title: 'Enter your URL', desc: 'We crawl your site with real browser rendering — checking 19 factors across files, schema, content, and AI bot access.' },
              { step: '2', title: 'See your score', desc: 'Get a 0-100 AI visibility score across 6 dimensions with a prioritized list of what to fix, sorted by ROI.' },
              { step: '3', title: 'Fix everything', desc: 'Download ready-to-install files: llms.txt, robots.txt directives, JSON-LD schema, and sitemap — customized for your site.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
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
                <h3 className="mt-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Search Engines Interstitial */}
      <section className="relative px-4 py-8 pb-24 text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            We scan everywhere your customers are searching
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Our engine queries the top AI platforms in real-time to see exactly what they know about you.
          </p>
          <div className="mt-8">
            <AIBeamVisual />
          </div>
        </div>
      </section>

      {/* 6 Dimensions */}
      <section className="relative px-4 pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            What we check
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center" style={{ color: 'var(--text-tertiary)' }}>
            Six dimensions that determine how AI search engines see your business.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {[
              { title: 'File Presence', desc: 'robots.txt, sitemap.xml, llms.txt — the files AI crawlers look for first.', pts: '20 pts' },
              { title: 'Structured Data', desc: 'JSON-LD schema markup that tells AI who you are and what you do.', pts: '20 pts' },
              { title: 'Content Signals', desc: 'About pages, service depth, freshness, and contact information.', pts: '20 pts' },
              { title: 'Topical Authority', desc: 'Keyword focus, internal linking, and content depth across your site.', pts: '20 pts' },
              { title: 'Entity Clarity', desc: 'Brand consistency, social proof links, and authority signals.', pts: '10 pts' },
              { title: 'AI Registration', desc: 'GPTBot, PerplexityBot, ClaudeBot access and llms.txt references.', pts: '10 pts' },
            ].map((dim) => (
              <div
                key={dim.title}
                className="aiso-card-soft p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{dim.title}</h3>
                  <span className="aiso-kicker">{dim.pts}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection
        id="pricing"
        title="Choose the plan that matches your AI visibility workflow"
        description="Start with a free account, then upgrade when you need monitoring, multi-domain tracking, and a full implementation workspace."
        context="home"
        showFaq={false}
      />

      {/* FAQ */}
      <section id="resources" className="relative px-4 py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Frequently asked questions
          </h2>
          <div className="mt-10">
            <Accordion type="single" collapsible className="w-full">
              {[
                { q: 'What is AI search optimization?', a: 'AI search engines like ChatGPT, Perplexity, and Gemini are increasingly used to find businesses. Unlike traditional SEO, AI search relies on structured data, llms.txt files, and entity clarity to recommend your business. AISO audits how well your site is optimized for these AI crawlers.' },
                { q: 'What is an llms.txt file?', a: 'llms.txt is a proposed standard (like robots.txt for AI). It\'s a markdown file at your site root that describes your organization, key pages, and services in a format AI models can easily parse. AISO generates a custom llms.txt from your actual site content.' },
                { q: 'How does the scoring work?', a: 'We crawl your site using a real browser (same as AI crawlers), then run 19 checks across 6 dimensions: File Presence, Structured Data, Content Signals, Topical Authority, Entity Clarity, and AI Registration. Each check returns PASS, FAIL, or UNKNOWN. Total score is 0-100.' },
                { q: 'Is the audit really free?', a: 'Yes. The full audit with score breakdown is free. You only pay if you want auto-generated fix files (llms.txt, robots.txt, JSON-LD schema, sitemap) with step-by-step install instructions.' },
                { q: 'How long does the scan take?', a: 'About 30 seconds. We crawl up to 10 pages using real browser rendering, check robots.txt, sitemap.xml, and llms.txt, extract structured data, and score everything in real time.' },
                { q: 'Will you crawl my site safely?', a: 'Yes. We respect robots.txt, crawl at 1 request per second, limit to 10 pages, and use standard browser rendering. We don\'t store your content beyond the audit duration.' },
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
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Ready to check your AI visibility?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-white/40">
          Free audit. Real crawling. Actionable fixes. One login, then you&apos;re set.
        </p>
        <UrlInput onSubmit={handleSubmit} loading={loading} variant="elevated" className="mx-auto mt-8" />
      </section>
      </div>
    </div>
  );
}
