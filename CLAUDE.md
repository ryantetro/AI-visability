# AISO - Project Rules

## Documentation Rule

After completing any working feature (new system, API route, integration, database change, or significant refactor), create or update a Markdown file in the `docs/` folder that documents:

1. **What it does** — A short summary of the feature
2. **Key files** — Table of the files involved and their roles
3. **How it works** — The logic flow, data model, and any important decisions
4. **API contracts** — Request/response shapes for any endpoints
5. **Error handling** — How failures are handled and what the fallback behavior is
6. **Configuration** — Any env vars, feature flags, or plan-based gates involved

Keep `docs/00-overview.md` updated as the index linking to all other doc files. Reference these docs before modifying existing systems to understand how they were built.

## Project Structure

- **Framework**: Next.js App Router (TypeScript)
- **Database**: Supabase (Postgres) — all access via server-side `service_role` key
- **Auth**: Supabase Auth with httpOnly cookie sessions
- **Payments**: Stripe subscriptions (mock fallback when `STRIPE_SECRET_KEY` is not set)
- **Docs**: `docs/` folder — see `docs/00-overview.md` for the full index
