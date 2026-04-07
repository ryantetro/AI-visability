# Content Studio Tab

Dedicated content creation workspace with a 4-step wizard, audience management, and brief/article generation.

## Key Files

| File | Role |
|------|------|
| `src/app/content-studio/page.tsx` | Page route using WorkspaceShell |
| `src/app/advanced/content-studio/content-studio-section.tsx` | Main section — routes between Contents and Audiences tabs |
| `src/app/advanced/content-studio/contents-tab.tsx` | Contents list view with search, table, and CRUD |
| `src/app/advanced/content-studio/content-wizard.tsx` | 4-step content creation wizard |
| `src/app/advanced/content-studio/brief-viewer.tsx` | Brief/article viewer with workflow progress sidebar |
| `src/app/advanced/content-studio/audiences-tab.tsx` | Audiences list view with Create/Edit modal |
| `src/app/api/content-studio/route.ts` | List + Create content items |
| `src/app/api/content-studio/[id]/route.ts` | Get, Update, Delete single content item |
| `src/app/api/content-studio/[id]/generate/route.ts` | Trigger brief/article generation |
| `src/app/api/content-studio/audiences/route.ts` | List + Create audiences |
| `src/app/api/content-studio/audiences/[id]/route.ts` | Get, Update, Delete single audience |
| `src/app/api/content-studio/audiences/[id]/enhance/route.ts` | AI-enhance an audience description |
| `supabase/migrations/028_content_studio.sql` | DB tables + indexes + RLS |

## How It Works

### Navigation

Content Studio appears in the sidebar after Prompts with two collapsible sub-tabs: **Contents** and **Audiences**. The sidebar component (`ContentStudioNavItem`) follows the exact same pattern as `PromptsNavItem` — expanded sub-items, collapsed flyout, and locked state for free/starter users.

### Contents Tab

- Table listing all content items for the selected domain (Title, Content Type, Status, Created, Actions)
- Search bar filters by title or content type
- "+ Create Content" button opens the 4-step wizard inline (state-based, no route change)
- View button opens the brief/article viewer
- Delete button with inline confirmation
- 2-minute localStorage cache matching prompts-section pattern

### Content Creation Wizard (4 Steps)

1. **Topic & Type** — Grid of content types (Blog Post, Listicle, How-To Guide, Case Study, etc.) organized by category (Informational, Comparative, Social, Transactional) with filter pills. Topic text input. **Prompt Selection**: fetches the user's monitored prompts from `GET /api/prompts?domain=...` and displays them as selectable cards below the topic input. Multi-select with category filter pills and auto-suggest topic from first selected prompt. User can proceed with either a typed topic or selected prompts.
2. **Audience Settings** — Inline sentence builder: "Write a [tone] tone, [length] length article." Target audience text input.
3. **Additional Context** — Writing perspective radio cards (1st/2nd/3rd person), Article sections toggles (Key Takeaways, FAQ, Call to Action), Custom CTA text, Additional instructions list.
4. **Review & Generate** — Summary of all selections with Edit buttons, title input, "Create Brief" button.

On submit: creates the content item via API, then triggers generation.

### Brief/Article Viewer

- Header: Back link, content type badge, status badge
- Brief/Article tab switcher
- Main area: generating animation (progress ring + step label) OR rendered markdown content
- Right sidebar: Workflow steps (Web Research, Quote Extraction, Outline Generation, Brief Generation, Article Generation) with done/active/pending states
- Polls API every 3s while generating

### Audiences Tab

- Table listing all audiences (Name, Description, Usage, Created, Actions)
- Create/Edit modal with name input, description textarea with formatting toolbar, "Enhance With AI" button
- AI enhancement calls the enhance API and updates the description
- Success toast after enhancement

## API Contracts

### GET /api/content-studio?domain=...
Returns `{ items: ContentItem[] }`.

### POST /api/content-studio
Body: `{ domain, title, content_type, topic?, audience_id?, tone?, length?, perspective?, sections?, cta_text?, additional_instructions?, selected_prompts?: string[] }`
Returns the created `ContentItem` with status 201.

### GET /api/content-studio/:id
Returns a single `ContentItem`.

### PUT /api/content-studio/:id
Body: any subset of allowed fields.
Returns the updated `ContentItem`.

### DELETE /api/content-studio/:id
Returns `{ ok: true }`.

### POST /api/content-studio/:id/generate
Triggers brief generation. Returns `{ ok: true, status: 'brief_generating' }`.

### GET /api/content-studio/audiences
Returns `{ audiences: Audience[] }`.

### POST /api/content-studio/audiences
Body: `{ name, description? }`
Returns the created `Audience` with status 201.

### PUT /api/content-studio/audiences/:id
Body: `{ name?, description? }`
Returns the updated `Audience`.

### DELETE /api/content-studio/audiences/:id
Returns `{ ok: true }`.

### POST /api/content-studio/audiences/:id/enhance
AI-enhances the audience description. Returns the updated `Audience`.

## Error Handling

- 401 for unauthenticated requests
- 403 for users below Pro tier (`content_studio` feature gate)
- 400 for invalid input (missing fields, bad UUIDs)
- 404 for items/audiences not found or not owned by user
- 500 for database errors

## Configuration

| Variable | Purpose |
|----------|---------|
| `NAV_GATES['content-studio']` | `'pro'` — minimum tier for sidebar access |
| `FEATURE_GATES['content_studio']` | `'pro'` — minimum tier for API access |
| `WORKSPACE_PREFIXES` | `/content-studio` added for DomainContextProvider |
| `WORKSPACE_KEYS` | `'content-studio'` added for report param forwarding |
| `WorkspaceShell wide` prop | Content Studio uses `max-w-[1440px]` (vs default `max-w-[1120px]`) for a wider dashboard layout |
