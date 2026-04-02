# AISO Light Theme + Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AISO from a dark premium theme to a clean white/light theme, restructure the dashboard to lead with actionable steps (fix your ranking, improve your prompts, ongoing monitoring), and update the scoring formula for speed/trust to be more intuitive and action-driving.

**Architecture:** CSS variable-first approach for theme swap (one file changes most colors), then surgical component updates for hardcoded dark colors. Dashboard restructured into a 3-phase action funnel: (1) Your Score & How to Fix It, (2) Your Prompt Rankings & Content Gaps, (3) Ongoing Monitoring & Growth. Scoring formula rebalanced to weight speed and trust more meaningfully.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 with CSS custom properties, React components, TypeScript

---

## File Structure

### Theme Files (Task 1-2)
- **Modify:** `src/app/globals.css` — All CSS custom properties (surfaces, text, borders, shadows, backgrounds)
- **Modify:** `src/components/app/dashboard-primitives.tsx` — DashboardPanel, MiniInfoTile, CollapsibleSection hardcoded dark colors
- **Modify:** `src/components/app/workspace-shell.tsx` — Shell background/border references
- **Modify:** `src/components/app/dashboard-sidebar.tsx` — Sidebar bg, text, borders
- **Modify:** `src/components/app/dashboard-header-bar.tsx` — Header bar styling
- **Modify:** `src/components/app/onboarding-checklist.tsx` — Hardcoded dark colors
- **Modify:** `src/components/app/next-steps-card.tsx` — Card colors
- **Modify:** `src/components/ui/info-tooltip.tsx` — Tooltip styling (if dark-hardcoded)

### Scoring Formula (Task 3)
- **Modify:** `src/lib/scorer/index.ts` — Overall score formula (speed/trust weighting)
- **Modify:** `src/lib/web-health/index.ts` — Pillar labels/presentation

### Dashboard Restructure (Task 4-7)
- **Modify:** `src/app/advanced/dashboard/dashboard-section.tsx` — Reorder sections, add action funnel
- **Create:** `src/app/advanced/dashboard/action-plan-section.tsx` — New "Your Action Plan" hero section
- **Modify:** `src/app/advanced/dashboard/quick-wins-section.tsx` — Elevate, restyle, add CTA to buy implementation
- **Create:** `src/app/advanced/dashboard/prompt-rankings-section.tsx` — New section tying prompt results to content purchasing
- **Modify:** `src/components/app/next-steps-card.tsx` — Expand to include ongoing actions that drive paid implementation

### Component Theme Updates (Task 8)
- **Modify:** `src/app/advanced/panels/ai-crawler-panel.tsx` — Dark color refs
- **Modify:** `src/app/advanced/panels/ai-referral-panel.tsx` — Dark color refs
- **Modify:** `src/app/advanced/panels/monitoring-trends-panel.tsx` — Dark color refs
- **Modify:** `src/app/advanced/panels/prompt-analytics-panel.tsx` — Dark color refs
- **Modify:** `src/app/advanced/panels/fix-card.tsx` — Dark color refs
- **Modify:** `src/app/advanced/dashboard/empty-state-card.tsx` — Dark color refs
- **Modify:** `src/app/advanced/dashboard/opportunity-alert-banner.tsx` — Dark color refs

---

## Task 1: Light Theme — CSS Custom Properties

**Files:**
- Modify: `src/app/globals.css`

This is the highest-leverage change. ~80% of the app uses CSS variables, so flipping these transforms most of the UI.

- [ ] **Step 1: Back up current theme values**

Copy the current `:root` block to a comment block labeled `/* DARK THEME BACKUP */` at the bottom of the file for easy rollback.

- [ ] **Step 2: Update surface variables to light values**

In `src/app/globals.css`, replace the surface and background variables:

```css
  --surface-page: #ffffff;
  --surface-card: rgba(255, 255, 255, 0.98);
  --surface-card-hover: rgba(248, 249, 252, 1);
  --surface-elevated: rgba(255, 255, 255, 0.995);
  --surface-overlay: rgba(0, 0, 0, 0.06);
  --surface-soft: rgba(0, 0, 0, 0.02);
  --surface-contrast: rgba(0, 0, 0, 0.04);
```

- [ ] **Step 3: Update text color variables**

```css
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-tertiary: #6b7280;
  --text-muted: #9ca3af;
  --text-inverse: #f9fafb;
```

