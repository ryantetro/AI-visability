// Pure data — no React dependencies

export type FeatureState = 'yes' | 'partial' | 'no';
export type GapSeverity = 'none' | 'medium' | 'high' | 'critical';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type Effort = 'Low' | 'Medium' | 'High';

export interface GapComparison {
  feature: string;
  us: { state: FeatureState; note: string };
  competitor: { state: FeatureState; note: string };
  gap: GapSeverity;
}

export interface Enhancement {
  id: string;
  title: string;
  subtitle: string;
  priority: Priority;
  sprint: number;
  description: string;
  effort: Effort;
  impact: string;
  currentState: string;
  whatToBuild: string[];
}

export interface SprintPlan {
  sprint: string;
  label: string;
  weeks: string;
  enhancementIds: string[];
  rationale: string;
}

export const GAP_COMPARISONS: GapComparison[] = [
  {
    feature: 'Prompt-based mention tracking',
    us: { state: 'partial', note: 'Fixed prompts, run at scan time only — not continuous' },
    competitor: { state: 'yes', note: 'Millions of responses daily, continuous background tracking' },
    gap: 'critical',
  },
  {
    feature: 'Daily/continuous monitoring',
    us: { state: 'no', note: 'Only re-scans when user manually triggers or cron alerts on low score' },
    competitor: { state: 'yes', note: 'Daily tracking across all prompt sets, all platforms' },
    gap: 'critical',
  },
  {
    feature: 'Competitor tracking in AI answers',
    us: { state: 'no', note: 'Not implemented' },
    competitor: { state: 'yes', note: 'All tiers include competitor tracking' },
    gap: 'critical',
  },
  {
    feature: 'Custom / editable prompt sets',
    us: { state: 'no', note: 'Prompts are auto-generated from crawl, user cannot edit' },
    competitor: { state: 'yes', note: 'Full prompt editor — add, edit, disable, get AI suggestions' },
    gap: 'high',
  },
  {
    feature: 'Multi-platform tracking (Perplexity, Gemini etc.)',
    us: { state: 'partial', note: 'Supported if API keys configured, but not in UI by tier' },
    competitor: { state: 'yes', note: 'Monitor tier: ChatGPT only. Optimize: +Perplexity +Google AI. Enterprise: all 9+' },
    gap: 'high',
  },
  {
    feature: 'Citation tracking (which URLs AI cites)',
    us: { state: 'partial', note: 'citationPresent is a boolean only — no URL extraction' },
    competitor: { state: 'yes', note: 'Tracks which source URLs appear in AI answers, not just presence' },
    gap: 'high',
  },
  {
    feature: 'AI Traffic Analytics (crawler visits to your site)',
    us: { state: 'no', note: 'No inbound AI crawler traffic tracking' },
    competitor: { state: 'yes', note: 'Tracks GPTBot, PerplexityBot etc. visits over time, shows peaks' },
    gap: 'high',
  },
  {
    feature: 'Prompt Volume data (what people ask AI)',
    us: { state: 'no', note: 'Not implemented' },
    competitor: { state: 'yes', note: 'Shows real query volume trends per platform (ChatGPT 18.9k/mo etc.)' },
    gap: 'medium',
  },
  {
    feature: 'Content optimization workflows',
    us: { state: 'no', note: 'No content generation connected to visibility data' },
    competitor: { state: 'yes', note: 'Briefs, drafts, FAQs generated from gap analysis. 6 articles/mo on Optimize tier' },
    gap: 'high',
  },
  {
    feature: 'Score trend history (persistent)',
    us: { state: 'partial', note: 'Assembled from localStorage scan IDs — fragile, device-specific' },
    competitor: { state: 'yes', note: 'All-time history, server-side, exportable' },
    gap: 'medium',
  },
  {
    feature: 'Sentiment analysis on AI mentions',
    us: { state: 'partial', note: 'Simple keyword scan — positive/neutral/negative' },
    competitor: { state: 'yes', note: 'Deeper sentiment with trend tracking over time' },
    gap: 'medium',
  },
  {
    feature: 'Technical site audit',
    us: { state: 'yes', note: 'Strong — 6-dimension crawl-based audit is solid' },
    competitor: { state: 'yes', note: 'Part of Optimize tier only' },
    gap: 'none',
  },
  {
    feature: 'Google Analytics integration',
    us: { state: 'no', note: 'Not implemented' },
    competitor: { state: 'yes', note: 'Optimize tier — connects AI referral traffic to GA data' },
    gap: 'medium',
  },
  {
    feature: 'Shareable / white-label reports',
    us: { state: 'no', note: 'No report export' },
    competitor: { state: 'yes', note: 'Branded client reports for agencies' },
    gap: 'medium',
  },
  {
    feature: 'Position tracking (where brand ranks in AI list)',
    us: { state: 'partial', note: 'Position detected but not trended over time' },
    competitor: { state: 'yes', note: 'Tracks position movement in AI ranked lists over time' },
    gap: 'high',
  },
];

