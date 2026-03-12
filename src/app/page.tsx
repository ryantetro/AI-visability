'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UrlInput } from '@/components/ui/url-input';
import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { AnimatedStat } from '@/components/ui/animated-stat';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/radix-accordion';
import { AIBeamVisual } from '@/components/ui/ai-beam-visual';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon } from '@/components/ui/ai-icons';
import { colors } from '@/styles/tokens';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (url: string) => {
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
      router.push(`/scan/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-32 z-0" style={{ backgroundColor: 'var(--surface-page)' }}>
        {/* Subtle branded glow at the top center */}
        <div
          className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
        />

        {/* Neutral flickering grid with radial fade out */}
        <FlickeringGrid
          className="absolute inset-0 -z-10 h-full w-full"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 0%, transparent 100%)',
          }}
          squareSize={4}
          gridGap={6}
          color="#ffffff"
          maxOpacity={0.15}
          flickerChance={0.05}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1
            className="text-5xl font-bold leading-[1.1] tracking-tight animate-fade-in-up sm:text-6xl text-text-primary"
          >
            Is your business visible
            <br />
            <span style={{ color: 'var(--color-primary-600)' }}>to AI search?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed animate-fade-in-up text-text-secondary" style={{ animationDelay: '100ms' }}>
            ChatGPT, Perplexity, and Gemini are replacing Google for millions of searches.
            Check if they can find, understand, and recommend your business.
          </p>

          <div className="mt-10 flex justify-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <UrlInput onSubmit={handleSubmit} loading={loading} variant="elevated" />
          </div>
          {error && <p className="mt-3 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="text-xs text-text-tertiary">Checks visibility on:</span>
            {([
              { Icon: ChatGPTIcon, color: 'text-white' },
              { Icon: PerplexityIcon, color: 'text-[#20B8CD]' },
              { Icon: GeminiIcon, color: 'text-[#8ab4f8]' },
              { Icon: ClaudeIcon, color: 'text-[#d97757]' },
            ] as const).map(({ Icon, color }, i) => (
              <span key={i} className={`flex items-center gap-1.5 ${color}`}>
                <Icon className="size-3.5" />
              </span>
            ))}
          </div>

          {/* Integrated Stats Row */}
          <div className="relative z-10 mx-auto mt-16 flex w-full max-w-3xl flex-nowrap items-center justify-between animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <AnimatedStat value={19} label="Factors Analyzed" />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />
            <AnimatedStat value={6} label="AI Dimensions" />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />
            <AnimatedStat value={30} suffix="s" label="Scan Time" />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />
            <AnimatedStat value={100} suffix="%" label="Free Audit" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--surface-page)' }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Three steps to AI visibility
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center" style={{ color: 'var(--text-tertiary)' }}>
            No signup, no credit card. See your score in seconds.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3 stagger-children">
            {[
              { step: '1', title: 'Enter your URL', desc: 'We crawl your site with real browser rendering — checking 19 factors across files, schema, content, and AI bot access.' },
              { step: '2', title: 'See your score', desc: 'Get a 0-100 AI visibility score across 6 dimensions with a prioritized list of what to fix, sorted by ROI.' },
              { step: '3', title: 'Fix everything', desc: 'Download ready-to-install files: llms.txt, robots.txt directives, JSON-LD schema, and sitemap — customized for your site.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: 'var(--color-primary-50)',
                    color: 'var(--color-primary-600)',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-primary-200)',
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
      <section className="px-4 py-8 pb-20 text-center" style={{ backgroundColor: 'var(--surface-page)' }}>
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
      <section className="px-4 pb-20" style={{ backgroundColor: 'var(--surface-page)' }}>
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

      {/* Score bands */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            What your score means
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { band: 'AI Ready', range: '80-100', color: colors.band.aiReady, bg: colors.bandBg.aiReady, desc: 'AI search engines can find and accurately describe your business. Keep it up.' },
              { band: 'Needs Work', range: '60-79', color: colors.band.needsWork, bg: colors.bandBg.needsWork, desc: 'Your site is partially visible but missing key signals. A few fixes make a big difference.' },
              { band: 'At Risk', range: '40-59', color: colors.band.atRisk, bg: colors.bandBg.atRisk, desc: 'AI search is unlikely to recommend your business accurately. Action needed.' },
              { band: 'Not Visible', range: '0-39', color: colors.band.notVisible, bg: colors.bandBg.notVisible, desc: 'AI search engines can\'t find or understand your site. Your competitors are getting your traffic.' },
            ].map((item) => (
              <div
                key={item.band}
                className="aiso-card flex items-start gap-5 p-6"
                style={{
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: item.color, transform: 'translate(30%, -30%)' }} />
                <span
                  className="mt-1 shrink-0 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-sm"
                  style={{ backgroundColor: item.color, borderRadius: 'var(--radius-md)' }}
                >
                  {item.range}
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-tight" style={{ color: item.color }}>{item.band}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--surface-page)' }}>
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
      <section className="px-4 py-20 text-center" style={{ backgroundColor: 'var(--surface-page)' }}>
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Ready to check your AI visibility?
        </h2>
        <p className="mx-auto mt-3 max-w-md" style={{ color: 'var(--text-tertiary)' }}>
          Free audit. Real crawling. Actionable fixes. No signup required.
        </p>
        <div className="mt-8 flex justify-center">
          <UrlInput onSubmit={handleSubmit} loading={loading} variant="elevated" />
        </div>
      </section>

      {/* Landing page variants nav */}
      <section className="border-t px-4 py-6 text-center" style={{ borderColor: 'var(--border-default)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Landing page variants:{' '}
          <span className="font-semibold" style={{ color: 'var(--color-primary-600)' }}>A (current)</span>
          {' '}&middot;{' '}
          <Link href="/landing/b" className="underline" style={{ color: 'var(--text-tertiary)' }}>B — Dark/Tool</Link>
          {' '}&middot;{' '}
          <Link href="/landing/c" className="underline" style={{ color: 'var(--text-tertiary)' }}>C — Minimal</Link>
        </p>
      </section>
    </div>
  );
}
