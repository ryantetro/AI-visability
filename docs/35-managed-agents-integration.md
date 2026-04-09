# Claude Managed Agents — Integration Opportunities for AISO

Anthropic launched **Claude Managed Agents** in public beta on April 8, 2026. This document captures what the platform offers and how it could be applied to AISO.

## What Claude Managed Agents Is

Agents-as-a-service from Anthropic. Instead of building and hosting agent infrastructure yourself, Anthropic provides production-grade sandboxing, orchestration, and tool execution out of the box.

### Two Core Pieces

#### 1. Claude Agent SDK (formerly Claude Code SDK)

A Python/TypeScript library that gives you the same agentic capabilities that power Claude Code — file reading, code editing, bash execution, web search, MCP integrations — all programmable.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] }
})) {
  console.log(message);
}
```

Install: `npm install @anthropic-ai/claude-agent-sdk`

Works with the existing `ANTHROPIC_API_KEY`. Also supports Bedrock, Vertex AI, and Azure AI Foundry.

**Built-in tools:**

| Tool | What it does |
|------|--------------|
| Read | Read any file in the working directory |
| Write | Create new files |
| Edit | Make precise edits to existing files |
| Bash | Run terminal commands, scripts, git operations |
| Glob | Find files by pattern |
| Grep | Search file contents with regex |
| WebSearch | Search the web for current information |
| WebFetch | Fetch and parse web page content |
| AskUserQuestion | Ask the user clarifying questions |

#### 2. Managed Infrastructure

Anthropic handles:

- **Production-grade sandboxing** — agents run in isolated environments
- **Persistent sessions** — agents survive disconnections and can be resumed
- **Built-in orchestration** — tool calling, context management, error recovery
- **Observability** — every tool call, decision point, and failure is traceable in the Console
- **Guardrails & permissions** — define what tools agents can/can't use
- **MCP support** — connect to external systems (databases, APIs, browsers)
- **Subagents** — spawn specialized child agents for focused subtasks

### Key SDK Features

**Hooks** — run custom code at key points in the agent lifecycle (PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, etc.).

**Subagents** — define specialized agents with their own instructions and tool sets:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Use the code-reviewer agent to review this codebase",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Agent"],
    agents: {
      "code-reviewer": {
        description: "Expert code reviewer for quality and security reviews.",
        prompt: "Analyze code quality and suggest improvements.",
        tools: ["Read", "Glob", "Grep"]
      }
    }
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

**Sessions** — maintain context across multiple exchanges, resume later, or fork to explore different approaches.

**MCP** — connect any MCP server (Playwright for browser automation, databases, custom APIs):

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Open example.com and describe what you see",
  options: {
    mcpServers: {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] }
    }
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

### Deployment Options

- **Claude Console** — UI-based, non-technical users
- **CLI** — terminal workflows, CI/CD pipelines with versioning and environment promotion
- **Claude Code** — development and scripting

### Who's Using It

- **Notion** — teams delegate work to Claude inside their workspace, dozens of parallel tasks
- **Asana** — AI Teammates that work inside Asana, picking up assigned tasks
- **Sentry** — goes from root-cause analysis to a Claude agent that writes the fix and opens a PR
- **Rakuten** — specialist agents for product, sales, marketing, and finance, each deployed in under a week
- **Vibe Code** — developers spin up agent infrastructure 10x faster

---

## Feature Suggestions for AISO

### 1. Autonomous Content Studio Agent

**What it replaces:** The current 4-step wizard generation backend.

**How it works:**
- User defines a topic and audience in the existing wizard UI
- Instead of a single API call to generate content, a Managed Agent takes over
- The agent researches the topic (web search), analyzes competitors' AI visibility, drafts the content, self-reviews for SEO/AEO quality, and iterates
- Persistent sessions mean it can run as a long-running background task without custom infra
- Could chain with the prompt library (`GET /api/prompts`) to ensure content aligns with prompts where the brand should appear

**Why it's valuable:** Higher quality output because agents can research, iterate, and self-correct — not just generate in one shot.

**Integration point:** `src/app/api/content-studio/[id]/generate/route.ts` — swap the generation backend to use the Agent SDK.

**Effort level:** Medium — the wizard UI stays the same, only the generation backend changes.

---

### 2. AI Visibility Scan Agent

**What it replaces:** The current per-engine API call approach in `src/lib/services/mention-tester-real.ts`.

**How it works:**
- A Managed Agent runs the entire scan workflow autonomously: crawl the site, generate prompts, query all 5 engines, analyze responses, detect regressions, write the summary
- With subagents, spawn one agent per engine running in parallel
- If an engine fails, the agent handles retries and error recovery without custom retry code
- Sessions persist, so long scans don't break on disconnections

**Why it's valuable:** Simplifies the scan pipeline, better error handling, parallelism built in. Moves complexity out of custom code and into the agent platform.

**Integration point:** `src/lib/scan-workflow.ts`, `src/lib/services/mention-tester-real.ts`

**Effort level:** High — this is a core pipeline rewrite. Could be done incrementally (start with one engine as a subagent).

---

### 3. "Fix My Site" Agent (Premium Upsell)

**What it replaces/enhances:** The current $499 "Fix My Site" manual service add-on.

**How it works:**
- A Managed Agent reads the scan results and identifies all failing actions from the checklist
- Generates specific code fixes: robots.txt rules, structured data markup, meta tags, schema.org JSON-LD
- Could open PRs against the customer's repo if they connect it via MCP (e.g., GitHub MCP server)
- Agent runs in a sandbox so it can't damage anything
- Human review step before any changes are applied

**Why it's valuable:** If an agent can do 80% of the work, margins on the $499 service increase dramatically. Could also enable a lower-priced self-service tier (e.g., $99 for agent-generated fixes without human review).

**Integration point:** `src/lib/fix-my-site.ts`, `src/app/api/fix-my-site/`

**Effort level:** Medium — the scan data and action checklist already exist, the agent just needs to consume them and produce fixes.

---

### 4. Proactive Monitoring Agent

**What it replaces:** The cron-based prompt monitoring in `src/app/api/cron/monitor/route.ts`.

**How it works:**
- An always-on agent continuously monitors brand mentions across all engines
- Detects drops in visibility or sentiment shifts in real-time (not just on cron intervals)
- Automatically generates action items when regressions are detected
- Sends alerts with specific remediation steps, not just "your score dropped"
- Can cross-reference with competitor data to explain why a drop happened

**Why it's valuable:** Moves from reactive (scheduled cron) to proactive (continuous monitoring with intelligent alerts). Premium differentiator.

**Integration point:** `src/app/api/cron/monitor/route.ts`, `src/lib/services/resend-alerts.ts`

**Effort level:** Medium-High — requires rethinking the monitoring architecture from cron to persistent agent.

---

### 5. Competitor Intelligence Agent

**What it replaces/enhances:** The existing competitor tracking in `src/app/competitors/`.

**How it works:**
- A specialized agent continuously tracks competitor mentions across AI engines
- Uses web search to find competitor content strategies and reverse-engineer what's working
- Identifies new competitors entering the space automatically
- Generates battle cards and strategic recommendations
- Updates share-of-voice calculations with richer context

**Why it's valuable:** Turns static competitor data into dynamic competitive intelligence. Could be a Pro/Enterprise tier feature.

**Integration point:** `src/app/api/competitors/`, competitor analysis panels

**Effort level:** Medium — leverages existing competitor data model, adds agent-powered analysis on top.

---

### 6. Onboarding / Setup Agent

**What it replaces:** The static onboarding checklist in `src/hooks/use-onboarding.ts` and `src/components/app/onboarding-checklist.tsx`.

**How it works:**
- When a new user signs up and enters their domain, an agent analyzes their website
- Suggests the best prompts to monitor based on the site's content and industry
- Pre-populates the action checklist with prioritized fixes
- Sets up their first audiences in Content Studio
- Provides a personalized "here's what to focus on first" briefing

**Why it's valuable:** Reduces time-to-value for new users. Instead of a generic checklist, they get an intelligent assistant that understands their specific site.

**Integration point:** `src/hooks/use-onboarding.ts`, `src/app/api/prompts/suggest/route.ts`

**Effort level:** Low-Medium — mostly orchestrating existing APIs through an agent.

---

## Prioritized Implementation Order

| Priority | Feature | Effort | Revenue Impact | User Value |
|----------|---------|--------|----------------|------------|
| 1 | Content Studio Agent | Medium | High (better content = retention) | High |
| 2 | "Fix My Site" Agent | Medium | High (margin improvement + new tier) | High |
| 3 | Onboarding Agent | Low-Medium | Medium (activation + conversion) | High |
| 4 | Competitor Intelligence Agent | Medium | Medium (Pro tier upsell) | Medium |
| 5 | Proactive Monitoring Agent | Medium-High | Medium (Enterprise tier) | Medium |
| 6 | Scan Agent | High | Low (internal efficiency) | Low |

## Technical Prerequisites

- Install: `npm install @anthropic-ai/claude-agent-sdk`
- Existing `ANTHROPIC_API_KEY` works
- Agent SDK works in Next.js API routes (TypeScript)
- MCP support means agents can connect directly to Supabase for data read/write
- Permission controls let you restrict what each agent can do

## References

- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Agent SDK Quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart)
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Agent SDK Python Reference](https://platform.claude.com/docs/en/agent-sdk/python)
- [Agent Skills Guide](https://platform.claude.com/docs/en/build-with-claude/skills-guide)
- [Building Agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Example Agents (GitHub)](https://github.com/anthropics/claude-agent-sdk-demos)
