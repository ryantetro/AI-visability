import type {
  AnalysisSource,
  BusinessProfile,
  CompetitorPosition,
  DescriptionAccuracy,
  MentionResult,
  MentionSentiment,
  MentionType,
  PositionContext,
} from '@/types/ai-mentions';
import type { EngineResponse } from './engine-tester';
import { analyzeResponse, normalizeLegacySentiment } from './mention-analyzer';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_BATCH_SIZE = 8;
const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_TOTAL_BUDGET_MS = 30000;
const ANALYSIS_BUDGET_GUARD_MS = 250;
const ANALYZER_JSON_SCHEMA = {
  name: 'mention_response_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mentioned: { type: 'boolean' },
      mentionType: { type: 'string', enum: ['direct', 'indirect', 'not_mentioned'] },
      position: { type: ['integer', 'null'] },
      positionContext: { type: 'string', enum: ['listed_ranking', 'prominent', 'passing', 'absent'] },
      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
      sentimentStrength: { type: 'integer' },
      sentimentReasoning: { type: ['string', 'null'] },
      keyQuote: { type: ['string', 'null'] },
      descriptionAccuracy: { type: ['string', 'null'], enum: ['accurate', 'partial', 'inaccurate', null] },
      competitors: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            position: { type: ['integer', 'null'] },
          },
          required: ['name', 'position'],
        },
      },
      citationFound: { type: 'boolean' },
    },
    required: [
      'mentioned',
      'mentionType',
      'position',
      'positionContext',
      'sentiment',
      'sentimentStrength',
      'sentimentReasoning',
      'keyQuote',
      'descriptionAccuracy',
      'competitors',
      'citationFound',
    ],
  },
} as const;

interface LLMAnalysisPayload {
  mentioned: boolean;
  mentionType: MentionType;
  position: number | null;
  positionContext: PositionContext;
  sentiment: MentionSentiment;
  sentimentStrength: number;
  sentimentReasoning: string | null;
  keyQuote: string | null;
  descriptionAccuracy: DescriptionAccuracy | null;
  competitors: CompetitorPosition[];
  citationFound: boolean;
}

interface AnalyzerContext {
  brand: string;
  domain?: string;
  businessProfile: BusinessProfile;
}

interface AnalyzerOptions {
  batchSize?: number;
  timeoutMs?: number;
  totalBudgetMs?: number;
}

type OpenAIResponseFormatMode = 'json_schema' | 'json_object';

const SYSTEM_PROMPT = `You analyze AI assistant answers about a business and return strict JSON.

Rules:
- Return JSON only with the exact keys requested.
- Use mentionType="direct" when the brand is named explicitly.
- Use mentionType="indirect" when the brand is clearly described without being named.
- Use mentionType="not_mentioned" when the brand is absent or too ambiguous.
- position is the rank number when the brand appears in a ranked list, otherwise null.
- positionContext must be one of: listed_ranking, prominent, passing, absent.
- sentiment must be one of: positive, neutral, negative, mixed.
- sentimentStrength is an integer 1-10 when mentioned, otherwise 0.
- competitors must only include actual competing brands or companies from the response.
- competitor positions should be the rank in the same list when clear, otherwise null.
- descriptionAccuracy should be accurate, partial, inaccurate, or null when not enough evidence.
- keyQuote must be a short verbatim sentence from the response when mentioned, otherwise null.`;

function hasOpenAIConfig(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.USE_MOCKS !== 'true';
}

export function canUseLLMResponseAnalyzer(): boolean {
  return hasOpenAIConfig();
}

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');
}

function extractBalancedJsonObject(value: string): string | null {
  const start = value.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return null;
}

function removeTrailingCommas(value: string): string {
  return value.replace(/,\s*([}\]])/g, '$1');
}

function parseAnalyzerPayload(content: string): unknown {
  const stripped = stripCodeFences(content).trim();
  const candidates = [
    stripped,
    extractBalancedJsonObject(stripped),
  ]
    .filter((candidate): candidate is string => Boolean(candidate))
    .flatMap((candidate) => {
      const normalized = candidate.replace(/^\uFEFF/, '').trim();
      const repaired = removeTrailingCommas(normalized);
      return repaired === normalized ? [normalized] : [normalized, repaired];
    });

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? new Error(`invalid_json: ${lastError.message}`)
    : new Error('invalid_json');
}

function isMentionType(value: unknown): value is MentionType {
  return value === 'direct' || value === 'indirect' || value === 'not_mentioned';
}

function isPositionContext(value: unknown): value is PositionContext {
  return value === 'listed_ranking' || value === 'prominent' || value === 'passing' || value === 'absent';
}

function isSentiment(value: unknown): value is MentionSentiment {
  return value === 'positive' || value === 'neutral' || value === 'negative' || value === 'mixed';
}

function isDescriptionAccuracy(value: unknown): value is DescriptionAccuracy | null {
  return value == null || value === 'accurate' || value === 'partial' || value === 'inaccurate';
}

