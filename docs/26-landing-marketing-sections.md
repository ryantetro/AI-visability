# Home landing — marketing sections & motion

## What it does

The homepage ([src/app/page.tsx](src/app/page.tsx)) adds narrative, stats, capability pillars, a report preview mock, optional sample score CTA, and an agencies strip—all with scroll-triggered motion via Framer Motion and `prefers-reduced-motion` support.

## Key files

| File | Role |
|------|------|
| [src/components/marketing/motion.tsx](src/components/marketing/motion.tsx) | `FadeIn`, `StaggerGrid`, `StaggerItem`, shared viewport/easing |
| [src/components/marketing/shift-section.tsx](src/components/marketing/shift-section.tsx) | Editorial “shift” narrative + spec metrics (asymmetric layout) |
| [src/components/marketing/capability-pillars.tsx](src/components/marketing/capability-pillars.tsx) | Four linked pillars |
| [src/components/marketing/how-it-works-section.tsx](src/components/marketing/how-it-works-section.tsx) | Three steps + stagger |
| [src/components/marketing/ai-engines-section.tsx](src/components/marketing/ai-engines-section.tsx) | AI beam interstitial + motion |
| [src/components/marketing/dimensions-section.tsx](src/components/marketing/dimensions-section.tsx) | Six dimensions — editorial split header + icon rows (not uniform cards) + stagger |
| [src/components/marketing/report-preview-band.tsx](src/components/marketing/report-preview-band.tsx) | Composed UI preview (illustrative) |
| [src/components/marketing/sample-score-cta.tsx](src/components/marketing/sample-score-cta.tsx) | Sample `/score` CTA when env set |
| [src/components/marketing/agencies-cta-band.tsx](src/components/marketing/agencies-cta-band.tsx) | Teams / agencies band → pricing |
| [src/lib/marketing-constants.ts](src/lib/marketing-constants.ts) | `MARKETING_SAMPLE_SCORE_ID` from env |

## Configuration

- `NEXT_PUBLIC_SAMPLE_SCORE_ID` — optional; see [07-env-variables.md](./07-env-variables.md).

## Error handling / honesty

- No fabricated “trusted by” logos: stats strip uses factual product metrics only.
- Sample score link appears only when `NEXT_PUBLIC_SAMPLE_SCORE_ID` is set; otherwise copy explains sharing and points users to `#scan`.
