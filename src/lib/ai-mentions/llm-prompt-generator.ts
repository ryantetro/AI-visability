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
- Cover all 8 categories with approximate distribution: direct(2), category(3), comparison(3), recommendation(3), use-case(3), problem-solution(2), workflow(2), buyer-intent(2)
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

  lines.push('');
  lines.push('Generate 20 natural prompts based on this data.');

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