- [ ] **Step 4: Update border variables**

```css
  --border-default: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.14);
  --border-focus: rgba(0, 0, 0, 0.22);
  --border-focus-ring: rgba(53, 109, 244, 0.2);
  --border-glow: rgba(0, 0, 0, 0.06);
```

- [ ] **Step 5: Update shadow variables**

```css
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 2px 8px rgba(0, 0, 0, 0.04);
```

- [ ] **Step 6: Update sidebar variables**

```css
  --sidebar-bg: rgba(249, 250, 251, 1);
  --sidebar-border: rgba(0, 0, 0, 0.08);
```

- [ ] **Step 7: Update color-scheme and body background**

Change `html` block:
```css
html {
  color-scheme: light;
  scroll-behavior: smooth;
}
```

Change `body` block:
```css
body {
  min-height: 100vh;
  background: #f9fafb;
  color: var(--text-primary);
  font-family: var(--font-body), system-ui, sans-serif;
}
```

- [ ] **Step 8: Remove or neutralize dark overlay pseudo-elements**

Replace `body::before` and `body::after` with:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: none;
  opacity: 0;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: none;
  opacity: 0;
}
```

- [ ] **Step 9: Update selection color**

```css
::selection {
  background: rgba(53, 109, 244, 0.15);
  color: var(--text-primary);
}
```

- [ ] **Step 10: Update focus-visible ring**

```css
button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible {
  outline: 1px solid rgba(53, 109, 244, 0.4);
  outline-offset: 2px;
}
```

- [ ] **Step 11: Update `.aiso-card` family to light**

```css
.aiso-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 1) 100%);
}

.aiso-card-soft {
  background: linear-gradient(180deg, rgba(249, 250, 251, 0.8) 0%, rgba(243, 244, 246, 0.6) 100%);
}

.aiso-card-dark {
  background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(249, 250, 251, 1) 100%);
}
```

- [ ] **Step 12: Update `.aiso-panel` to light**

```css
.aiso-panel {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 1) 100%);
  box-shadow: var(--shadow-sm);
}
```

- [ ] **Step 13: Update `.aiso-pill` and `.aiso-input`**

```css
.aiso-pill {
  /* ... keep layout ... */
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-primary);
}

.aiso-input {
  /* ... keep layout ... */
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 1);
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.aiso-input:focus {
  border-color: rgba(53, 109, 244, 0.4);
  box-shadow: 0 0 0 3px rgba(53, 109, 244, 0.1);
  outline: none;
}
```

- [ ] **Step 14: Update `.aiso-error`**

```css
.aiso-error {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(254, 242, 242, 1);
  color: #991b1b;
  border-radius: 1rem;
}
```

- [ ] **Step 15: Update `.aiso-button-secondary` and `.aiso-button-ghost`**

```css
.aiso-button-secondary {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.12);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.aiso-button-secondary:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.18);
}