function parseCompetitors(value: unknown): CompetitorPosition[] {
  if (!Array.isArray(value)) return [];

  const competitors: CompetitorPosition[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof (item as { name?: unknown }).name === 'string'
      ? (item as { name: string }).name.trim()
      : '';
    if (!name) continue;

    const rawPosition = (item as { position?: unknown }).position;
    const position = typeof rawPosition === 'number' && Number.isFinite(rawPosition)
      ? Math.max(1, Math.round(rawPosition))
      : null;

    competitors.push({ name, position });
  }

  return competitors.slice(0, 10);
}

function sanitizePayload(payload: unknown): LLMAnalysisPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('LLM response was not an object');
  }

  const candidate = payload as Record<string, unknown>;
  const mentionType = isMentionType(candidate.mentionType)
    ? candidate.mentionType
    : (candidate.mentioned ? 'direct' : 'not_mentioned');
  const mentioned = mentionType !== 'not_mentioned' || candidate.mentioned === true;
  const position = typeof candidate.position === 'number' && Number.isFinite(candidate.position)
    ? Math.max(1, Math.round(candidate.position))
    : null;
  const positionContext = isPositionContext(candidate.positionContext)
    ? candidate.positionContext
    : mentioned
      ? position != null
        ? 'listed_ranking'
        : 'passing'
      : 'absent';
  const sentiment = isSentiment(candidate.sentiment)
    ? candidate.sentiment
    : 'neutral';
  const sentimentStrength = mentioned
    ? Math.max(1, Math.min(10, Math.round(Number(candidate.sentimentStrength) || 0 || 5)))
    : 0;

  return {
    mentioned,
    mentionType: mentioned ? mentionType : 'not_mentioned',
    position,
    positionContext,
    sentiment,
    sentimentStrength,
    sentimentReasoning: typeof candidate.sentimentReasoning === 'string' && candidate.sentimentReasoning.trim()
      ? candidate.sentimentReasoning.trim()
      : null,
    keyQuote: typeof candidate.keyQuote === 'string' && candidate.keyQuote.trim()
      ? candidate.keyQuote.trim()
      : null,
    descriptionAccuracy: isDescriptionAccuracy(candidate.descriptionAccuracy)
      ? candidate.descriptionAccuracy
      : null,
    competitors: parseCompetitors(candidate.competitors),
    citationFound: candidate.citationFound === true,
  };
}

function buildUserMessage(response: EngineResponse, context: AnalyzerContext): string {
  const profile = context.businessProfile;

  return [
    `Brand: ${context.brand}`,
    `Domain: ${context.domain ?? profile.domain}`,
    `Industry: ${profile.industry}`,
    `Vertical: ${profile.vertical}`,
    `Business type: ${profile.businessType}`,
    `Location: ${profile.location ?? 'Unknown'}`,
    `Products: ${profile.productCategories.join(', ') || 'Unknown'}`,
    `Services: ${profile.serviceSignals.join(', ') || 'Unknown'}`,
    `Geo signals: ${profile.geoSignals.join(', ') || 'Unknown'}`,
    `Prompt: ${response.prompt.text}`,
    '',
    'AI response:',
    response.text,
    '',
    'Return JSON with keys:',
    '{"mentioned":boolean,"mentionType":"direct|indirect|not_mentioned","position":number|null,"positionContext":"listed_ranking|prominent|passing|absent","sentiment":"positive|neutral|negative|mixed","sentimentStrength":number,"sentimentReasoning":string|null,"keyQuote":string|null,"descriptionAccuracy":"accurate|partial|inaccurate"|null,"competitors":[{"name":string,"position":number|null}],"citationFound":boolean}',
  ].join('\n');
}

function buildOpenAIRequestBody(
  response: EngineResponse,
  context: AnalyzerContext,
  mode: OpenAIResponseFormatMode,
) {
  return {
    model: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 500,
    response_format: mode === 'json_schema'
      ? {
          type: 'json_schema',
          json_schema: ANALYZER_JSON_SCHEMA,
        }
      : { type: 'json_object' as const },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(response, context) },
    ],
  };
}

