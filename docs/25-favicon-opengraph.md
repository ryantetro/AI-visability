# Favicon & default Open Graph image

## What it does

- **Favicon**: `src/app/icon.svg` — SVG matching the in-app **AisoLogo** (tricolor ring) with a **transparent** background; a neutral gray guide ring keeps the circle readable on both light and dark tab bars.
- **Apple touch icon**: `src/app/apple-icon.tsx` — 180×180 PNG generated via `ImageResponse` with the same mark.
- **Site share preview**: `src/app/opengraph-image.tsx` — 1200×630 default OG image for the root layout (homepage and routes that do not define their own). Uses brand gradient, logo, headline, and Space Grotesk when Google Fonts fetch succeeds.

## Key files

| File | Role |
|------|------|
| `src/app/icon.svg` | Browser favicon (`/icon.svg`) |
| `src/app/apple-icon.tsx` | `/apple-icon` for iOS home screen |
| `src/app/opengraph-image.tsx` | `/opengraph-image` — default `og:image` |
| `src/app/layout.tsx` | `metadataBase`, `openGraph`, `twitter` (`summary_large_image`) |

## Configuration

- **`NEXT_PUBLIC_APP_URL`**: Sets `metadataBase` so absolute URLs (including OG image) resolve correctly in production.

Child routes can still define their own `opengraph-image` (e.g. `src/app/score/[id]/opengraph-image.tsx`).
