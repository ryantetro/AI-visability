import type { CrawlData } from '@/types/crawler';
import type { BusinessProfile, MentionPrompt } from '@/types/ai-mentions';
import { extractSiteContent } from './content-extractor';
import { isValidPromptText, inferTopic, MIN_PROMPTS, MAX_PROMPTS } from './prompt-generator';

const ALLOWED_CATEGORIES = new Set([
  'direct', 'category', 'comparison', 'recommendation',
  'workflow', 'use-case', 'problem-solution', 'buyer-intent',
] as const);

const SYSTEM_PROMPT = `You generate natural search prompts that a real buyer or researcher would ask an AI assistant (ChatGPT, Perplexity, Claude, Gemini).

Rules:
- Generate exactly 20 prompts
- Sound like real conversational queries, not marketing templates
- Be specific — reference actual products, services, use cases, and features from the site data provided
- Exactly 2 prompts should be "direct" category (include the brand name); the other 18 test organic mention and must NOT include the brand name
- Cover all 8 categories with approximate distribution: direct(2), buyer-intent(4), comparison(4), problem-solution(3), recommendation(3), use-case(2), category(1), workflow(1)
- Prioritize prompts a real buyer, evaluator, or operator would ask before category-only prompts
- Include at least 2 explicit ranking prompts that ask the model to rank options or list the top 5 options in order
- When competitor seeds are provided, include comparison and alternative-style prompts that test positioning
- Use industry search patterns and differentiators from the business profile, not generic template phrasing
- No exclamation marks, marketing language, legal terms, or pricing text
- Each prompt should be a question or request, 10-180 characters
- Return valid JSON only

Categories:
- direct: asks about the brand by name
- category: asks about a product/service category
- comparison: asks to compare options
- recommendation: asks for recommendations
- use-case: asks about solving a specific use case
- problem-solution: asks about solving a specific problem
- workflow: asks about workflows or processes
- buyer-intent: asks with buying/purchasing intent

Return JSON in this exact format:
{"prompts": [{"text": "...", "category": "...", "topic": "...", "source": "..."}]}

Where "source" is one of: product, service, feature, competitor, audience, geo, faq, use-case, workflow, problem, buyer, integration, industry-term, blog, core`;

interface LLMPromptResult {
  text: string;
  category: string;
  topic?: string;
  source?: string;
}

function industryPatterns(profile: BusinessProfile): string[] {
  if (profile.vertical === 'marine_watersports') {
    return [
      'buyers ask where to buy parts, gear, and watersports equipment near them',
      'searches compare retailers, inventory depth, and local expertise',
      'recommendation prompts often mention lake, marina, surf, wakeboard, or boat needs',
    ];
  }
  if (profile.vertical === 'saas' || profile.industry === 'SaaS') {
    return [
      'buyers compare software based on workflows, integrations, reporting, and team scale',
      'searches often ask for alternatives, best tools for a role, or tools that reduce manual work',
      'purchase-intent prompts emphasize implementation speed, ROI, or fit for a specific team',
    ];
  }
  if (profile.industry === 'Finance') {
    return [
      'buyers compare billing, payments, subscriptions, and risk reduction capabilities',
      'searches ask for online payment tools, recurring billing, and marketplace support',
      'buyer-intent prompts focus on conversion, reliability, and developer ease',
    ];
  }
  if (profile.industry === 'Healthcare') {
    return [
      'buyers ask about patient communication, scheduling, coordination, and reducing admin work',
      'searches compare tools by workflow support, team efficiency, and operational reliability',
      'buyer-intent prompts focus on clinic fit and staff productivity',
    ];
  }
  if (profile.industry === 'Marketing') {
    return [
      'buyers ask about SEO, attribution, campaign reporting, and content workflows',
      'searches compare marketing tools by speed, reporting, and channel coverage',
      'buyer-intent prompts focus on performance improvement and execution efficiency',
    ];
  }
  if (profile.vertical === 'local_service') {
    return [
      'buyers ask who serves their area, who is trusted locally, and who can solve a specific problem quickly',
      'searches often include city names or "near me" phrasing',
      'comparison prompts focus on responsiveness, specialization, and local reputation',
    ];
  }
  return [
    'buyers ask for the best options in a category, alternatives, and tools for a specific job to be done',
    'high-intent searches compare providers and ask which option is best for a particular team or workflow',
    'problem-solution prompts focus on reducing manual work and improving outcomes',
  ];
}

function fewShotExamples(profile: BusinessProfile): string[] {
  if (profile.vertical === 'marine_watersports') {
    return [
      'best marine parts store in salt lake city',
      'compare watersports retailers for wakeboard gear',
      'where should I buy boat accessories near utah lake',
    ];
  }
  if (profile.vertical === 'saas' || profile.industry === 'SaaS') {
    return [
      'best project management software for remote product teams',
      'alternatives to jira for startup engineering teams',
      'what tools reduce weekly reporting work for ops teams',
    ];
  }
  if (profile.industry === 'Finance') {
    return [
      'best payment platform for subscriptions and recurring billing',
      'stripe alternatives for online marketplaces',
      'what billing tools help reduce failed payment churn',
    ];
  }
  return [
    'best tools for a specific team and workflow',
    'compare leading providers for a buyer use case',
    'what tools solve a concrete operational problem',
  ];
}

