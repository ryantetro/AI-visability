import type { ReferralVisitService, ReferralVisit } from '@/types/services';

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
  source_engine: string;
  referrer_url: string | null;
  landing_page: string;
  user_agent: string | null;
  visited_at: string;
}

function fromRow(row: VisitRow): ReferralVisit {
  return {
    id: row.id,
    domain: row.domain,
    sourceEngine: row.source_engine as ReferralVisit['sourceEngine'],
    referrerUrl: row.referrer_url,
    landingPage: row.landing_page,
    userAgent: row.user_agent,
    visitedAt: row.visited_at,
  };
}

async function fetchAllVisitRows(path: string): Promise<VisitRow[]> {
  const rows: VisitRow[] = [];

  for (let offset = 0; ; offset += SUPABASE_PAGE_SIZE) {
    const res = await fetch(
      supabaseUrl(`${path}&limit=${SUPABASE_PAGE_SIZE}&offset=${offset}`),
      { headers: supabaseHeaders(), cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error(`Failed to list referral visits: ${res.status}`);
    }

    const page = (await res.json()) as VisitRow[];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export const supabaseReferralVisits: ReferralVisitService = {
  async logVisit(visit) {
    if (!hasSupabaseConfig()) return;

    const res = await fetch(supabaseUrl('ai_referral_visits'), {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        domain: visit.domain,
        source_engine: visit.sourceEngine,
        referrer_url: visit.referrerUrl,
        landing_page: visit.landingPage,
        user_agent: visit.userAgent,
      }),
    });
    if (!res.ok) {
      console.error(`Failed to log referral visit: ${res.status}`);
    }
  },

  async listVisits(domain, days = 30) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await fetchAllVisitRows(
      `ai_referral_visits?domain=eq.${encodeURIComponent(domain)}&visited_at=gte.${encodeURIComponent(cutoff)}&order=visited_at.desc&select=*`
    );
    return rows.map(fromRow);
  },

  async countVisits(domain, days = 30) {
    if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const res = await fetch(
      supabaseUrl(`ai_referral_visits?domain=eq.${encodeURIComponent(domain)}&visited_at=gte.${encodeURIComponent(cutoff)}&select=id&limit=1`),
      { headers: supabaseHeaders({ Prefer: 'count=exact' }), cache: 'no-store' }
    );
    if (!res.ok) return 0;
    const range = res.headers.get('content-range');
    if (!range) return 0;
    const total = range.split('/')[1];
    return total && total !== '*' ? parseInt(total, 10) : 0;
  },
};
