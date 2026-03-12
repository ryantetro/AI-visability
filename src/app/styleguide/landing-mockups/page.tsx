'use client';

import { useState } from 'react';
import { colors, brand } from '@/styles/tokens';

export default function LandingMockupsPage() {
  const [active, setActive] = useState<'A' | 'B' | 'C'>('A');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-page)' }}>
      {/* Mockup switcher */}
      <div
        className="sticky top-0 z-50 flex items-center justify-center gap-4 border-b px-4 py-3"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Landing Page Mockups:
        </span>
        {(['A', 'B', 'C'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: active === id ? 'var(--color-primary-600)' : 'transparent',
              color: active === id ? '#fff' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-full)',
              border: active === id ? 'none' : '1px solid var(--border-default)',
            }}
          >
            {id === 'A' && 'Stripe-Inspired'}
            {id === 'B' && 'Semrush/Ahrefs-Inspired'}
            {id === 'C' && 'Linear-Inspired'}
          </button>
        ))}
      </div>

      {active === 'A' && <MockupA />}
      {active === 'B' && <MockupB />}
      {active === 'C' && <MockupC />}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MOCKUP A: Stripe-Inspired
 * Clean, professional, gradient accent, stats-forward
 * Trustworthy business tool with visual polish
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MockupA() {
  return (
    <div>
      {/* Hero with subtle gradient background */}
      <section
        className="relative overflow-hidden px-4 pb-20 pt-24"
        style={{
          background: `linear-gradient(135deg, ${colors.primary[50]} 0%, #ffffff 40%, ${colors.accent[50]} 100%)`,
        }}
      >
        {/* Decorative gradient orb */}
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: colors.primary[300] }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${colors.primary[200]}`,
            }}
          >
            <span style={{
              display: 'inline-block', width: 6, height: 6,
              backgroundColor: colors.primary[500], borderRadius: '50%',
            }} />
            Free AI visibility audit — no signup required
          </div>

          <h1
            className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
            style={{ color: colors.neutral[900] }}
          >
            Is your business visible
            <br />
            <span style={{ color: colors.primary[600] }}>to AI search?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed" style={{ color: colors.neutral[500] }}>
            ChatGPT, Perplexity, and Gemini are replacing Google for millions of searches.
            Check if they can find, understand, and recommend your business.
          </p>

          {/* URL Input */}
          <div
            className="mx-auto mt-10 flex max-w-lg items-center gap-2 p-1.5"
            style={{
              backgroundColor: '#fff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: `1px solid ${colors.neutral[200]}`,
            }}
          >
            <input
              type="text"
              placeholder="yourbusiness.com"
              className="flex-1 bg-transparent px-4 py-3 text-base outline-none"
              style={{ color: colors.neutral[900] }}
            />
            <button
              className="whitespace-nowrap px-6 py-3 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: colors.primary[600],
                color: '#fff',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {brand.cta.scan}
            </button>
          </div>

          {/* AI Platform logos */}
          <div className="mx-auto mt-8 flex items-center justify-center gap-6">
            <span className="text-xs" style={{ color: colors.neutral[400] }}>Checks visibility on:</span>
            {['ChatGPT', 'Perplexity', 'Gemini', 'Claude'].map((name) => (
              <span key={name} className="text-xs font-medium" style={{ color: colors.neutral[500] }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section
        className="border-y px-4 py-8"
        style={{
          borderColor: colors.neutral[200],
          backgroundColor: '#fff',
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-around">
          {[
            { number: '19', label: 'Factors Analyzed' },
            { number: '6', label: 'AI Dimensions' },
            { number: '30s', label: 'Scan Time' },
            { number: '100%', label: 'Free Audit' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: colors.primary[600] }}>{stat.number}</p>
              <p className="mt-1 text-xs" style={{ color: colors.neutral[500] }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works (3 steps) */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: colors.neutral[900] }}>
            Three steps to AI visibility
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base" style={{ color: colors.neutral[500] }}>
            No signup, no credit card. See your score in seconds.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Enter your URL', desc: 'We crawl your site with real browser rendering — checking 19 factors across files, schema, content, and AI bot access.' },
              { step: '2', title: 'See your score', desc: 'Get a 0-100 AI visibility score across 6 dimensions with a prioritized list of what to fix, sorted by ROI.' },
              { step: '3', title: 'Fix everything', desc: 'Download ready-to-install files: llms.txt, robots.txt directives, JSON-LD schema, and sitemap — customized for your site.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="mx-auto flex h-10 w-10 items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: colors.primary[50],
                    color: colors.primary[600],
                    borderRadius: 'var(--radius-full)',
                    border: `2px solid ${colors.primary[200]}`,
                  }}
                >
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold" style={{ color: colors.neutral[900] }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.neutral[500] }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Dimension cards */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: colors.neutral[900] }}>
            What we check
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base" style={{ color: colors.neutral[500] }}>
            Six dimensions that determine how AI search engines see your business.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '📄', title: 'File Presence', desc: 'robots.txt, sitemap.xml, llms.txt — the files AI crawlers look for first.' },
              { icon: '🏗', title: 'Structured Data', desc: 'JSON-LD schema markup that tells AI who you are and what you do.' },
              { icon: '📝', title: 'Content Signals', desc: 'About pages, service depth, freshness, and contact information.' },
              { icon: '🎯', title: 'Topical Authority', desc: 'Keyword focus, internal linking, and content depth across your site.' },
              { icon: '🏢', title: 'Entity Clarity', desc: 'Brand consistency, social proof links, and authority signals.' },
              { icon: '🤖', title: 'AI Registration', desc: 'GPTBot, PerplexityBot, ClaudeBot access and llms.txt references.' },
            ].map((dim) => (
              <div
                key={dim.title}
                className="p-5"
                style={{
                  backgroundColor: '#fff',
                  border: `1px solid ${colors.neutral[200]}`,
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div className="mb-3 text-2xl">{dim.icon}</div>
                <h3 className="font-semibold" style={{ color: colors.neutral[900] }}>{dim.title}</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: colors.neutral[500] }}>{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score band explainer */}
      <section
        className="px-4 py-20"
        style={{ backgroundColor: colors.neutral[50] }}
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: colors.neutral[900] }}>
            What your score means
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { band: 'AI Ready', range: '80-100', color: colors.band.aiReady, bg: colors.bandBg.aiReady, desc: 'AI search engines can find and accurately describe your business. Keep it up.' },
              { band: 'Needs Work', range: '60-79', color: colors.band.needsWork, bg: colors.bandBg.needsWork, desc: 'Your site is partially visible but missing key signals. A few fixes can make a big difference.' },
              { band: 'At Risk', range: '40-59', color: colors.band.atRisk, bg: colors.bandBg.atRisk, desc: 'AI search is unlikely to recommend your business accurately. Action needed.' },
              { band: 'Not Visible', range: '0-39', color: colors.band.notVisible, bg: colors.bandBg.notVisible, desc: 'AI search engines can\'t find or understand your site. Your competitors are getting your traffic.' },
            ].map((item) => (
              <div
                key={item.band}
                className="flex items-start gap-4 p-5"
                style={{
                  backgroundColor: item.bg,
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${item.color}22`,
                }}
              >
                <span
                  className="mt-0.5 shrink-0 px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: item.color, borderRadius: 'var(--radius-full)' }}
                >
                  {item.range}
                </span>
                <div>
                  <h3 className="font-semibold" style={{ color: item.color }}>{item.band}</h3>
                  <p className="mt-1 text-sm" style={{ color: colors.neutral[600] }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: colors.neutral[900] }}>
          Ready to check your AI visibility?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base" style={{ color: colors.neutral[500] }}>
          Free audit. Real crawling. Actionable fixes. No signup required.
        </p>
        <div
          className="mx-auto mt-8 flex max-w-lg items-center gap-2 p-1.5"
          style={{
            backgroundColor: '#fff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <input
            type="text"
            placeholder="yourbusiness.com"
            className="flex-1 bg-transparent px-4 py-3 text-base outline-none"
            style={{ color: colors.neutral[900] }}
          />
          <button
            className="whitespace-nowrap px-6 py-3 text-sm font-semibold"
            style={{
              backgroundColor: colors.primary[600],
              color: '#fff',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {brand.cta.scan}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MOCKUP B: Semrush/Ahrefs-Inspired
 * Data-forward, tool-like hero, bold contrast CTA
 * Positioned as the authority tool for AI SEO
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MockupB() {
  return (
    <div>
      {/* Hero — dark, bold, tool-forward */}
      <section
        className="px-4 pb-24 pt-20"
        style={{
          background: `linear-gradient(180deg, ${colors.neutral[950]} 0%, ${colors.neutral[900]} 100%)`,
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          {/* AI platform bar */}
          <div className="mb-8 flex items-center justify-center gap-6">
            {['ChatGPT', 'Perplexity', 'Gemini', 'Claude', 'Google AI'].map((name) => (
              <span
                key={name}
                className="text-xs font-medium"
                style={{ color: colors.neutral[500] }}
              >
                {name}
              </span>
            ))}
          </div>

          <h1
            className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
            style={{ color: '#fff' }}
          >
            Win AI search visibility
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed" style={{ color: colors.neutral[400] }}>
            The all-in-one audit tool that checks how AI search engines see your website —
            and generates the files to fix it.
          </p>

          {/* Prominent URL input */}
          <div
            className="mx-auto mt-10 max-w-lg overflow-hidden"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${colors.neutral[700]}`,
              backgroundColor: colors.neutral[900],
            }}
          >
            <div className="flex items-center">
              <div className="flex items-center gap-2 border-r px-4 py-4" style={{ borderColor: colors.neutral[700] }}>
                <span className="text-xs font-medium" style={{ color: colors.neutral[500] }}>https://</span>
              </div>
              <input
                type="text"
                placeholder="Enter website or URL"
                className="flex-1 bg-transparent px-4 py-4 text-base outline-none"
                style={{ color: '#fff' }}
              />
              <button
                className="mx-2 whitespace-nowrap px-6 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: colors.primary[500],
                  color: '#fff',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Get AI Score
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs" style={{ color: colors.neutral[600] }}>
            Free audit — no signup required. Real Puppeteer crawling. Results in 30 seconds.
          </p>
        </div>
      </section>

      {/* Mock score preview — shows what you get */}
      <section className="px-4 py-16" style={{ backgroundColor: '#fff' }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide" style={{ color: colors.neutral[400] }}>
            What you&apos;ll get
          </h2>

          {/* Mock score card */}
          <div
            className="mx-auto mt-8 max-w-2xl overflow-hidden"
            style={{
              borderRadius: 'var(--radius-xl)',
              border: `1px solid ${colors.neutral[200]}`,
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Score header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: colors.neutral[50] }}>
              <div>
                <p className="text-xs font-medium" style={{ color: colors.neutral[500] }}>AI Visibility Score</p>
                <p className="text-sm font-semibold" style={{ color: colors.neutral[800] }}>example-business.com</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold" style={{ color: colors.band.needsWork }}>54</span>
                <div>
                  <span className="text-sm" style={{ color: colors.neutral[400] }}>/ 100</span>
                  <br />
                  <span
                    className="text-xs font-semibold text-white"
                    style={{ backgroundColor: colors.band.needsWork, borderRadius: 'var(--radius-full)', padding: '2px 8px' }}
                  >
                    Needs Work
                  </span>
                </div>
              </div>
            </div>
            {/* Dimension bars */}
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
                  <span className="w-36 text-xs font-medium" style={{ color: colors.neutral[600] }}>{dim.name}</span>
                  <div className="flex-1 h-2 overflow-hidden" style={{ backgroundColor: colors.neutral[100], borderRadius: 'var(--radius-full)' }}>
                    <div className="h-full" style={{ width: `${dim.score}%`, backgroundColor: dim.color, borderRadius: 'var(--radius-full)' }} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold" style={{ color: dim.color }}>{dim.score}%</span>
                </div>
              ))}
            </div>
            {/* Mock CTA */}
            <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: colors.neutral[200], backgroundColor: colors.primary[50] }}>
              <span className="text-sm font-medium" style={{ color: colors.primary[800] }}>12 issues found — 8 high priority</span>
              <span
                className="px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: colors.primary[600], borderRadius: 'var(--radius-md)' }}
              >
                Fix Everything — $99
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Dimension deep-dive */}
      <section className="px-4 py-20" style={{ backgroundColor: colors.neutral[50] }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: colors.neutral[900] }}>
            19 checks across 6 dimensions
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center" style={{ color: colors.neutral[500] }}>
            Every check returns PASS, FAIL, or UNKNOWN. No guessing — specific, actionable results.
          </p>

          <div className="mt-12 space-y-4">
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
                style={{
                  backgroundColor: '#fff',
                  border: `1px solid ${colors.neutral[200]}`,
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div>
                  <h3 className="font-semibold" style={{ color: colors.neutral[900] }}>{dim.title}</h3>
                  <p className="mt-0.5 text-sm" style={{ color: colors.neutral[500] }}>{dim.checks}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: colors.primary[600] }}>{dim.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="px-4 py-20 text-center"
        style={{
          background: `linear-gradient(180deg, ${colors.neutral[950]} 0%, ${colors.neutral[900]} 100%)`,
        }}
      >
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#fff' }}>
          Check your AI visibility now
        </h2>
        <p className="mx-auto mt-3 max-w-md" style={{ color: colors.neutral[400] }}>
          Your competitors might already be optimized. Find out where you stand.
        </p>
        <button
          className="mt-8 px-8 py-3.5 text-base font-semibold"
          style={{
            backgroundColor: colors.primary[500],
            color: '#fff',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {brand.cta.scan} — It&apos;s Free
        </button>
      </section>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MOCKUP C: Linear-Inspired
 * Ultra-minimal, one statement, confidence through restraint
 * Maximum whitespace, content does the selling
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MockupC() {
  return (
    <div>
      {/* Hero — ultra minimal, maximum impact */}
      <section className="px-4 pb-12 pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1
            className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Make your business
            <br />
            visible to AI
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            AI search is replacing traditional search. Check your score. Fix what&apos;s broken. Get recommended.
          </p>

          {/* URL Input — clean, minimal */}
          <div
            className="mx-auto mt-10 flex max-w-md items-center overflow-hidden"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-card)',
            }}
          >
            <input
              type="text"
              placeholder="yourbusiness.com"
              className="flex-1 bg-transparent px-4 py-3.5 text-base outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              className="mr-1.5 whitespace-nowrap px-5 py-2.5 text-sm font-semibold"
              style={{
                backgroundColor: 'var(--color-primary-600)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Check Score
            </button>
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Free. 30 seconds. No signup.
          </p>
        </div>
      </section>

      {/* Subtle divider with platforms */}
      <section className="px-4 py-10">
        <div className="mx-auto flex max-w-md items-center justify-center gap-1">
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
          <span className="px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            We check ChatGPT, Perplexity, Gemini, and Claude
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-default)' }} />
        </div>
      </section>

      {/* Feature list — restrained, text-driven */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-xl">
          <div className="space-y-12">
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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score bands — minimal */}
      <section className="px-4 py-16" style={{ backgroundColor: 'var(--surface-card)' }}>
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
                <div
                  className="mx-auto mb-2 h-1.5 w-full"
                  style={{ backgroundColor: b.color, borderRadius: 'var(--radius-full)' }}
                />
                <p className="text-xs font-bold" style={{ color: b.color }}>{b.range}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — simple */}
      <section className="px-4 py-24 text-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Check your score
        </h2>
        <button
          className="mt-6 px-8 py-3 text-sm font-semibold"
          style={{
            backgroundColor: 'var(--color-primary-600)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {brand.cta.scan}
        </button>
      </section>
    </div>
  );
}