.aiso-button-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.aiso-button-ghost:hover {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.04);
}
```

- [ ] **Step 16: Update `.aiso-code-surface`**

```css
.aiso-code-surface {
  background: linear-gradient(180deg, rgba(249, 250, 251, 1) 0%, rgba(243, 244, 246, 1) 100%);
  color: #1e293b;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 17: Run the dev server, visually verify the app loads with light backgrounds**

Run: `cd /Users/ryantetro/AI-visability && npm run dev`
Expected: App loads with white/light gray backgrounds, dark text, no broken layouts.

- [ ] **Step 18: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: switch CSS custom properties to light/white theme

Transforms all surface, text, border, shadow, and component variables
from dark mode to a clean light theme. Body background now #f9fafb,
cards are white, text is dark gray. Score band colors preserved."
```

---

## Task 2: Light Theme — Hardcoded Component Colors

**Files:**
- Modify: `src/components/app/dashboard-primitives.tsx`
- Modify: `src/components/app/dashboard-sidebar.tsx`
- Modify: `src/components/app/dashboard-header-bar.tsx`
- Modify: `src/app/advanced/dashboard/dashboard-section.tsx`
- Modify: `src/app/advanced/dashboard/quick-wins-section.tsx`
- Modify: `src/app/advanced/dashboard/empty-state-card.tsx`
- Modify: `src/app/advanced/panels/*.tsx` (all panel files)

Many components use hardcoded Tailwind classes like `text-white`, `text-zinc-500`, `bg-white/[0.02]`, `border-white/8` instead of CSS variables. These all need to flip.

- [ ] **Step 1: Update DashboardPanel in dashboard-primitives.tsx**

Replace the DashboardPanel className:
```tsx
// OLD
'rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,10,12,0.96)_0%,rgba(6,6,7,0.985)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.022),0_10px_24px_rgba(0,0,0,0.16)]'

// NEW
'rounded-[1.35rem] border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]'
```

- [ ] **Step 2: Update MiniInfoTile in dashboard-primitives.tsx**

```tsx
// OLD
'rounded-xl border border-white/8 bg-white/[0.018] px-3 py-3'
// text: text-zinc-500, text-zinc-300

// NEW
'rounded-xl border border-gray-200 bg-gray-50 px-3 py-3'
// text: text-gray-500, text-gray-700
```

- [ ] **Step 3: Update CollapsibleSection in dashboard-primitives.tsx**

```tsx
// OLD: border-white/8, hover:bg-white/[0.03], text-white
// NEW: border-gray-200, hover:bg-gray-50, text-gray-900
```

- [ ] **Step 4: Global find-and-replace pattern in dashboard-section.tsx**

Apply these replacements throughout `dashboard-section.tsx`:

| Old Pattern | New Pattern |
|---|---|
| `text-white` | `text-gray-900` |
| `text-zinc-500` | `text-gray-500` |
| `text-zinc-400` | `text-gray-400` |
| `text-zinc-300` | `text-gray-700` |
| `text-zinc-200` | `text-gray-800` |
| `text-zinc-600` | `text-gray-400` |
| `text-zinc-700` | `text-gray-300` |
| `border-white/5` | `border-gray-100` |
| `border-white/8` | `border-gray-200` |
| `border-white/10` | `border-gray-200` |
| `border-white/16` | `border-gray-300` |
| `bg-white/[0.015]` | `bg-gray-50` |
| `bg-white/[0.02]` | `bg-gray-50` |
| `bg-white/[0.03]` | `bg-gray-100` |
| `bg-white/[0.04]` | `bg-gray-100` |
| `bg-white/[0.06]` | `bg-gray-100` |
| `hover:border-white/10` | `hover:border-gray-300` |
| `hover:border-white/16` | `hover:border-gray-300` |
| `hover:bg-white/[0.03]` | `hover:bg-gray-100` |
| `hover:text-white` | `hover:text-gray-900` |
| `border-dashed` (keep as is) | (keep as is) |

- [ ] **Step 5: Apply same replacements to quick-wins-section.tsx**

Same mapping as Step 4.

- [ ] **Step 6: Apply same replacements to all panel files**

Apply the same color mapping to:
- `src/app/advanced/panels/ai-crawler-panel.tsx`
- `src/app/advanced/panels/ai-referral-panel.tsx`
- `src/app/advanced/panels/monitoring-trends-panel.tsx`
- `src/app/advanced/panels/prompt-analytics-panel.tsx`
- `src/app/advanced/panels/fix-card.tsx`
- `src/app/advanced/panels/shared.tsx`
- `src/app/advanced/dashboard/empty-state-card.tsx`
- `src/app/advanced/dashboard/opportunity-alert-banner.tsx`

- [ ] **Step 7: Update sidebar — dashboard-sidebar.tsx**

Key changes:
- Sidebar background: `bg-[rgba(8,9,10,0.98)]` → `bg-gray-50`
- Sidebar border: `border-white/6` → `border-gray-200`
- Active item: `bg-white/[0.08]` → `bg-blue-50 text-blue-700`
- Inactive items: `text-zinc-400` → `text-gray-600`
- Hover: `hover:bg-white/[0.04]` → `hover:bg-gray-100`
- Domain list items: flip similarly

- [ ] **Step 8: Update header bar — dashboard-header-bar.tsx**

Key changes:
- Header background to white/light
- Text colors to dark
- User avatar/initials: dark text on light circle
- Dropdown: white background, gray borders

- [ ] **Step 9: Update workspace-shell.tsx light references**

Check for any hardcoded dark colors in the shell component and update.

- [ ] **Step 10: Visual verification**

Run: `npm run dev`
Navigate through: `/dashboard`, `/report`, `/brand`, `/competitors`, `/settings`
Expected: All pages render with light backgrounds, readable dark text, no "invisible" text.

- [ ] **Step 11: Commit**

```bash
git add src/components/app/dashboard-primitives.tsx src/components/app/dashboard-sidebar.tsx src/components/app/dashboard-header-bar.tsx src/components/app/workspace-shell.tsx src/components/app/onboarding-checklist.tsx src/app/advanced/dashboard/ src/app/advanced/panels/
git commit -m "feat: update all hardcoded dark colors to light theme

Replaces text-white, bg-white/opacity, border-white/opacity patterns
across dashboard, sidebar, header, panels, and primitive components
with light-mode equivalents (gray-50, gray-200, gray-900, etc.)."
```

---

## Task 3: Rebalance Scoring Formula (Speed & Trust)

**Files:**
- Modify: `src/lib/scorer/index.ts:66-80`
- Modify: `src/lib/web-health/index.ts:31-35`

Currently the formula is:
```
overall = (aiVisibility * 1.0 + performance * 0.5 + trust * 0.5) / 2.0
```

This underweights speed and trust. The user wants them to matter more so users feel urgency to fix them.

- [ ] **Step 1: Update the overall score formula in scorer/index.ts**

Replace lines 71-80 (the entire `overall` computation block, including both the primary formula and the fallback):

```typescript
  let overall: number | null;
  if (perfScore !== null && trustScore !== null) {
    // AI Visibility (1.0) + Speed/Performance (0.8) + Trust/Security (0.8) = weight sum 2.6
    overall = Math.round((aiVisibility * 1.0 + perfScore * 0.8 + trustScore * 0.8) / 2.6);
  } else if (webHealthPercentage !== null) {
    // Fallback: use aggregate web health at 0.6 weight (up from 0.5)
    overall = Math.round((aiVisibility * 1.0 + webHealthPercentage * 0.6) / 1.6);
  } else {
    overall = null;
  }
```

This makes two changes:
1. **Primary formula:** Raises speed and trust from 0.5 each to 0.8 each — they now account for ~38% of the overall score vs the previous ~33%. A site with bad speed/trust will see a more noticeable score drop, creating urgency.
2. **Fallback formula:** When only aggregate web health is available (no pillar breakdown), the web health weight increases from 0.5 to 0.6 (divisor from 1.5 to 1.6) for consistency with the primary rebalance.

- [ ] **Step 2: Update the pillar labels for clarity**

In `src/lib/web-health/index.ts`, rename the pillars so they read more clearly:

```typescript
  const pillars = [
    buildPillar('performance', 'Site Speed', performanceChecks),
    buildPillar('quality', 'Website Quality', qualityChecks),
    buildPillar('security', 'Trust & Security', securityChecks),
  ];
```

Change `'Performance'` → `'Site Speed'` so it's immediately obvious what this measures.

- [ ] **Step 3: Update the score formula comment in the docs**

Add a note to `docs/23-score-page-overhaul.md` (or the relevant doc) explaining the new weighting:

```
## Updated Score Formula (April 2026)
overall = (aiVisibility * 1.0 + siteSpeed * 0.8 + trustSecurity * 0.8) / 2.6
Speed and trust now carry more weight to drive urgency for fixes.
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/scorer/index.ts src/lib/web-health/index.ts docs/
git commit -m "feat: rebalance scoring formula — increase speed/trust weight

Speed and Trust now weighted at 0.8 (up from 0.5), accounting for ~38%
of overall score. Creates more urgency for performance and security fixes.
Renamed 'Performance' pillar to 'Site Speed' for clarity."
```

---

## Task 4: New "Your Action Plan" Hero Section

**Files:**
- Create: `src/app/advanced/dashboard/action-plan-section.tsx`

This is the new top-of-dashboard component that replaces the scattered approach. It shows a clear 1-2-3 of what to do and drives users toward paid implementation.

- [ ] **Step 1: Create the action-plan-section.tsx component**

```tsx
'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Wrench,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreColor } from '../lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface ActionPlanSectionProps {
  overallScore: number | null;
  aiVisibility: number;
  fixes: PrioritizedFix[];
  totalMentions: number;
  totalChecks: number;
  monitoringConnected: boolean;
  hasPaidPlan: boolean;
}

interface ActionPhase {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  subtitle: string;
  status: 'complete' | 'active' | 'locked';
  cta: { label: string; href: string };
  metric?: { value: string; label: string };
}

export function ActionPlanSection({
  overallScore,
  aiVisibility,
  fixes,
  totalMentions,
  totalChecks,
  monitoringConnected,
  hasPaidPlan,
}: ActionPlanSectionProps) {
  const topFixes = fixes.slice(0, 3);
  const hasFixableIssues = topFixes.length > 0;
  const mentionRate = totalChecks > 0 ? Math.round((totalMentions / totalChecks) * 100) : null;

  // Determine phase completion
  const phase1Done = !hasFixableIssues || (aiVisibility >= 80);
  const phase2Done = mentionRate !== null && mentionRate >= 50;
  const phase3Done = monitoringConnected;

  const phases: ActionPhase[] = [
    {
      step: 1,
      icon: Wrench,
      iconColor: '#ef4444',
      title: 'Fix Your Ranking',
      subtitle: hasFixableIssues
        ? `${topFixes.length} high-impact fixes will boost your score by up to +${topFixes.reduce((sum, f) => sum + f.estimatedLift, 0)} pts`
        : 'Your site is well-optimized for AI discovery',
      status: phase1Done ? 'complete' : 'active',
      cta: { label: 'See All Fixes', href: '/report' },
      metric: { value: `${aiVisibility}%`, label: 'AI Visibility' },
    },
    {
      step: 2,
      icon: TrendingUp,
      iconColor: '#f59e0b',
      title: 'Improve Your AI Presence',
      subtitle: mentionRate !== null
        ? `You appear in ${mentionRate}% of AI responses — content and prompt optimization can grow this`
        : 'Run a scan to see how AI engines reference your business',
      status: phase1Done ? (phase2Done ? 'complete' : 'active') : 'locked',
      cta: { label: 'View Prompts & Content', href: '/brand' },
      metric: mentionRate !== null ? { value: `${mentionRate}%`, label: 'Mention Rate' } : undefined,
    },
    {
      step: 3,
      icon: Radio,
      iconColor: '#22c55e',
      title: 'Monitor & Grow',
      subtitle: monitoringConnected
        ? 'Weekly scans active — you\'ll be alerted to score drops and new opportunities'
        : 'Enable automatic monitoring to track progress and catch drops early',
      status: phase2Done ? (phase3Done ? 'complete' : 'active') : 'locked',
      cta: monitoringConnected
        ? { label: 'View Trends', href: '/dashboard#monitoring' }
        : { label: 'Enable Monitoring', href: '/dashboard#monitoring' },
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Your Action Plan</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Follow these steps to maximize your AI visibility
          </p>
        </div>
        {overallScore !== null && (
          <div className="text-right">
            <span className={cn('text-3xl font-bold', scoreColor(overallScore))}>
              {overallScore}%
            </span>
            <p className="text-xs text-gray-400">Overall Score</p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {phases.map((phase) => {
          const Icon = phase.icon;
          return (
            <div
              key={phase.step}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 transition-all',
                phase.status === 'active' && 'border-blue-200 bg-blue-50/50',
                phase.status === 'complete' && 'border-green-200 bg-green-50/30',
                phase.status === 'locked' && 'border-gray-100 bg-gray-50/50 opacity-60'
              )}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-1">
                {phase.status === 'complete' ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : phase.status === 'active' ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${phase.iconColor}15`, color: phase.iconColor }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                    <CircleDot className="h-4 w-4 text-gray-300" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-gray-400">
                  STEP {phase.step}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{phase.title}</h3>
                  {phase.metric && (
                    <div className="text-right">
                      <span className={cn('text-lg font-bold', scoreColor(parseInt(phase.metric.value)))}>
                        {phase.metric.value}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">{phase.metric.label}</span>
                    </div>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{phase.subtitle}</p>
                {phase.status !== 'locked' && (
                  <Link
                    href={phase.cta.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {phase.cta.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Implementation CTA */}
      {hasFixableIssues && !hasPaidPlan && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Need help implementing these fixes?
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Our team can handle all technical optimizations for you
              </p>
            </div>
            <Link
              href="/report#fix-my-site"
              className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Get Expert Help
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/advanced/dashboard/action-plan-section.tsx
git commit -m "feat: add ActionPlanSection — 3-step action funnel for dashboard

Shows Fix Your Ranking → Improve AI Presence → Monitor & Grow
as a clear 1-2-3 progression with status indicators and CTAs."
```

---

## Task 5: Restructure Dashboard Layout

**Files:**
- Modify: `src/app/advanced/dashboard/dashboard-section.tsx`

Reorder the dashboard to lead with the action plan, then show the data that supports each phase.

- [ ] **Step 1: Import the new ActionPlanSection**

At the top of `dashboard-section.tsx`, add:
```tsx
import { ActionPlanSection } from './action-plan-section';
```

- [ ] **Step 2: Reorder the dashboard sections**

Replace the return block's section ordering. New order:

1. **OnboardingChecklist** (for new users only — stays at top)
2. **OpportunityAlertBanner** (if any)
3. **KPI Cards Row** (AI Visibility, Average Rank, Brand Mention Rate) — keep as-is but with light theme colors
4. **ActionPlanSection** (NEW — replaces NextStepsCard position)
5. **QuickWinsSection** (elevated — right after action plan)
6. **Prompt Rankings + Competitor Rankings** (two-column)
7. **Platform Performance** (moved down from current position)
8. **Prompt Analytics**
9. **Monitoring Trends**
10. **AI Crawler Traffic**
11. **AI Referral Traffic**

Remove the `<NextStepsCard />` line — its functionality is now covered by `ActionPlanSection`.

- [ ] **Step 3: Wire up ActionPlanSection props**

Replace `<NextStepsCard />` with:

```tsx
<ActionPlanSection
  overallScore={scores.overall}
  aiVisibility={scores.aiVisibility}
  fixes={report.score.fixes ?? report.fixes ?? []}
  totalMentions={totalMentions}
  totalChecks={totalChecks}
  monitoringConnected={monitoringConnected}
  hasPaidPlan={tier !== 'free'}
/>
```

- [ ] **Step 4: Move QuickWinsSection up (right after ActionPlanSection)**

Move the `<QuickWinsSection>` block so it appears immediately after `ActionPlanSection`, before the two-column prompts/competitors grid.

- [ ] **Step 5: Verify layout in browser**

Run: `npm run dev`, navigate to `/dashboard`
Expected: Action plan appears prominently after KPIs, quick wins right below, then prompts/competitors.

- [ ] **Step 6: Commit**

```bash
git add src/app/advanced/dashboard/dashboard-section.tsx
git commit -m "feat: restructure dashboard — action plan first, quick wins elevated

New layout order: KPIs → Action Plan → Quick Wins → Prompts/Competitors.
Removes NextStepsCard (absorbed into ActionPlanSection).
Drives users through a clear fix → optimize → monitor progression."
```

---

## Task 6: Enhanced Quick Wins with Implementation CTA

**Files:**
- Modify: `src/app/advanced/dashboard/quick-wins-section.tsx`

Make quick wins more actionable and tie directly into paid implementation.

- [ ] **Step 1: Update QuickWinsSection to show more detail and an implementation CTA**

Replace the entire component with an enhanced version that:
- Shows top 5 fixes (up from 3)
- Includes a brief description for each fix
- Adds a prominent "Get These Fixed For You" CTA at the bottom

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Copy, Check, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface QuickWinsSectionProps {
  fixes: PrioritizedFix[];
}

export function QuickWinsSection({ fixes }: QuickWinsSectionProps) {
  const topFixes = fixes.slice(0, 5);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (topFixes.length === 0) return null;

  const handleCopy = (fix: PrioritizedFix, idx: number) => {
    void navigator.clipboard.writeText(fix.copyPrompt || fix.instruction);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const totalLift = topFixes.reduce((sum, f) => sum + f.estimatedLift, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Quick Wins</h2>
              <p className="text-xs text-gray-500">
                Top {topFixes.length} fixes — up to <span className="font-semibold text-green-600">+{totalLift} pts</span> total improvement
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/report"
          className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
        >
          All {fixes.length} fixes <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {topFixes.map((fix, i) => (
          <div
            key={fix.checkId}
            className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
          >
            <span className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
              i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            )}>
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">{fix.label}</p>
                <span className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                  fix.category === 'ai'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                )}>
                  {fix.category === 'ai' ? 'AI' : 'Web'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{fix.instruction}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold text-green-600">
                +{fix.estimatedLift} pts
              </span>

              <span className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                fix.effortBand === 'quick'
                  ? 'bg-green-100 text-green-700'
                  : fix.effortBand === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-orange-100 text-orange-700'
              )}>
                {fix.effortBand.charAt(0).toUpperCase() + fix.effortBand.slice(1)}
              </span>

              <button
                type="button"
                onClick={() => handleCopy(fix, i)}
                className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100"
                aria-label="Copy fix instructions"
              >
                {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Implementation CTA */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Want these fixes done for you?</p>
          <p className="text-xs text-gray-500">Our experts implement all optimizations — typically within 48 hours</p>
        </div>
        <Link
          href="/report#fix-my-site"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
        >
          Fix My Site <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/advanced/dashboard/quick-wins-section.tsx
git commit -m "feat: enhanced QuickWinsSection — 5 fixes, descriptions, implementation CTA

Shows top 5 fixes with instructions, total lift summary, and a
prominent CTA to purchase professional implementation."
```

---

## Task 7: Prompt Rankings Section (Tie to Content Purchasing)

**Files:**
- Create: `src/app/advanced/dashboard/prompt-rankings-section.tsx`
- Modify: `src/app/advanced/dashboard/dashboard-section.tsx`

This new section replaces the basic "Top Performing Prompts" card and reframes it around action: which prompts are you missing, and how to fix it by buying articles/content.

- [ ] **Step 1: Create prompt-rankings-section.tsx**

```tsx
'use client';

import Link from 'next/link';
import { ArrowRight, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptResult {
  prompt: { text: string };
  engine: string;
  mentioned: boolean;
}

interface PromptRankingsSectionProps {
  mentionResults: PromptResult[];
  domain: string;
  hasPaidPlan: boolean;
}

export function PromptRankingsSection({
  mentionResults,
  domain,
  hasPaidPlan,
}: PromptRankingsSectionProps) {
  if (mentionResults.length === 0) return null;

  // Group by prompt text
  const promptStats = new Map<string, { mentioned: number; total: number }>();
  for (const r of mentionResults) {
    const key = r.prompt.text;
    const stats = promptStats.get(key) || { mentioned: 0, total: 0 };
    stats.total++;
    if (r.mentioned) stats.mentioned++;
    promptStats.set(key, stats);
  }

  // Sort: prompts where you're NOT mentioned first (opportunity), then by total checks
  const sorted = Array.from(promptStats.entries())
    .map(([text, stats]) => ({
      text,
      ...stats,
      rate: Math.round((stats.mentioned / stats.total) * 100),
    }))
    .sort((a, b) => a.rate - b.rate);

  const missing = sorted.filter((p) => p.rate === 0);
  const weak = sorted.filter((p) => p.rate > 0 && p.rate < 50);
  const strong = sorted.filter((p) => p.rate >= 50);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Prompt Performance</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            How your brand appears when people ask AI engines these questions
          </p>
        </div>
        <Link
          href="/brand"
          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700"
        >
          Manage Prompts <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Summary chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {missing.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3 w-3" />
            {missing.length} not mentioned
          </span>
        )}
        {weak.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <TrendingUp className="h-3 w-3" />
            {weak.length} low visibility
          </span>
        )}
        {strong.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            {strong.length} performing well
          </span>
        )}
      </div>

      {/* Top opportunities (missing/weak prompts) */}
      {(missing.length > 0 || weak.length > 0) && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Biggest Opportunities
          </p>
          <div className="space-y-1.5">
            {[...missing, ...weak].slice(0, 5).map((prompt, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  prompt.rate === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                )}>
                  {prompt.rate}%
                </span>
                <p className="min-w-0 flex-1 truncate text-xs text-gray-700">{prompt.text}</p>
                <span className="shrink-0 text-[10px] text-gray-400">
                  {prompt.mentioned}/{prompt.total} engines
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content CTA */}
      {(missing.length > 0 || weak.length > 0) && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Improve your mention rate with expert optimization
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Our team creates targeted content and optimizations so AI engines recommend you for these prompts
              </p>
            </div>
            <Link
              href="/report#fix-my-site"
              className="shrink-0 rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
            >
              Get Expert Help
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Import and add PromptRankingsSection to dashboard**

In `dashboard-section.tsx`, add the import and place it in the two-column grid replacing the old "Top Performing Prompts" panel:

```tsx
import { PromptRankingsSection } from './prompt-rankings-section';
```

Replace the old "Top Performing Prompts" DashboardPanel — this is the first `<DashboardPanel>` inside the `<div className="grid gap-4 lg:grid-cols-2">` block (approximately lines 462-505 of `dashboard-section.tsx`) — with:

```tsx
<PromptRankingsSection
  mentionResults={mentionResults}
  domain={domain}
  hasPaidPlan={tier !== 'free'}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/advanced/dashboard/prompt-rankings-section.tsx src/app/advanced/dashboard/dashboard-section.tsx
git commit -m "feat: add PromptRankingsSection — shows gaps and content CTA

Groups prompts by performance (missing, weak, strong), highlights
biggest opportunities, and drives users to create targeted content
to improve AI mention rates."
```

---

## Task 8: Remaining Light-Theme Cleanup

**Files:**
- Modify: Various component files with remaining dark-hardcoded colors
- Modify: `src/components/ui/info-tooltip.tsx`
- Modify: `src/components/ui/floating-feedback.tsx`
- Modify: `src/components/ui/unlock-features-modal.tsx`
- Modify: `src/components/ui/locked-feature-overlay.tsx`
- Modify: `src/app/advanced/panels/fix-my-site-panel.tsx`
- Modify: `src/app/advanced/panels/content-generator-panel.tsx`

- [ ] **Step 1: Sweep all remaining UI components for dark color patterns**

Search the codebase for remaining dark-theme patterns:
```
grep -r "text-white\|bg-white/\[0\.\|border-white/\|rgba(255, 255, 255" src/components/ src/app/advanced/
```

For each file found, apply the same light-theme mapping from Task 2 Step 4.

- [ ] **Step 2: Update info-tooltip.tsx**

Ensure tooltips have light backgrounds with dark text (or keep dark tooltip on light — this is a common pattern and may look fine as-is).

- [ ] **Step 3: Update modal/overlay components**

Check `unlock-features-modal.tsx`, `locked-feature-overlay.tsx`, and `floating-feedback.tsx` for dark backgrounds and flip them.

- [ ] **Step 4: Update the public score page**

Check `src/app/score/[id]/page.tsx` and its components — this is the marketing/share page and should also be light.

- [ ] **Step 5: Update login page**

Check `src/app/login/page.tsx` for dark backgrounds. (Note: there is no separate signup page — registration is handled within the login flow.)

- [ ] **Step 6: Update the marketing homepage**

Check `src/app/page.tsx` and `src/components/marketing/` for dark backgrounds. The homepage should also be light to match.

- [ ] **Step 7: Full visual walkthrough**

Test these pages in browser:
- `/` (homepage)
- `/login`
- `/dashboard`
- `/report`
- `/brand`
- `/competitors`
- `/settings`
- `/score/[any-id]`
- `/pricing`

Expected: All pages are light/white theme with no broken text visibility.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: complete light theme sweep — tooltips, modals, public pages

Updates remaining dark-hardcoded colors across UI components,
marketing pages, login/signup, and public score pages."
```

---

## Task 9: Documentation Update

**Files:**
- Create or Update: `docs/25-light-theme-dashboard-overhaul.md`
- Modify: `docs/00-overview.md`

- [ ] **Step 1: Create docs/25-light-theme-dashboard-overhaul.md**

Document:
1. What changed (theme swap, scoring formula, dashboard layout)
2. Key files modified
3. New components created
4. The new scoring formula and rationale
5. Dashboard section order and the action funnel concept

- [ ] **Step 2: Update docs/00-overview.md**

Add a link to the new doc file.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: document light theme, scoring rebalance, and dashboard overhaul"
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| **Theme** | Dark (#060606 bg, white text) | Light (#f9fafb bg, dark text) |
| **Scoring** | Speed 0.5, Trust 0.5 (33% of total) | Speed 0.8, Trust 0.8 (38% of total) |
| **Dashboard top** | Scattered: KPIs → Next Steps → Platform → Quick Wins | Focused: KPIs → Action Plan → Quick Wins → Prompts |
| **Action guidance** | 3 generic onboarding cards | 3-phase funnel: Fix → Optimize → Monitor |
| **Quick Wins** | Top 3, no descriptions, no CTA | Top 5, with instructions, "Fix My Site" CTA |
| **Prompts** | Basic "top mentioned" list | Opportunity-first view with content CTA |
| **Implementation push** | Buried "Fix My Site" on report page | CTAs in Action Plan, Quick Wins, and Prompt sections |
