# AI-visability

A well-structured **React** + **Next.js** (App Router) application with TypeScript, Tailwind CSS, and ESLint.

The AI visibility layer supports ChatGPT, Perplexity, Gemini, and Claude when the corresponding API keys are configured.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command       | Description                |
|---------------|----------------------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build          |
| `npm run start` | Start production server   |
| `npm run lint` | Run ESLint                |
| `npm test` | Run local scan/scoring regression tests |
| `npm run test:live` | Run curated live-fixture crawl checks |
| `npm run test:live:saas` | Run the SaaS live-fixture set |
| `node scripts/check-ai-engines.cjs` | Print configured AI visibility engines and active models |
| `node scripts/backfill-claude-ai-visibility.cjs 30` | Backfill recent Claude scan data and seed prompt-monitoring baseline |

## Repository structure

```
├── public/                 # Static assets (images, favicon, etc.)
├── src/
│   ├── app/                # Next.js App Router (routes, layouts, pages)
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   └── ui/             # Reusable UI primitives
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities, helpers, API clients
│   ├── types/              # Shared TypeScript types
│   └── styles/             # Additional styles (if needed)
├── next.config.ts
├── postcss.config.mjs      # Tailwind v4 (PostCSS)
├── tsconfig.json           # Path alias: @/* → src/*
└── package.json
```

## Conventions

- **Routes**: Add pages under `src/app/` using the [App Router](https://nextjs.org/docs/app) (e.g. `src/app/about/page.tsx` → `/about`).
- **Components**: Put reusable components in `src/components/`, with primitives in `src/components/ui/`. Use the `@/` alias for imports (e.g. `import { Button } from '@/components/ui/Button'`).
- **Utilities**: Put pure helpers and shared logic in `src/lib/`.
- **Types**: Shared interfaces and types live in `src/types/`.

## Live fixtures

The live-fixture suite keeps the crawler honest against real public websites.

- Fixture list: `tests/live-fixtures/saas-sites.json`
- Runner: `scripts/run-live-fixtures.cjs`
- Default command: `npm run test:live:saas`

The fixture expectations are intentionally loose so normal site changes do not create noisy failures. They check for basics like homepage reachability, robots presence, sitemap availability or reference, optional llms coverage, and minimum crawl depth.

## Stack

- **Next.js 16** (App Router, React Server Components)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **ESLint** (Next.js config)

## AI visibility providers

The scan and monitoring pipeline can query multiple AI engines in parallel:

- `ChatGPT` via `OPENAI_API_KEY`
- `Claude` via `ANTHROPIC_API_KEY`
- `Gemini` via `GOOGLE_GENAI_API_KEY`
- `Perplexity` via `PERPLEXITY_API_KEY`

If Claude is enabled after older scans already exist, run `node scripts/backfill-claude-ai-visibility.cjs 30` to refresh recent mention summaries and seed a current Claude baseline for active prompt monitoring.
