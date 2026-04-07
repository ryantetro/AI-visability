# Prompts Tab — Dedicated Prompt Monitoring Dashboard

## What It Does

A dedicated `/prompts` route that consolidates all prompt monitoring functionality into a first-class dashboard tab. Tracks whether AI engines (ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok) mention your brand when users ask relevant questions. Inspired by Cognizo's prompt management UI with three sub-tabs: **Active**, **Inactive**, and **Suggestions**.

## Key Files

| File | Role |
|------|------|
| `src/app/prompts/page.tsx` | Page route — WorkspaceShell wrapper |
| `src/app/advanced/prompts/prompts-section.tsx` | Main section component — full dashboard UI |
| `src/app/advanced/panels/prompt-analytics-panel.tsx` | Trends chart (reused as-is) |
| `src/app/advanced/panels/prompt-volume-teaser.tsx` | Coming-soon volume teaser (reused as-is) |
| `src/components/app/dashboard-sidebar.tsx` | Sidebar nav entry (MessageSquareText icon) |
| `src/components/layout/conditional-layout.tsx` | Workspace prefix for DomainContextProvider |
| `src/lib/pricing.ts` | NAV_GATES entry (`prompts: 'starter'`) |

## How It Works

### Page Route (`page.tsx`)

Uses the standard `WorkspaceShell` pattern with `sectionKey="prompts"`. Passes `report`, `domain`, `tier`, and `onOpenUnlock` to `PromptsSection`.

### Sidebar Navigation (`dashboard-sidebar.tsx`)

The Prompts nav item uses a `PromptsNavItem` component (modeled after `BrandNavItem`) that renders three sub-tabs: **Active**, **Inactive**, and **Suggestions**.

- **Expanded sidebar**: Collapsible sub-items with animated left rail, tick marks, and chevron toggle.
- **Collapsed sidebar**: Flyout popover with sub-tab links on hover.
- **Locked state**: Shows Lock icon when plan tier is insufficient.

Sub-tab navigation is URL-driven via `?tab=active|inactive|suggestions` query parameter, built by `buildPromptTabHref()`.

### Section Component (`prompts-section.tsx`)

Reads the active tab from `useSearchParams()` (`?tab=`), defaulting to `active`.

**KPI Row**: Four cards — Total Prompts, Active, Inactive, Mention Rate (calculated from latest results).

**Tab-specific content** (no inline tab bar — tabs are in the sidebar):

1. **Active** — Toolbar (search, category filter, add prompt), bulk action bar, enterprise-style table with 7 columns: Prompt, Topic, Visibility (mention rate % with trend arrow), Sentiment (colored badge derived from average position), Engines (per-engine mention icons), Last Run (date), and hover-reveal row actions (Edit, Deactivate, Delete). Sortable column headers, checkbox multi-select, inline edit, and engine breakdown summary footer.
2. **Inactive** — Same table layout with reactivate/delete actions and checkbox selection.
3. **Suggestions** — Cognizo-inspired "Prompt Generation" modal with custom searchable Topics dropdown, bordered Accept/Reject buttons, bulk accept/reject for selected items, and export.

**PromptVolumeTeaser**: Coming-soon preview at the bottom.

### Enterprise Styling

Inspired by Cognizo's prompt management UI with a dark-theme adaptation:
- **Accent color**: Sky blue (`#0ea5e9`) throughout — selection highlights, bulk bars, checkboxes, usage bar, modals, focus rings
- `ColHeader` component with ArrowUpDown sort indicator icons
- Spacious rows (py-5) with 13px body text, font-medium prompt text
- **Visibility column**: Mention rate as bold colored percentage with TrendingUp/TrendingDown/Minus trend icon
- **Sentiment column**: Rounded pill badge (Positive/Neutral/Negative) with color coding (green/amber/red) derived from average position across results
- **Last Run column**: Formatted date from most recent `testedAt` result
- Bordered Accept/Reject buttons (green/red borders) on Suggestions tab
- Bulk action bars with gradient backgrounds, count badges, Clear button, colored action buttons
- Checkboxes for multi-select (h-4) on both prompts and suggestions
- Topic displayed as capitalized text instead of uppercase badges
- Row actions hidden by default, revealed on hover (`group-hover:opacity-100`), hidden during bulk selection
- Cognizo-inspired "Prompt Generation" modal with custom searchable dropdown popover (not native select)

### Data Flow

1. On mount, fetches `GET /api/prompts?domain={domain}` for prompt list + results
2. Uses localStorage cache (`prompt_library:{domain}`) with 2-minute TTL
3. CRUD operations hit REST endpoints and optimistically update local state
4. Suggestions fetched via `POST /api/prompts/suggest` with domain + existing prompts
5. Accepted suggestions are created via `POST /api/prompts`

## API Contracts

All endpoints already existed — no new API routes created.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/prompts?domain=` | GET | Fetch all prompts + results for a domain |
| `/api/prompts` | POST | Create a new prompt `{ domain, promptText, category }` |
| `/api/prompts/[id]` | PUT | Update prompt `{ promptText?, category?, active? }` |
| `/api/prompts/[id]` | DELETE | Delete a prompt |
| `/api/prompts/suggest` | POST | AI-generate suggestions `{ domain, existingPrompts }` |
| `/api/prompts/trends` | GET | Weekly trend data for chart |

## Error Handling

- API failures show inline error messages within the section
- localStorage cache is a fast-read fallback; stale data is replaced on next successful fetch
- Empty states show contextual messages per tab (no active prompts, no inactive, no suggestions yet)

## Configuration

- **Plan gate**: Requires `starter` tier minimum (via `NAV_GATES`)
- **Sidebar**: Listed after Analytics, before Leaderboard
- **Workspace prefix**: `/prompts` registered in `conditional-layout.tsx` for DomainContextProvider wrapping
- **Prompt limits**: Derived from `PLANS[tier].prompts` (Free: 5, Starter: 25, Pro: 75, Growth: 200)
