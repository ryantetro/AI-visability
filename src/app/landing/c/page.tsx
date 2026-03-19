'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isValidUrl } from '@/lib/url-utils';
import { useAuth } from '@/hooks/use-auth';
import { colors, brand } from '@/styles/tokens';

export default function LandingC() {
  const router = useRouter();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }
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
      {/* Hero — ultra minimal */}
      <section id="scan" className="px-4 pb-12 pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1
            className="text-5xl font-bold leading-[1.08] tracking-tight animate-fade-in-up sm:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Make your business
            <br />
            visible to AI
          </h1>
          <p
            className="mx-auto mt-6 max-w-md text-lg leading-relaxed animate-fade-in-up"
            style={{ color: 'var(--text-tertiary)', animationDelay: '100ms' }}
          >
            AI search is replacing traditional search. Check your score. Fix what&apos;s broken. Get recommended.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div
              className="flex items-center overflow-hidden"
              style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-card)' }}
            >
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                placeholder="yourbusiness.com"
                className="flex-1 bg-transparent px-4 py-3.5 text-base outline-none"
                style={{ color: 'var(--text-primary)' }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="mr-1.5 whitespace-nowrap px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary-600)', color: '#fff', borderRadius: 'var(--radius-md)' }}
              >
                {loading ? 'Scanning...' : 'Check Score'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          </form>

          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Free. 30 seconds. Secure account.
          </p>
        </div>
      </section>

      {/* Platform divider */}
      <section id="how-it-works" className="px-4 py-10">
        <div className="mx-auto flex max-w-md items-center justify-center gap-1">
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
          <span className="px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            We check ChatGPT, Perplexity, Gemini, and Claude
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
        </div>
      </section>

      {/* Feature list — text-driven */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-xl space-y-12">
          {[
            {
              title: 'Real crawling, not guessing',
              desc: 'We use a real browser to render your site — the same way AI crawlers see it. JavaScript-rendered content, dynamically loaded schema, single-page apps — all captured accurately.',
            },
            {
              title: '19 checks that matter',
              desc: 'Every check returns PASS, FAIL, or UNKNOWN. File presence, structured data, content signals, topical authority, entity clarity, and AI bot registration — scored 0 to 100.',
            },
            {
              title: 'Fixes ranked by ROI',
              desc: 'Not just a list of problems. Each fix is scored by points available, urgency, and effort required. The highest-impact, lowest-effort fixes come first.',
            },
            {
              title: 'Ready-to-install files',
              desc: 'llms.txt, robots.txt directives, JSON-LD schema, and sitemap — generated from your actual crawl data. Download, copy, or follow the step-by-step install guide.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Score bands — minimal strip */}
      <section id="pricing" className="px-4 py-16" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="mx-auto max-w-xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Score bands
          </h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { range: '80-100', label: 'AI Ready', color: colors.band.aiReady },
              { range: '60-79', label: 'Needs Work', color: colors.band.needsWork },
              { range: '40-59', label: 'At Risk', color: colors.band.atRisk },
              { range: '0-39', label: 'Not Visible', color: colors.band.notVisible },
            ].map((b) => (
              <div key={b.label}>
                <div className="mx-auto mb-2 h-1.5 w-full" style={{ backgroundColor: b.color, borderRadius: 'var(--radius-full)' }} />
                <p className="text-xs font-bold" style={{ color: b.color }}>{b.range}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we check — compact */}
      <section id="resources" className="px-4 py-16" style={{ backgroundColor: 'var(--surface-page)' }}>
        <div className="mx-auto max-w-xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            6 dimensions, 19 checks
          </h2>
          <div className="space-y-4">
            {[
              { dim: 'File Presence', detail: 'llms.txt, robots.txt, sitemap.xml, sitemap referenced in robots' },
              { dim: 'Structured Data', detail: 'Organization schema, completeness, FAQ schema, JSON-LD validation' },
              { dim: 'Content Signals', detail: 'About page, service page depth, content freshness, contact info' },
              { dim: 'Topical Authority', detail: 'Topical focus, keyword signals, internal linking, content depth' },
              { dim: 'Entity Clarity', detail: 'Name consistency, social media links, authority signals' },
              { dim: 'AI Registration', detail: 'GPTBot access, PerplexityBot access, ClaudeBot access, llms.txt refs' },
            ].map((item) => (
              <div key={item.dim} className="flex items-start gap-3 border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
                <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--text-primary)', width: 140 }}>{item.dim}</span>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The fix files */}
      <section className="px-4 py-16" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="mx-auto max-w-xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            What you get
          </h2>
          <div className="space-y-6">
            {[
              { file: 'llms.txt', desc: 'Custom description of your business for AI models — generated from your real pages and services.' },
              { file: 'robots.txt', desc: 'AI crawler allow directives merged with your existing rules. GPTBot, PerplexityBot, ClaudeBot.' },
              { file: 'organization-schema.json', desc: 'JSON-LD structured data with your business info, social links, and FAQ markup.' },
              { file: 'sitemap.xml', desc: 'Clean XML sitemap from crawled pages with correct priorities.' },
            ].map((item) => (
              <div key={item.file} className="flex items-start gap-4">
                <span className="shrink-0 font-mono text-sm font-medium" style={{ color: 'var(--color-primary-600)' }}>{item.file}</span>
                <span className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — minimal */}
      <section className="px-4 py-16" style={{ backgroundColor: 'var(--surface-page)' }}>
        <div className="mx-auto max-w-xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Questions
          </h2>
          <div className="space-y-6">
            {[
              { q: 'Is it free?', a: 'The full audit is free. Fix files are $35 one-time.' },
              { q: 'How long does it take?', a: 'About 30 seconds. We crawl up to 10 pages with real browser rendering.' },
              { q: 'What is llms.txt?', a: 'A proposed standard file (like robots.txt) that describes your site for AI models. We generate it from your actual content.' },
              { q: 'Is my data safe?', a: 'Crawl data is cached 24 hours then deleted. We never share your content.' },
              { q: 'How is this different from SEO?', a: 'Traditional SEO optimizes for Google. AISO optimizes for ChatGPT, Perplexity, Gemini, and Claude — which use different signals.' },
            ].map((item) => (
              <div key={item.q}>
                <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.q}</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 py-24 text-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Check your score
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Free audit. Secure sign-in. See how AI search engines see your business.
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-6 px-8 py-3 text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--color-primary-600)', color: '#fff', borderRadius: 'var(--radius-md)' }}
        >
          {brand.cta.scan}
        </button>
      </section>

      {/* Variant nav */}
      <section className="border-t px-4 py-6 text-center" style={{ borderColor: 'var(--border-default)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Landing page variants:{' '}
          <Link href="/" className="underline" style={{ color: 'var(--text-tertiary)' }}>A — Stripe</Link>
          {' '}&middot;{' '}
          <Link href="/landing/b" className="underline" style={{ color: 'var(--text-tertiary)' }}>B — Dark/Tool</Link>
          {' '}&middot;{' '}
          <span className="font-semibold" style={{ color: 'var(--color-primary-600)' }}>C (current)</span>
        </p>
      </section>
    </div>
  );
}
