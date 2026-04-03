# Score Page Overhaul: Scoring Formula, Labels, and Marketing

## What It Does

Overhauled the public share page at `/score/[id]` to drive conversions by:
1. Reweighting the overall score formula to prevent inflated green scores when AI visibility/mentions are poor
2. Replacing confusing PASS/FAIL jargon with clear status labels
3. Adding urgency-driven marketing sections that vary by score band

## Key Files

| File | Role |
|------|------|
| `src/lib/scoring-weights.ts` | **Source of truth** for weight constants and `computeOverallFromPillars` / `computePublicOverallScore` |
| `src/lib/scorer/index.ts` | Core scoring engine — pillar-weighted overall via `computeOverallFromPillars` (without mentions) |
| `src/lib/public-score.ts` | Public summary builder — `computePublicOverallScore`, adds `totalFixCount` and `mentionRate` |
| `src/app/score/[id]/page.tsx` | Share page UI — verdict labels, hero messaging, CTAs, missed traffic card |

## How It Works

### Scoring Formula

**Old:** `overall = aiVisibility * 0.6 + webHealth * 0.4`

**New (display, with mentions):** Implemented in `computePublicOverallScore` (`src/lib/scoring-weights.ts`).
```
weightedSum = aiVisibility * WEIGHT_AI_VISIBILITY + performance * WEIGHT_PERFORMANCE + trust * WEIGHT_TRUST + mentionScore * WEIGHT_MENTIONS
overall = weightedSum / weightSum  (where weightSum = sum of weights for available components)
```
Constants today: `WEIGHT_AI_VISIBILITY = 1.0`, `WEIGHT_PERFORMANCE = 0.5`, `WEIGHT_TRUST = 0.5`, `WEIGHT_MENTIONS = 1.0`.

When all four components are present, `weightSum = 3.0`. The dynamic approach handles missing data gracefully.

**New (stored, without mentions):** `computeOverallFromPillars` in the same module.
```
overall = (aiVisibility * 1.0 + performancePillar * 0.5 + trustPillar * 0.5) / 2.0
```

Fallback: if pillar-level data unavailable, uses aggregate webHealth at half weight (`WEIGHT_WEB_HEALTH_AGGREGATE = 0.5`, divisor `1.5`).

### Verdict Labels

| Old Label | New Label | Threshold | Color |
|-----------|-----------|-----------|-------|
| FAIL | Not Found | 0 mentions | Red |
| LOW PASS / PASS | Low Visibility | <50% ratio | Red |
| STRONG PASS | Moderate | 50-75% ratio | Amber |
| — | Strong | 75%+ ratio | Green |

### Marketing Sections

- **Hero**: Band-aware urgency copy (red/orange/green variants)
- **Missed Traffic Card**: Shows estimated AI-referred visitors going to competitors (when mention rate < 70%)
- **Mid-Page CTA**: Appears after engine breakdown when any engine shows Not Found/Low Visibility
- **Locked Fixes Teaser**: Shows "3 of X issues" with unlock CTA when total fixes > 3
- **Footer CTA**: Band-aware urgency messaging with proof point ("19-point average improvement")

## Data Model Changes

Added to `PublicScoreSummary`:
- `totalFixCount: number` — total number of available fixes
- `mentionRate: number | null` — ratio of mentions across all engines (0-1)

## Configuration

No new env vars. The AI traffic baseline for missed visitor estimates is hardcoded at 500 (`AI_TRAFFIC_BASELINE`).

## Error Handling

- Missing pillar data: formula uses available components with adjusted weight sum
- Missing mention data: missed traffic card hidden, formula weights adjust
- No engine data: engine breakdown section hidden entirely
- Fewer than 4 fixes: locked fixes teaser hidden