export const ENHANCEMENTS: Enhancement[] = [
  {
    id: 'persistent-trends',
    title: 'Server-Side Score History & Trends',
    subtitle: 'Replace localStorage-based history with real persistent trend data',
    priority: 'HIGH',
    sprint: 1,
    description: 'Activate scan_history table — write a snapshot on every scan completion and run weekly score snapshots for all monitored domains.',
    effort: 'Low',
    impact: "Trend charts showing 'your score went from 42 to 71 in 6 weeks' is the primary retention hook",
    currentState: 'Score history assembled from localStorage scan IDs — breaks on different devices, data loss on clear',
    whatToBuild: [
      'Activate scan_history table (already in schema.sql) — write a snapshot on every scan completion',
      'Background job: weekly score snapshot for all monitored domains (even without full re-crawl)',
      'API endpoint: GET /api/history/[domainId] — returns sorted score snapshots with dimension breakdown',
      'Trend chart in dashboard: line chart of overall score + 6 dimension scores over time',
      "Score delta calculation: '+9 points this month' prominently displayed on dashboard",
      "Weekly email: 'Your AI visibility score this week: 71 (+4 from last week)'",
    ],
  },
  {
    id: 'citation-url-tracking',
    title: 'Citation URL Extraction & Tracking',
    subtitle: 'Track which specific URLs AI engines cite, not just whether they cite anything',
    priority: 'HIGH',
    sprint: 1,
    description: 'Enhance mention-analyzer.ts to extract all markdown links and bare URLs from AI responses, classify citations by domain.',
    effort: 'Low',
    impact: 'Tells users exactly which pages AI trusts — and which competitor pages AI cites instead of theirs',
    currentState: 'citationPresent is boolean only. The actual cited URLs are never extracted or stored.',
    whatToBuild: [
      'Enhance mention-analyzer.ts: extract all markdown links [text](url) and bare URLs from AI responses',
      'Classify citations: own-domain citations vs competitor citations vs third-party (press, directories)',
      'Store in prompt_results: citations jsonb array of {url, domain, anchor_text, is_own_domain}',
      'Dashboard: Citation Sources — which pages on your site get cited most, which competitors get cited',
      "Insight: 'Perplexity cited your /about page in 12 answers but never your /services page'",
    ],
  },
  {
    id: 'continuous-monitoring',
    title: 'Persistent Prompt Monitoring Engine',
    subtitle: 'Replace scan-time mention tests with a background job that runs daily',
    priority: 'CRITICAL',
    sprint: 2,
    description: 'New DB tables for monitored_prompts and prompt_results, scheduled job that runs daily, API endpoints for prompt management.',
    effort: 'High',
    impact: "Transforms the product from a one-time audit tool into a monitoring platform — this is the competitor's core value prop",
    currentState: 'ai-mentions runs once per scan, results tied to scan record, no recurring execution',
    whatToBuild: [
      'New DB table: monitored_prompts (id, domain_id, prompt_text, platform, enabled, created_at)',
      'New DB table: prompt_results (id, prompt_id, run_date, mentioned, position, sentiment, citation_url, competitors_found, raw_response)',
      'Scheduled job: runs daily at 3am UTC, fetches all active monitored domains, executes their prompt sets against configured platforms',
      'API endpoint: GET /api/prompts/[domainId] — returns prompt set + last 30 days of results',
      'Dashboard view: Prompt Performance — table of prompts x platforms with sparkline trend per row',
    ],
  },
  {
    id: 'competitor-tracking',
    title: 'Competitor Tracking in AI Answers',
    subtitle: "Show who else AI mentions when asked about your brand's topic",
    priority: 'CRITICAL',
    sprint: 2,
    description: 'Surface competitor extraction from existing mention-analyzer.ts, new competitor_appearances DB table, dashboard widget.',
    effort: 'Medium',
    impact: "'Your competitor is mentioned 4x more than you' is visceral and urgent — highest conversion driver",
    currentState: 'competitors array is extracted in mention-analyzer.ts but never surfaced in UI or stored persistently',
    whatToBuild: [
      'Surface competitor extraction from existing mention-analyzer.ts (already extracts numbered-list names)',
      'New DB table: competitor_appearances (prompt_result_id, competitor_name, position, date)',
      'Dashboard widget: Competitor Share — bar chart showing brand vs top 5 competitors across prompts',
      "Onboarding step: 'Who are your top 3 competitors?' — seeds manual competitor list to track",
      "Alert: 'A new competitor appeared in 8/10 of your prompts this week — [name]'",
    ],
  },
  {
    id: 'custom-prompts',
    title: 'User-Editable Prompt Library',
    subtitle: 'Let users customize, add, and disable their tracked prompts',
    priority: 'HIGH',
    sprint: 3,
    description: 'Prompt Manager UI with toggle, edit, delete. Prompt Suggestion Engine via Claude API. Categories and templates.',
    effort: 'Low',
    impact: 'Sticky feature — users who customize their prompts have 3x lower churn because they feel ownership',
    currentState: 'prompt-generator.ts auto-generates prompts from crawl, user has zero control',
    whatToBuild: [
      'Prompt Manager UI: table of current prompts with toggle (enabled/disabled), edit inline, delete',
      "Prompt Suggestion Engine: 'Generate 10 more prompts for my industry' — calls Claude API with domain context",
      'Prompt categories: Brand prompts, Competitor prompts, Industry prompts, Buyer journey prompts',
      'Prompt templates: pre-built sets for 20 common industries (legal, dental, plumbing, SaaS etc.)',
      'Prompt limit by plan tier: Free=5, Starter=25, Growth=50, Pro=150+',
    ],
  },
  {
    id: 'position-trending',
    title: 'Position Tracking & Movement Alerts',
    subtitle: 'Track where in AI ranked lists your brand appears and whether it moves up or down',
    priority: 'MEDIUM',
    sprint: 3,
    description: 'Average position calculation per prompt/platform/week, position trend chart, movement alerts.',
    effort: 'Low',
    impact: "Highly motivating for users — seeing 'you moved from position 5 to 3' is a concrete win to celebrate",
    currentState: 'Position is detected per response but never trended or alerted on',
    whatToBuild: [
      'Store position in prompt_results (already planned in schema above)',
      'Average position calculation: per prompt, per platform, per week',
      'Position trend chart: line chart showing avg position over time (lower = better)',
      "Alert: 'You moved into the top 3 for [prompt] on ChatGPT this week'",
      "Alert: 'Your position dropped from 2 to 5 on Perplexity for [prompt] — here is why'",
    ],
  },
  {
    id: 'ai-traffic-analytics',
    title: 'AI Crawler Traffic Analytics',
    subtitle: 'Track when and how often AI bots visit your site via the tracking snippet',
    priority: 'HIGH',
    sprint: 4,
    description: 'Server-side middleware to log AI bot requests, new ai_crawler_visits DB table, dashboard chart.',
    effort: 'Medium',
    impact: "Closes the loop between 'is my site crawlable' and 'is it actually being crawled' — totally missing from current product",
    currentState: 'Tracking snippet exists but only measures user-side events. No bot traffic identification.',
    whatToBuild: [
      'Server-side middleware: log all requests where User-Agent matches known AI bot strings (GPTBot, PerplexityBot, ClaudeBot, Googlebot, CCBot, anthropic-ai, cohere-ai)',
      'New DB table: ai_crawler_visits (domain_id, bot_name, bot_type, url_visited, timestamp)',
      "Classify bots by type: 'AI Indexing' (GPTBot), 'AI Citations' (PerplexityBot), 'AI Training' (CCBot)",
      'Dashboard chart: AI Crawler Traffic — line chart by bot type over 30/90 days',
      "Insights: 'GPTBot visited 47 pages last month, up 23% — your llms.txt is working'",
    ],
  },
  {
    id: 'content-optimization',
    title: 'Content Optimization Workflow',
    subtitle: 'Generate AI-optimized content briefs and articles from visibility gaps',
    priority: 'HIGH',
    sprint: 4,
    description: 'Content gap detector, brief generator, article drafts, content queue dashboard.',
    effort: 'Medium',
    impact: "This is the competitor's Optimize tier ($399/mo) differentiator — turns insights into action automatically",
    currentState: 'No content generation tied to visibility data at all',
    whatToBuild: [
      'Content Gap Detector: finds prompts where brand is NOT mentioned — these are content opportunities',
      'Brief Generator: for each gap, generates an AI-optimized content brief (topic, angle, FAQ structure, target keywords)',
      'Article Draft: one-click full article generation from brief using Claude API',
      "Content Queue: dashboard table of opportunities sorted by 'if we rank here, we appear in X more prompts'",
      'On-page / Off-page split: some gaps fixed by new content (owned), some by getting mentioned on other sites (earned)',
    ],
  },
  {
    id: 'prompt-volumes',
    title: 'Prompt Volume Intelligence',
    subtitle: 'Show users what questions people actually ask AI in their industry',
    priority: 'MEDIUM',
    sprint: 5,
    description: 'Industry prompt database, volume signals from proxy data, trending prompts surface.',
    effort: 'High',
    impact: "Helps users discover which prompts to track before they even know what to ask — the competitor's 4th pillar",
    currentState: 'Not implemented. Requires a combination of scraping, API sampling, and panel data.',
    whatToBuild: [
      'Industry Prompt Database: curated set of ~500 prompts per industry vertical, seeded manually',
      'Volume signals: use Perplexity API response metadata, Google Trends, and SEMrush-style keyword data as proxies',
      'Trending prompts: surface prompts in your industry that are growing in frequency',
      "Gap prompts: prompts where competitors appear but you don't — prioritized by estimated volume",
      'NOTE: True prompt volume data requires panel data or platform partnerships. MVP = curated + proxy signals',
    ],
  },
];

