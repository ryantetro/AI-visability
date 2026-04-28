import type { CrawlerVisitService, CrawlerVisit, CrawlerVisitSummary } from '@/types/services';

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

const SUPABASE_PAGE_SIZE = 1000;

interface VisitRow {
  id: string;
  domain: string;
  bot_name: string;
  bot_category: string;
  page_path: string;
  user_agent: string | null;
  response_code: number | null;
  visited_at: string;
}

function fromRow(row: VisitRow): CrawlerVisit {
  return {
    id: row.id,
    domain: row.domain,
    botName: row.bot_name,
    botCategory: row.bot_category as CrawlerVisit['botCategory'],
    pagePath: row.page_path,
    userAgent: row.user_agent,
    responseCode: row.response_code,
    visitedAt: row.visited_at,
  };
}

async function fetchAllVisitRows<T>(path: string): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += SUPABASE_PAGE_SIZE) {
    const res = await fetch(
      supabaseUrl(`${path}&limit=${SUPABASE_PAGE_SIZE}&offset=${offset}`),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error(`Failed to list crawler visits: ${res.status}`);
    }

    const page = (await res.json()) as T[];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export const supabaseCrawlerVisits: CrawlerVisitService = {
  async logVisit(visit) {
    if (!hasSupabaseConfig()) return; // silent no-op if not configured

    const res = await fetch(supabaseUrl('ai_crawler_visits'), {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        domain: visit.domain,
        bot_name: visit.botName,
        bot_category: visit.botCategory,
        page_path: visit.pagePath,
        user_agent: visit.userAgent,
        response_code: visit.responseCode,
      }),
    });
    if (!res.ok) {
      // Log but don't throw — bot logging shouldn't break requests
      console.error(`Failed to log crawler visit: ${res.status}`);
    }
  },

  async listVisits(domain, days = 30) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await fetchAllVisitRows<VisitRow>(
      `ai_crawler_visits?domain=eq.${encodeURIComponent(domain)}&visited_at=gte.${encodeURIComponent(cutoff)}&order=visited_at.desc&select=*`
    );
    return rows.map(fromRow);
  },

  async countVisits(domain, days = 30) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const res = await fetch(
      supabaseUrl(`ai_crawler_visits?domain=eq.${encodeURIComponent(domain)}&visited_at=gte.${encodeURIComponent(cutoff)}&select=id&limit=1`),
      { headers: supabaseHeaders({ Prefer: 'count=exact' }), cache: 'no-store' }
    );
    if (!res.ok) return 0;
    const range = res.headers.get('content-range');
    if (!range) return 0;
    const total = range.split('/')[1];
    return total && total !== '*' ? parseInt(total, 10) : 0;
  },

  async listVisitSummaries(domain, days = 30): Promise<CrawlerVisitSummary[]> {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await fetchAllVisitRows<{
      bot_name: string;
      bot_category: string;
      page_path: string;
      visited_at: string;
    }>(
      `ai_crawler_visits?domain=eq.${encodeURIComponent(domain)}&visited_at=gte.${encodeURIComponent(cutoff)}&order=visited_at.desc&select=bot_name,bot_category,page_path,visited_at`
    );

    const map = new Map<string, { category: string; count: number; paths: Set<string>; lastSeen: string }>();
    for (const row of rows) {
      const existing = map.get(row.bot_name);
      if (existing) {
        existing.count++;
        existing.paths.add(row.page_path);
        if (row.visited_at > existing.lastSeen) existing.lastSeen = row.visited_at;
      } else {
        map.set(row.bot_name, {
          category: row.bot_category,
          count: 1,
          paths: new Set([row.page_path]),
          lastSeen: row.visited_at,
        });
      }
    }

    return Array.from(map.entries())
      .map(([botName, data]) => ({
        botName,
        botCategory: data.category,
        visitCount: data.count,
        uniquePaths: data.paths.size,
        lastSeen: data.lastSeen,
      }))
      .sort((a, b) => b.visitCount - a.visitCount);
  },
};