function buildUserMessage(
  crawl: CrawlData,
  businessProfile: BusinessProfile,
): string {
  const siteContent = extractSiteContent(crawl);
  const lines: string[] = [];

  lines.push(`Brand: ${businessProfile.brand}`);
  lines.push(`Industry: ${businessProfile.industry}`);
  lines.push(`Vertical: ${businessProfile.vertical}`);
  lines.push(`Business type: ${businessProfile.businessType}`);
  if (businessProfile.location) lines.push(`Location: ${businessProfile.location}`);

  if (businessProfile.scanCompetitorSeeds.length > 0) {
    lines.push(`Competitors: ${businessProfile.scanCompetitorSeeds.join(', ')}`);
  }

  if (siteContent.products.length > 0) {
    lines.push(`Products: ${siteContent.products.join(', ')}`);
  }
  if (siteContent.services.length > 0) {
    lines.push(`Services: ${siteContent.services.join(', ')}`);
  }
  if (siteContent.features.length > 0) {
    lines.push(`Features: ${siteContent.features.join(', ')}`);
  }
  if (siteContent.usps.length > 0) {
    lines.push(`Differentiators: ${siteContent.usps.join(', ')}`);
  }
  if (siteContent.useCases.length > 0) {
    lines.push(`Use cases: ${siteContent.useCases.join(', ')}`);
  }
  if (siteContent.problemStatements.length > 0) {
    lines.push(`Problems solved: ${siteContent.problemStatements.join(', ')}`);
  }
  if (siteContent.targetAudience.length > 0) {
    lines.push(`Target audience: ${siteContent.targetAudience.join(', ')}`);
  }
  if (siteContent.geoAreas.length > 0) {
    lines.push(`Geographic areas: ${siteContent.geoAreas.join(', ')}`);
  }
  if (siteContent.faqQueries.length > 0) {
    lines.push(`FAQ topics: ${siteContent.faqQueries.slice(0, 5).join(', ')}`);
  }
  if (siteContent.integrations.length > 0) {
    lines.push(`Integrations: ${siteContent.integrations.join(', ')}`);
  }
  if (siteContent.industryTerms.length > 0) {
    lines.push(`Industry terms: ${siteContent.industryTerms.join(', ')}`);
  }
  if (siteContent.blogTopics.length > 0) {
    lines.push(`Blog topics: ${siteContent.blogTopics.slice(0, 5).join(', ')}`);
  }
  if (siteContent.actionCapabilities.length > 0) {
    lines.push(`Capabilities: ${siteContent.actionCapabilities.join(', ')}`);
  }

  lines.push(`Industry search patterns: ${industryPatterns(businessProfile).join(' | ')}`);
  lines.push(`Few-shot examples: ${fewShotExamples(businessProfile).join(' | ')}`);

  lines.push('');
  lines.push('Generate 20 natural prompts based on this data.');
  lines.push('Focus on buyer-intent, comparison, and problem-solution prompts before generic category prompts.');
  lines.push('Include at least two explicit ranking prompts using wording like "rank the top..." or "list the top 5 ... in order".');

  return lines.join('\n');
}

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  timeoutMs: number,
): Promise<LLMPromptResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI API error: ${res.status}${body ? ` ${body.slice(0, 240)}` : ''}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty content');

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.prompts)) {
      throw new Error('LLM response missing "prompts" array');
    }

    return parsed.prompts;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`LLM prompt generation timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateAndMap(
  rawPrompts: LLMPromptResult[],
  businessProfile: BusinessProfile,
): MentionPrompt[] {
  const valid: MentionPrompt[] = [];

  for (const raw of rawPrompts) {
    if (!raw.text || typeof raw.text !== 'string') continue;

    // Validate category
    const category = ALLOWED_CATEGORIES.has(raw.category as MentionPrompt['category'])
      ? (raw.category as MentionPrompt['category'])
      : null;
    if (!category) continue;

    // Run existing prompt validation
    if (!isValidPromptText(raw.text)) continue;

    const topic = (raw.topic && typeof raw.topic === 'string' && raw.topic.trim())
      ? raw.topic.trim()
      : inferTopic(category, businessProfile.industry, raw.source || undefined);

    valid.push({
      id: `prompt-${valid.length + 1}`,
      text: raw.text,
      category,
      industry: businessProfile.industry,
      location: businessProfile.location,
      brand: businessProfile.brand,
      topic,
      source: raw.source || undefined,
    });
  }

  return valid.slice(0, MAX_PROMPTS);
}

export async function generatePromptsWithLLM(
  crawl: CrawlData,
  businessProfile: BusinessProfile,
  options?: { timeoutMs?: number },
): Promise<MentionPrompt[]> {
  const timeoutMs = options?.timeoutMs ?? 8000;

  const userMessage = buildUserMessage(crawl, businessProfile);
  const rawPrompts = await callOpenAI(SYSTEM_PROMPT, userMessage, timeoutMs);
  const prompts = validateAndMap(rawPrompts, businessProfile);

  if (prompts.length < MIN_PROMPTS) {
    throw new Error(
      `LLM generated only ${prompts.length} valid prompts (minimum ${MIN_PROMPTS})`
    );
  }

  console.log(`[mention-tests] LLM generated ${prompts.length} prompts`);
  return prompts;
}
