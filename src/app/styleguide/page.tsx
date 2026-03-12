'use client';

import { Check, LoaderCircle, ShieldCheck, CircleCheck, CircleX } from 'lucide-react';
import { colors, components, brand, motion } from '@/styles/tokens';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SubscriptionCard } from '@/components/ui/subscription-card';

export default function StyleGuidePage() {
  return (
    <div className="mx-auto max-w-[1024px] px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          AISO Brand Style Guide
        </h1>
        <p className="mt-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
          Design tokens, colors, typography, and component patterns.
        </p>
      </div>

      {/* ─── Brand Identity ─── */}
      <Section title="Brand Identity">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Name & Tagline
            </h3>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-primary-600)' }}>AISO</p>
            <p className="mt-1 text-lg" style={{ color: 'var(--text-secondary)' }}>{brand.tagline}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{brand.descriptor}</p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              CTA Labels
            </h3>
            <div className="space-y-2">
              {Object.entries(brand.cta).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 text-xs" style={{ color: 'var(--text-muted)' }}>{key}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>&ldquo;{label}&rdquo;</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="mt-6 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Voice & Tone
          </h3>
          <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {brand.voice.tone}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-success)' }}>DO</p>
              <ul className="space-y-1">
                {brand.voice.do.map((item, i) => (
                  <li key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-error)' }}>DON&apos;T</p>
              <ul className="space-y-1">
                {brand.voice.dont.map((item, i) => (
                  <li key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </Section>

      {/* ─── Colors ─── */}
      <Section title="Color System">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Primary — Emerald Green</h3>
        <ColorRow
          colors={[
            { name: '50', value: colors.primary[50] },
            { name: '100', value: colors.primary[100] },
            { name: '200', value: colors.primary[200] },
            { name: '300', value: colors.primary[300] },
            { name: '400', value: colors.primary[400] },
            { name: '500', value: colors.primary[500] },
            { name: '600', value: colors.primary[600] },
            { name: '700', value: colors.primary[700] },
            { name: '800', value: colors.primary[800] },
            { name: '900', value: colors.primary[900] },
            { name: '950', value: colors.primary[950] },
          ]}
        />

        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Neutral — Warm Gray</h3>
        <ColorRow
          colors={[
            { name: '50', value: colors.neutral[50] },
            { name: '100', value: colors.neutral[100] },
            { name: '200', value: colors.neutral[200] },
            { name: '300', value: colors.neutral[300] },
            { name: '400', value: colors.neutral[400] },
            { name: '500', value: colors.neutral[500] },
            { name: '600', value: colors.neutral[600] },
            { name: '700', value: colors.neutral[700] },
            { name: '800', value: colors.neutral[800] },
            { name: '900', value: colors.neutral[900] },
            { name: '950', value: colors.neutral[950] },
          ]}
        />

        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Accent — Teal</h3>
        <ColorRow
          colors={[
            { name: '50', value: colors.accent[50] },
            { name: '100', value: colors.accent[100] },
            { name: '200', value: colors.accent[200] },
            { name: '300', value: colors.accent[300] },
            { name: '400', value: colors.accent[400] },
            { name: '500', value: colors.accent[500] },
            { name: '600', value: colors.accent[600] },
            { name: '700', value: colors.accent[700] },
          ]}
        />

        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Score Bands</h3>
        <div className="flex flex-wrap gap-3">
          <BandSwatch label="AI Ready (80-100)" color={colors.band.aiReady} bg={colors.bandBg.aiReady} />
          <BandSwatch label="Needs Work (60-79)" color={colors.band.needsWork} bg={colors.bandBg.needsWork} />
          <BandSwatch label="At Risk (40-59)" color={colors.band.atRisk} bg={colors.bandBg.atRisk} />
          <BandSwatch label="Not Visible (0-39)" color={colors.band.notVisible} bg={colors.bandBg.notVisible} />
        </div>

        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Semantic</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(colors.semantic).map(([name, value]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="h-8 w-8" style={{ backgroundColor: value, borderRadius: 'var(--radius-md)' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
                <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Typography ─── */}
      <Section title="Typography">
        <Card className="p-6">
          <div className="space-y-6">
            <TypographySample size="5xl" label="5xl — 48px" weight="bold" tracking="tight">
              AI Visibility Score
            </TypographySample>
            <TypographySample size="4xl" label="4xl — 36px" weight="bold" tracking="tight">
              Is Your Site Visible to AI?
            </TypographySample>
            <TypographySample size="3xl" label="3xl — 30px" weight="bold" tracking="tight">
              Your Score: 54/100
            </TypographySample>
            <TypographySample size="2xl" label="2xl — 24px" weight="semibold">
              Dimension Breakdown
            </TypographySample>
            <TypographySample size="xl" label="xl — 20px" weight="semibold">
              File Presence
            </TypographySample>
            <TypographySample size="lg" label="lg — 18px" weight="medium">
              Get a free AI visibility score for your website.
            </TypographySample>
            <TypographySample size="base" label="base — 16px" weight="normal">
              Your site is missing an llms.txt file. This file helps AI models understand and reference your business.
            </TypographySample>
            <TypographySample size="sm" label="sm — 14px" weight="normal">
              Scanning: example.com — 8 checks complete
            </TypographySample>
            <TypographySample size="xs" label="xs — 12px" weight="normal">
              Last scanned 2 hours ago. Results cached for 24h.
            </TypographySample>
          </div>
        </Card>
        <Card className="mt-4 p-6">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            Monospace (Code/Files)
          </h3>
          <p className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
            llms.txt &middot; robots.txt &middot; sitemap.xml &middot; schema.json
          </p>
          <pre className="mt-3 overflow-auto rounded-lg p-4 text-xs" style={{ backgroundColor: 'var(--surface-card-hover)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
{`# Example llms.txt
> Your business described for AI models.

## About
AISO helps businesses become visible to AI search.`}
          </pre>
        </Card>
      </Section>

      {/* ─── Components ─── */}
      <Section title="Components">
        {/* Buttons — StatusBadge styling (rounded-tremor-full, border, text-tremor-label) */}
        <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Buttons</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button className="aiso-button aiso-button-primary px-4 py-2.5 text-sm">
            {brand.cta.scan}
          </button>
          <button className="aiso-button aiso-button-primary px-4 py-2.5 text-sm">
            {brand.cta.purchase} &mdash; $99
          </button>
          <button className="aiso-button aiso-button-secondary px-4 py-2.5 text-sm">
            Secondary
          </button>
          <button className="aiso-button aiso-button-ghost px-4 py-2.5 text-sm">
            Ghost
          </button>
        </div>

        {/* Inputs */}
        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Inputs</h3>
        <div className="flex max-w-lg gap-2">
          <input
            type="text"
            placeholder="Enter your website URL"
            className="aiso-input flex-1 px-4 py-2.5 text-sm"
          />
          <button className="aiso-button aiso-button-primary px-4 py-2.5 text-sm">
            {brand.cta.scan}
          </button>
        </div>
        <div className="mt-3 max-w-lg">
          <input
            type="email"
            placeholder="you@company.com"
            className="w-full px-4 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        {/* Cards — shadcn-style (rounded-lg, border, shadow-sm) */}
        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Cards</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Default Card</h4>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Standard card with border and subtle shadow.
            </p>
          </Card>
          <Card className="p-6 shadow-md">
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Elevated Card</h4>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Stronger shadow for depth.
            </p>
          </Card>
        </div>
        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>SubscriptionCard (recharts)</h3>
        <div className="flex justify-center">
          <SubscriptionCard />
        </div>

        {/* Badges & Pills — StatusBadge styling */}
        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Badges & Pills</h3>
        <div className="flex flex-wrap gap-3">
          <StatusBadge
            leftIcon={ShieldCheck}
            rightIcon={CircleX}
            leftLabel="Protection"
            rightLabel="SSO login"
            status="success"
          />
          <StatusBadge
            leftIcon={CircleCheck}
            rightIcon={CircleX}
            leftLabel="Live"
            rightLabel="Audit trails"
            status="success"
          />
          <StatusBadge
            leftIcon={CircleX}
            rightIcon={ShieldCheck}
            leftLabel="Safety checks"
            rightLabel="Production"
            status="error"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <span className="aiso-pill">AI Ready</span>
          <span className="aiso-pill">Needs Work</span>
          <span className="aiso-pill">PASS</span>
          <span className="aiso-pill">FAIL</span>
          <span className="aiso-pill">UNKNOWN</span>
        </div>

        {/* Score Ring Preview */}
        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Score Ring</h3>
        <div className="flex flex-wrap items-end gap-8">
          <ScoreRingPreview score={92} color={colors.band.aiReady} label="AI Ready" />
          <ScoreRingPreview score={67} color={colors.band.needsWork} label="Needs Work" />
          <ScoreRingPreview score={43} color={colors.band.atRisk} label="At Risk" />
          <ScoreRingPreview score={18} color={colors.band.notVisible} label="Not Visible" />
        </div>

        {/* Progress Checklist Preview */}
        <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Progress Checklist</h3>
        <Card className="max-w-sm divide-y divide-border p-5">
          <CheckItem status="done" label="Checking robots.txt" />
          <CheckItem status="done" label="Checking sitemap.xml" />
          <CheckItem status="running" label="Crawling homepage" />
          <CheckItem status="pending" label="Discovering pages" />
          <CheckItem status="pending" label="Scoring AI visibility" />
        </Card>
      </Section>

      {/* ─── Border Radius ─── */}
      <Section title="Border Radius">
        <div className="flex flex-wrap items-end gap-6">
          {Object.entries(components.borderRadius).map(([name, value]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16"
                style={{
                  backgroundColor: 'var(--color-primary-100)',
                  border: '2px solid var(--color-primary-400)',
                  borderRadius: value,
                }}
              />
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
              <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Shadows ─── */}
      <Section title="Shadows">
        <div className="flex flex-wrap gap-6">
          {Object.entries(components.shadow).map(([name, value]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div
                className="h-20 w-20"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: value,
                }}
              />
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Motion ─── */}
      <Section title="Motion">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Durations
            </h3>
            <div className="space-y-2">
              {Object.entries(motion.duration).map(([name, value]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-20 text-xs" style={{ color: 'var(--text-muted)' }}>{name}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Animation Classes
            </h3>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p><code className="font-mono">.animate-fade-in</code> — Elements entering view</p>
              <p><code className="font-mono">.animate-fade-in-up</code> — Cards, sections</p>
              <p><code className="font-mono">.animate-slide-in-right</code> — List items</p>
              <p><code className="font-mono">.animate-check-done</code> — Progress check marks</p>
              <p><code className="font-mono">.animate-score-pulse</code> — Score ring after reveal</p>
              <p><code className="font-mono">.stagger-children</code> — Parent: staggers child animations</p>
            </div>
          </Card>
        </div>
      </Section>

      {/* ─── CSS Variables Reference ─── */}
      <Section title="CSS Variables Quick Reference">
        <Card className="p-6">
          <pre className="overflow-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
{`/* Use in any CSS or inline style */
var(--color-primary-600)     /* Brand green - buttons, links */
var(--color-primary-50)      /* Brand green tint - backgrounds */
var(--text-primary)          /* Main text - adapts to dark mode */
var(--text-secondary)        /* Secondary text */
var(--text-muted)            /* Subtle text, captions */
var(--surface-page)          /* Page background */
var(--surface-card)          /* Card background */
var(--border-default)        /* Default borders */
var(--border-focus)          /* Focus ring color */
var(--radius-md)             /* Default border radius (8px) */
var(--shadow-md)             /* Default card shadow */

/* Tailwind classes via @theme mapping */
bg-primary                   /* Brand green */
bg-surface-card              /* Card background */
text-text-primary            /* Main text color */
border-border                /* Default border */
`}</pre>
        </Card>
      </Section>
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="mb-6 text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}


function ColorRow({ colors: swatches }: { colors: { name: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {swatches.map((swatch) => (
        <div key={swatch.name} className="flex flex-col items-center gap-1">
          <div
            className="h-12 w-12 sm:h-14 sm:w-14"
            style={{
              backgroundColor: swatch.value,
              borderRadius: 'var(--radius-md)',
              border: swatch.name === '50' || swatch.name === '100' ? '1px solid var(--border-default)' : 'none',
            }}
          />
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{swatch.name}</p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{swatch.value}</p>
        </div>
      ))}
    </div>
  );
}

function BandSwatch({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: bg, borderRadius: 'var(--radius-md)' }}>
        <div className="h-4 w-4" style={{ backgroundColor: color, borderRadius: 'var(--radius-full)' }} />
        <span className="text-sm font-medium" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function TypographySample({
  size,
  label,
  weight,
  tracking,
  children,
}: {
  size: string;
  label: string;
  weight: string;
  tracking?: string;
  children: React.ReactNode;
}) {
  const sizeMap: Record<string, string> = {
    xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
    xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem',
  };
  const weightMap: Record<string, number> = {
    normal: 400, medium: 500, semibold: 600, bold: 700,
  };
  const trackingMap: Record<string, string> = {
    tight: '-0.025em', normal: '0em', wide: '0.025em',
  };

  return (
    <div className="flex items-baseline gap-4">
      <span className="w-28 shrink-0 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: sizeMap[size],
          fontWeight: weightMap[weight],
          letterSpacing: tracking ? trackingMap[tracking] : undefined,
          color: 'var(--text-primary)',
        }}
      >
        {children}
      </span>
    </div>
  );
}

function ScoreRingPreview({ score, color, label }: { score: number; color: string; label: string }) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-default)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 100</span>
        </div>
      </div>
      <span className="px-3 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: color, borderRadius: 'var(--radius-full)' }}>
        {label}
      </span>
    </div>
  );
}

function CheckItem({ status, label }: { status: 'done' | 'running' | 'pending'; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {status === 'done' && (
        <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary-600)' }} strokeWidth={3} />
      )}
      {status === 'running' && (
        <LoaderCircle
          className="h-4 w-4 shrink-0 animate-spin"
          style={{ color: 'var(--color-primary-600)' }}
          strokeWidth={2.5}
        />
      )}
      {status === 'pending' && (
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: 'rgba(120, 113, 108, 0.65)',
          }}
        />
      )}
      <span
        className="text-sm"
        style={{
          color: status === 'done' ? 'var(--text-secondary)' : status === 'running' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: status === 'running' ? 600 : 500,
        }}
      >
        {label}
      </span>
    </div>
  );
}
