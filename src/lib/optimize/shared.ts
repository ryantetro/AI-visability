import { getSupabaseClient } from '@/lib/supabase';
import { getDomain } from '@/lib/url-utils';
import type { AIEngine, DescriptionAccuracy, MentionSentiment, MentionType } from '@/types/ai-mentions';

export interface OptimizePrompt {
  id: string;
  promptText: string;
  category: string;
}

export interface OptimizePromptResult {
  promptId: string;
  engine: AIEngine;
  mentioned: boolean;
  mentionType: MentionType;
  position: number | null;
  testedAt: string;
  citationUrls: unknown[] | null;
  competitorsJson: Array<{ name: string; position: number | null }> | null;
  sentimentLabel: MentionSentiment | null;
  rawSnippet: string | null;
  descriptionAccuracy: DescriptionAccuracy | null;
}

export interface ParsedCitation {
  url: string | null;
  domain: string;
  anchorText: string | null;
  isOwnDomain: boolean;
  isCompetitor: boolean;
}

export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return normalized || null;
}

export async function ensureOwnedDomain(userId: string, rawDomain: string | null | undefined): Promise<string | null> {
  const domain = normalizeDomain(rawDomain);
  if (!domain) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_domains')
    .select('domain')
    .eq('user_id', userId)
    .eq('domain', domain)
    .maybeSingle();

  if (error || !data?.domain) return null;
  return domain;
}

export function startOfCurrentMonthUtc(): Date {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return monthStart;
}

export function inferBrandName(domain: string): string {
  const label = domain.replace(/^www\./, '').split('.')[0] ?? domain;
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseStringArray(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function parseCitationEntries(value: unknown): ParsedCitation[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const row = entry as {
        url?: unknown;
        domain?: unknown;
        anchorText?: unknown;
        isOwnDomain?: unknown;
        isCompetitor?: unknown;
      };

      const url = typeof row.url === 'string' ? row.url : null;
      const domain = normalizeDomain(
        typeof row.domain === 'string'
          ? row.domain
          : url
            ? getDomain(url)
            : null
      );

      if (!domain) return null;

      return {
        url,
        domain,
        anchorText: typeof row.anchorText === 'string' ? row.anchorText : null,
        isOwnDomain: row.isOwnDomain === true,
        isCompetitor: row.isCompetitor === true,
      } satisfies ParsedCitation;
    })
    .filter((entry): entry is ParsedCitation => Boolean(entry));
}

export function pickLatestByKey<T>(
  rows: T[],
  getKey: (row: T) => string,
  getTimestamp: (row: T) => string | number,
): T[] {
  const latest = new Map<string, T>();

  for (const row of rows) {
    const key = getKey(row);
    const timestamp = Date.parse(String(getTimestamp(row)));
    const existing = latest.get(key);

    if (!existing) {
      latest.set(key, row);
      continue;
    }

    const existingTimestamp = Date.parse(String(getTimestamp(existing)));
    if (timestamp > existingTimestamp) {
      latest.set(key, row);
    }
  }

  return [...latest.values()];
}

export async function getPromptContext(userId: string, domain: string): Promise<{
  prompts: OptimizePrompt[];
  latestResults: OptimizePromptResult[];
  promptById: Map<string, OptimizePrompt>;
}> {
  const supabase = getSupabaseClient();
  const { data: promptRows } = await supabase
    .from('monitored_prompts')
    .select('id, prompt_text, category')
    .eq('user_id', userId)
    .eq('domain', domain)
    .eq('active', true)
    .order('created_at', { ascending: true });

  const prompts = (promptRows ?? []).map((row) => ({
    id: String(row.id),
    promptText: String(row.prompt_text),
    category: String(row.category ?? 'custom'),
  }));

  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  if (prompts.length === 0) {
    return { prompts, latestResults: [], promptById };
  }

  const promptIds = prompts.map((prompt) => prompt.id);
  const limit = Math.min(3000, Math.max(200, promptIds.length * 12));

  const { data: resultRows } = await supabase
    .from('prompt_results')
    .select('prompt_id, engine, mentioned, mention_type, position, tested_at, citation_urls, competitors_json, sentiment_label, raw_snippet, description_accuracy')
    .in('prompt_id', promptIds)
    .order('tested_at', { ascending: false })
    .limit(limit);

  const latestResults = pickLatestByKey(
    (resultRows ?? []).map((row) => ({
      promptId: String(row.prompt_id),
      engine: row.engine as AIEngine,
      mentioned: row.mentioned === true,
      mentionType: (row.mention_type ?? (row.mentioned ? 'direct' : 'not_mentioned')) as MentionType,
      position: typeof row.position === 'number' ? row.position : null,
      testedAt: String(row.tested_at),
      citationUrls: Array.isArray(row.citation_urls) ? row.citation_urls : null,
      competitorsJson: Array.isArray(row.competitors_json)
        ? row.competitors_json
            .filter((item): item is { name: string; position: number | null } => {
              return Boolean(item && typeof item === 'object' && typeof item.name === 'string');
            })
            .map((item) => ({ name: item.name, position: typeof item.position === 'number' ? item.position : null }))
        : null,
      sentimentLabel: (row.sentiment_label ?? null) as MentionSentiment | null,
      rawSnippet: typeof row.raw_snippet === 'string' ? row.raw_snippet : null,
      descriptionAccuracy: (row.description_accuracy ?? null) as DescriptionAccuracy | null,
    })),
    (row) => `${row.promptId}:${row.engine}`,
    (row) => row.testedAt,
  );

  return { prompts, latestResults, promptById };
}

export async function getLatestCompletedScanForDomain(domain: string): Promise<{
  id: string;
  url: string;
  scoreResult: unknown;
  mentionSummary: unknown;
  completedAt: string | null;
} | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('scans')
    .select('id, url, score_result, mention_summary, completed_at')
    .eq('status', 'complete')
    .ilike('url', `%${domain}%`)
    .order('completed_at', { ascending: false })
    .limit(40);

  const row = (data ?? []).find((candidate) => normalizeDomain(getDomain(String(candidate.url))) === domain);
  if (!row) return null;

  return {
    id: String(row.id),
    url: String(row.url),
    scoreResult: row.score_result ?? null,
    mentionSummary: row.mention_summary ?? null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

export async function getContentStudioUsage(userId: string): Promise<{
  briefsUsed: number;
  draftsUsed: number;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('content_studio_items')
      .select('status')
      .eq('user_id', userId)
      .gte('created_at', startOfCurrentMonthUtc().toISOString());

    const rows = data ?? [];
    const briefsUsed = rows.filter((row) => row.status && row.status !== 'opportunity').length;
    const draftsUsed = rows.filter((row) => row.status === 'draft' || row.status === 'published').length;
    return { briefsUsed, draftsUsed };
  } catch {
    return { briefsUsed: 0, draftsUsed: 0 };
  }
}
