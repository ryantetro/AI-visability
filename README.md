# AI-visability

A well-structured **React** + **Next.js** (App Router) application with TypeScript, Tailwind CSS, and ESLint.

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

## Stack

- **Next.js 16** (App Router, React Server Components)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **ESLint** (Next.js config)
