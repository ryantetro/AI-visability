import type { PromptMonitoringService, MonitoredPrompt, PromptResult, CompetitorSummary } from '@/types/services';
import type { AIEngine } from '@/types/ai-mentions';

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`;
}

function supabaseHeaders(extra?: HeadersInit): HeadersInit {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ── Row mappers ──────────────────────────────────────────────────

interface PromptRow {
  id: string;
  domain: string;
  user_id: string;
  prompt_text: string;
  category: string;
  industry: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ResultRow {
  id: string;
  prompt_id: string;
  domain: string;
  engine: AIEngine;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  citation_present: boolean;
  citation_urls: unknown[] | null;
  raw_snippet: string | null;
  tested_at: string;
}

function promptFromRow(row: PromptRow): MonitoredPrompt {
  return {
    id: row.id,
    domain: row.domain,
    userId: row.user_id,
    promptText: row.prompt_text,
    category: row.category as MonitoredPrompt['category'],
    industry: row.industry,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resultFromRow(row: ResultRow): PromptResult {
  return {
    id: row.id,
    promptId: row.prompt_id,
    domain: row.domain,
    engine: row.engine,
    mentioned: row.mentioned,
    position: row.position,
    sentiment: row.sentiment,
    citationPresent: row.citation_present,
    citationUrls: row.citation_urls,
    rawSnippet: row.raw_snippet,
    testedAt: row.tested_at,
  };
}

// ── Service implementation ───────────────────────────────────────

export const supabasePromptMonitoring: PromptMonitoringService = {
  async listPrompts(domain: string) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(
      supabaseUrl(`monitored_prompts?domain=eq.${encodeURIComponent(domain)}&order=created_at.asc&select=*`),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to list prompts: ${res.status}`);
    return ((await res.json()) as PromptRow[]).map(promptFromRow);
  },

  async createPrompt(prompt) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(supabaseUrl('monitored_prompts'), {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify({
        domain: prompt.domain,
        user_id: prompt.userId,
        prompt_text: prompt.promptText,
        category: prompt.category,
        industry: prompt.industry,
        active: prompt.active,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Failed to create prompt (${res.status}): ${detail}`);
    }
    const rows = (await res.json()) as PromptRow[];
    return promptFromRow(rows[0]);
  },

  async updatePrompt(id, updates) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.active !== undefined) body.active = updates.active;
    if (updates.promptText !== undefined) body.prompt_text = updates.promptText;
    if (updates.category !== undefined) body.category = updates.category;

    const res = await fetch(
      supabaseUrl(`monitored_prompts?id=eq.${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        headers: supabaseHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Failed to update prompt (${res.status}): ${detail}`);
    }
  },

  async deletePrompt(id) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(
      supabaseUrl(`monitored_prompts?id=eq.${encodeURIComponent(id)}`),
      { method: 'DELETE', headers: supabaseHeaders({ Prefer: 'return=minimal' }) }
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Failed to delete prompt (${res.status}): ${detail}`);
    }
  },

  async savePromptResult(result) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(supabaseUrl('prompt_results'), {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        prompt_id: result.promptId,
        domain: result.domain,
        engine: result.engine,
        mentioned: result.mentioned,
        position: result.position,
        sentiment: result.sentiment,
        citation_present: result.citationPresent,
        citation_urls: result.citationUrls,
        raw_snippet: result.rawSnippet,
        tested_at: result.testedAt,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Failed to save prompt result (${res.status}): ${detail}`);
    }
  },

  async listPromptResults(domain, limit = 100) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(
      supabaseUrl(`prompt_results?domain=eq.${encodeURIComponent(domain)}&order=tested_at.desc&limit=${limit}&select=*`),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to list results: ${res.status}`);
    return ((await res.json()) as ResultRow[]).map(resultFromRow);
  },

  async listResultsByPrompt(promptId, limit = 30) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(
      supabaseUrl(`prompt_results?prompt_id=eq.${encodeURIComponent(promptId)}&order=tested_at.desc&limit=${limit}&select=*`),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to list results by prompt: ${res.status}`);
    return ((await res.json()) as ResultRow[]).map(resultFromRow);
  },

  async listActiveDomainsWithPrompts() {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(
      supabaseUrl('monitored_prompts?active=eq.true&select=domain'),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to list active domains: ${res.status}`);
    const rows = (await res.json()) as { domain: string }[];
    return [...new Set(rows.map((r) => r.domain))];
  },

  async saveCompetitorAppearance(appearance) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const res = await fetch(supabaseUrl('competitor_appearances'), {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        domain: appearance.domain,
        competitor: appearance.competitor,
        competitor_domain: appearance.competitorDomain,
        engine: appearance.engine,
        prompt_id: appearance.promptId,
        position: appearance.position,
        co_mentioned: appearance.coMentioned,
        week_start: appearance.weekStart,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Failed to save competitor appearance (${res.status}): ${detail}`);
    }
  },

  async listCompetitorSummaries(domain, days = 30): Promise<CompetitorSummary[]> {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const res = await fetch(
      supabaseUrl(`competitor_appearances?domain=eq.${encodeURIComponent(domain)}&detected_at=gte.${encodeURIComponent(cutoff)}&order=detected_at.desc&limit=500&select=*`),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to list competitors: ${res.status}`);

    const rows = (await res.json()) as Array<{
      competitor: string;
      engine: AIEngine;
      position: number | null;
      co_mentioned: boolean;
    }>;

    // Aggregate client-side
    const map = new Map<string, { appearances: number; positions: number[]; engines: Set<AIEngine>; coMentioned: number }>();
    for (const row of rows) {
      const existing = map.get(row.competitor);
      if (existing) {
        existing.appearances++;
        if (row.position !== null) existing.positions.push(row.position);
        existing.engines.add(row.engine);
        if (row.co_mentioned) existing.coMentioned++;
      } else {
        map.set(row.competitor, {
          appearances: 1,
          positions: row.position !== null ? [row.position] : [],
          engines: new Set([row.engine]),
          coMentioned: row.co_mentioned ? 1 : 0,
        });
      }
    }

    return Array.from(map.entries())
      .map(([competitor, data]) => ({
        competitor,
        appearances: data.appearances,
        avgPosition: data.positions.length > 0
          ? Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10
          : null,
        engines: [...data.engines],
        coMentionedCount: data.coMentioned,
      }))
      .sort((a, b) => b.appearances - a.appearances);
  },
};
