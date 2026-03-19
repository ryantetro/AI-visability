'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isValidUrl } from '@/lib/url-utils';
import { useAuth } from '@/hooks/use-auth';
import { colors, brand } from '@/styles/tokens';

export default function LandingB() {
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
      {/* Hero — dark, tool-forward */}
      <section
        id="scan"
        className="px-4 pb-24 pt-20"
        style={{ background: `linear-gradient(180deg, ${colors.neutral[950]} 0%, ${colors.neutral[900]} 100%)` }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {['ChatGPT', 'Perplexity', 'Gemini', 'Claude', 'Google AI'].map((name) => (
              <span key={name} className="text-xs font-medium" style={{ color: colors.neutral[500] }}>{name}</span>
            ))}
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight animate-fade-in-up sm:text-6xl" style={{ color: '#fff' }}>
            Win AI search visibility
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed animate-fade-in-up" style={{ color: colors.neutral[400], animationDelay: '100ms' }}>
            The all-in-one audit tool that checks how AI search engines see your website — and generates the files to fix it.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-lg animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div
              className="overflow-hidden"
              style={{ borderRadius: 'var(--radius-lg)', border: `1px solid ${colors.neutral[700]}`, backgroundColor: colors.neutral[900] }}
            >
              <div className="flex items-center">
                <div className="flex items-center gap-2 border-r px-4 py-4" style={{ borderColor: colors.neutral[700] }}>
                  <span className="text-xs font-medium" style={{ color: colors.neutral[500] }}>https://</span>
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); }}
                  placeholder="Enter website or URL"
                  className="flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-neutral-600"
                  style={{ color: '#fff' }}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mx-2 whitespace-nowrap px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: colors.primary[500], color: '#fff', borderRadius: 'var(--radius-md)' }}
                >
                  {loading ? 'Scanning...' : 'Get AI Score'}
                </button>
              </div>
            </div>
            {error && <p className="mt-3 text-sm" style={{ color: colors.band.notVisible }}>{error}</p>}
          </form>

          <p className="mt-4 text-xs" style={{ color: colors.neutral[600] }}>
            Free audit. Secure account. Real Puppeteer crawling. Results in about 30 seconds.
          </p>
        </div>
      </section>

      {/* Mock score card preview */}
      <section id="how-it-works" className="px-4 py-16" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            What you&apos;ll get
          </h2>
          <div
            className="mx-auto mt-8 max-w-2xl overflow-hidden"
            style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
          >
            <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: 'var(--color-neutral-50)' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>AI Visibility Score</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>example-business.com</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold" style={{ color: colors.band.needsWork }}>54</span>
                <div>
                  <span className="text-xs font-semibold text-white" style={{ backgroundColor: colors.band.needsWork, borderRadius: 'var(--radius-full)', padding: '2px 8px' }}>Needs Work</span>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-6">
              {[
                { name: 'File Presence', score: 45, color: colors.band.atRisk },
                { name: 'Structured Data', score: 75, color: colors.band.needsWork },
                { name: 'Content Signals', score: 60, color: colors.band.needsWork },
                { name: 'Topical Authority', score: 55, color: colors.band.atRisk },
                { name: 'Entity Clarity', score: 40, color: colors.band.atRisk },
                { name: 'AI Registration', score: 50, color: colors.band.atRisk },
              ].map((dim) => (
                <div key={dim.name} className="flex items-center gap-3">
                  <span className="w-36 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{dim.name}</span>
                  <div className="h-2 flex-1 overflow-hidden" style={{ backgroundColor: 'var(--color-neutral-100)', borderRadius: 'var(--radius-full)' }}>
                    <div className="h-full" style={{ width: `${dim.score}%`, backgroundColor: dim.color, borderRadius: 'var(--radius-full)' }} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold" style={{ color: dim.color }}>{dim.score}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--color-primary-50)' }}>
              <span className="text-sm font-medium" style={{ color: colors.primary[800] }}>12 issues found — 8 high priority</span>
              <span className="px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: colors.primary[600], borderRadius: 'var(--radius-md)' }}>
                {brand.cta.purchase} — $35
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 19 checks breakdown */}
      <section id="pricing" className="px-4 py-20" style={{ backgroundColor: 'var(--surface-page)' }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            19 checks across 6 dimensions
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center" style={{ color: 'var(--text-tertiary)' }}>
            Every check returns PASS, FAIL, or UNKNOWN. No guessing — specific, actionable results.
          </p>
          <div className="mt-12 space-y-4 stagger-children">
            {[
              { title: 'File Presence', checks: 'llms.txt, robots.txt, sitemap.xml, sitemap in robots', points: 20 },
              { title: 'Structured Data', checks: 'Org schema, completeness, FAQ schema, validation', points: 20 },
              { title: 'Content Signals', checks: 'About page, service depth, freshness, contact info', points: 20 },
              { title: 'Topical Authority', checks: 'Focus, keywords, linking, depth', points: 20 },
              { title: 'Entity Clarity', checks: 'Name consistency, social links, authority signals', points: 10 },
              { title: 'AI Registration', checks: 'GPTBot, PerplexityBot, ClaudeBot, llms.txt refs', points: 10 },
            ].map((dim) => (
              <div
                key={dim.title}
                className="flex items-center justify-between p-5"
                style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}
              >
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{dim.title}</h3>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>{dim.checks}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: colors.primary[600] }}>{dim.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What gets fixed */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            What you get when you fix
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center" style={{ color: 'var(--text-tertiary)' }}>
            Auto-generated, ready-to-install files customized from your real crawl data.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { file: 'llms.txt', desc: 'A custom description of your business for AI models. Generated from your actual pages, services, and content.' },
              { file: 'robots.txt', desc: 'AI bot allow directives for GPTBot, PerplexityBot, ClaudeBot, and others. Merged with your existing rules.' },
              { file: 'schema.json', desc: 'Organization and FAQ JSON-LD markup with your real business data, social links, and contact info.' },
              { file: 'sitemap.xml', desc: 'Clean sitemap from your crawled pages with proper priorities and change frequencies.' },
            ].map((item) => (
              <div key={item.file} className="p-5" style={{ backgroundColor: 'var(--surface-page)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
                <h3 className="font-mono text-sm font-semibold" style={{ color: colors.primary[600] }}>{item.file}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="resources" className="px-4 py-20" style={{ backgroundColor: 'var(--surface-page)' }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Common questions
          </h2>
          <div className="mt-10 space-y-6">
            {[
              { q: 'Is the audit really free?', a: 'Yes — full audit with score and dimension breakdown. You only pay for auto-generated fix files.' },
              { q: 'How is this different from SEO tools?', a: 'Traditional SEO tools check Google signals. AISO checks AI-specific signals: llms.txt, AI bot access, entity clarity, and structured data that AI models use to recommend businesses.' },
              { q: 'What if my site blocks crawlers?', a: 'We fall back to HTTP crawling and score what we can. Checks that require full access return UNKNOWN (no penalty) with guidance on how to fix access.' },
              { q: 'Do you store my site content?', a: 'Crawl data is cached for 24 hours for re-scoring, then deleted. We never publish or share your site content.' },
            ].map((item) => (
              <div key={item.q} className="border-b pb-6" style={{ borderColor: 'var(--border-default)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — dark */}
      <section className="px-4 py-20 text-center" style={{ background: `linear-gradient(180deg, ${colors.neutral[950]} 0%, ${colors.neutral[900]} 100%)` }}>
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#fff' }}>
          Check your AI visibility now
        </h2>
        <p className="mx-auto mt-3 max-w-md" style={{ color: colors.neutral[400] }}>
          Your competitors might already be optimized. Find out where you stand.
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-8 px-8 py-3.5 text-base font-semibold transition-colors"
          style={{ backgroundColor: colors.primary[500], color: '#fff', borderRadius: 'var(--radius-md)' }}
        >
          {brand.cta.scan} — It&apos;s Free
        </button>
      </section>

      {/* Variant nav */}
      <section className="border-t px-4 py-6 text-center" style={{ borderColor: 'var(--border-default)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Landing page variants:{' '}
          <Link href="/" className="underline" style={{ color: 'var(--text-tertiary)' }}>A — Stripe</Link>
          {' '}&middot;{' '}
          <span className="font-semibold" style={{ color: 'var(--color-primary-600)' }}>B (current)</span>
          {' '}&middot;{' '}
          <Link href="/landing/c" className="underline" style={{ color: 'var(--text-tertiary)' }}>C — Minimal</Link>
        </p>
      </section>
    </div>
  );
}