export const BUILD_ORDER: SprintPlan[] = [
  {
    sprint: 'Sprint 1',
    label: 'Foundation',
    weeks: '1-2',
    enhancementIds: ['persistent-trends', 'citation-url-tracking'],
    rationale: 'Fix the data model first. Everything else builds on persistent, server-side results storage.',
  },
  {
    sprint: 'Sprint 2',
    label: 'Core Loop',
    weeks: '3-4',
    enhancementIds: ['continuous-monitoring', 'competitor-tracking'],
    rationale: 'The daily monitoring engine is the entire product. Ship this and you have a subscription justification.',
  },
  {
    sprint: 'Sprint 3',
    label: 'User Control',
    weeks: '5-6',
    enhancementIds: ['custom-prompts', 'position-trending'],
    rationale: 'Give users ownership over what they track. Sticky features that drive retention.',
  },
  {
    sprint: 'Sprint 4',
    label: 'New Pillars',
    weeks: '7-9',
    enhancementIds: ['ai-traffic-analytics', 'content-optimization'],
    rationale: 'AI Traffic and Content unlock the $39/mo to $99/mo upgrade path.',
  },
  {
    sprint: 'Sprint 5',
    label: 'Market Intel',
    weeks: '10+',
    enhancementIds: ['prompt-volumes'],
    rationale: 'Prompt volumes require significant data infrastructure. Phase this in after core monitoring is solid.',
  },
];