async function callOpenAI(
  response: EngineResponse,
  context: AnalyzerContext,
  timeoutMs: number,
): Promise<LLMAnalysisPayload> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };

    let res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildOpenAIRequestBody(response, context, 'json_schema')),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const shouldFallbackToJsonObject =
        res.status === 400 && /json_schema|response_format/i.test(detail);

      if (shouldFallbackToJsonObject) {
        res = await fetch(OPENAI_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(buildOpenAIRequestBody(response, context, 'json_object')),
          signal: controller.signal,
        });
      } else {
        throw new Error(`OpenAI API error: ${res.status}${detail ? ` ${detail.slice(0, 240)}` : ''}`);
      }
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI API error: ${res.status}${detail ? ` ${detail.slice(0, 240)}` : ''}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    return sanitizePayload(parseAnalyzerPayload(content));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`timeout_${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetry(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout_|429|rate limit|500|502|503|504|network/i.test(message);
}

async function analyzeSingleResponseWithRetry(
  response: EngineResponse,
  context: AnalyzerContext,
  timeoutMs: number,
  deadlineAt?: number,
): Promise<LLMAnalysisPayload> {
  try {
    return await callOpenAI(response, context, timeoutMs);
  } catch (error) {
    if (!shouldRetry(error)) throw error;
    if (deadlineAt != null) {
      const remainingBudgetMs = deadlineAt - Date.now();
      if (remainingBudgetMs <= ANALYSIS_BUDGET_GUARD_MS) {
        throw error;
      }
      return callOpenAI(
        response,
        context,
        Math.min(timeoutMs, remainingBudgetMs - ANALYSIS_BUDGET_GUARD_MS),
      );
    }
    return callOpenAI(response, context, timeoutMs);
  }
}

function mapToMentionResult(
  response: EngineResponse,
  context: AnalyzerContext,
  payload: LLMAnalysisPayload,
  source: AnalysisSource,
): MentionResult {
  const heuristic = analyzeResponse(response, context.brand, context.domain ?? context.businessProfile.domain);
  const mentionType: MentionType = payload.mentioned ? payload.mentionType : 'not_mentioned';
  const mentioned = mentionType !== 'not_mentioned';
  const competitorsWithPositions = payload.competitors.length > 0
    ? payload.competitors
    : heuristic.competitorsWithPositions;

  const descriptionAccuracy = mentioned
    ? payload.descriptionAccuracy ?? heuristic.descriptionAccuracy ?? 'accurate'
    : null;

  return {
    ...heuristic,
    mentioned,
    mentionType,
    position: mentioned ? payload.position : null,
    positionContext: mentioned ? payload.positionContext : 'absent',
    sentimentLabel: mentioned ? payload.sentiment : null,
    sentiment: mentioned ? normalizeLegacySentiment(payload.sentiment) : null,
    sentimentStrength: mentioned ? payload.sentimentStrength : 0,
    sentimentReasoning: mentioned ? payload.sentimentReasoning : null,
    keyQuote: mentioned ? (payload.keyQuote ?? heuristic.keyQuote) : null,
    descriptionAccuracy,
    descriptionAccurate: descriptionAccuracy === 'accurate',
    competitorsWithPositions,
    competitors: competitorsWithPositions.map((competitor) => competitor.name),
    citationPresent: heuristic.citationPresent || payload.citationFound,
    analysisSource: source,
  };
}

export async function analyzeResponsesWithLLM(
  responses: EngineResponse[],
  context: AnalyzerContext,
  options?: AnalyzerOptions,
): Promise<MentionResult[]> {
  const domain = context.domain ?? context.businessProfile.domain;

  if (!hasOpenAIConfig()) {
    return responses.map((response) => analyzeResponse(response, context.brand, domain));
  }

  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const totalBudgetMs = options?.totalBudgetMs ?? DEFAULT_TOTAL_BUDGET_MS;
  const startedAt = Date.now();
  const deadlineAt = startedAt + totalBudgetMs;
  const results = new Array<MentionResult>(responses.length);
  let llmDisabled = false;
  const concurrency = Math.max(
    1,
    Math.min(
      batchSize,
      responses.length >= 48 ? 4 : responses.length >= 24 ? 6 : batchSize,
    ),
  );
  let nextIndex = 0;
  let consecutiveRetryableFailures = 0;
  let budgetExhausted = false;

  async function analyzeResponseAtIndex(index: number) {
    const response = responses[index];
    const remainingBudgetMs = deadlineAt - Date.now();

    if (llmDisabled || remainingBudgetMs <= ANALYSIS_BUDGET_GUARD_MS) {
      if (!llmDisabled && !budgetExhausted && remainingBudgetMs <= ANALYSIS_BUDGET_GUARD_MS) {
        budgetExhausted = true;
        console.warn('[mention-tests] LLM response analysis budget exhausted; using heuristic fallback for remaining responses.');
      }
      results[index] = analyzeResponse(response, context.brand, domain);
      return;
    }

    const effectiveTimeoutMs = Math.min(timeoutMs, remainingBudgetMs - ANALYSIS_BUDGET_GUARD_MS);

    try {
      const payload = await analyzeSingleResponseWithRetry(response, context, effectiveTimeoutMs, deadlineAt);
      results[index] = mapToMentionResult(response, context, payload, 'llm');
      consecutiveRetryableFailures = 0;
    } catch (error) {
      console.warn('[mention-tests] LLM response analysis failed, using heuristic fallback:', error);
      results[index] = analyzeResponse(response, context.brand, domain);
      if (shouldRetry(error)) {
        consecutiveRetryableFailures += 1;
        if (consecutiveRetryableFailures >= concurrency) {
          llmDisabled = true;
          console.warn('[mention-tests] Disabling LLM response analysis for remaining responses after repeated timeout/rate-limit failures.');
        }
      } else {
        consecutiveRetryableFailures = 0;
      }
    }
  }

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= responses.length) return;
      await analyzeResponseAtIndex(index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return results.map((result, index) =>
    result ?? analyzeResponse(responses[index], context.brand, domain)
  );
}
