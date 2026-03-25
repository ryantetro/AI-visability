import { DatabaseService } from '@/types/services';
import { ScanJob } from '@/types/scan';
import { getDomain } from '@/lib/url-utils';

interface SupabaseScanRow {
  id: string;
  url: string;
  normalized_url: string;
  status: ScanJob['status'];
  progress: ScanJob['progress'];
  enrichments: ScanJob['enrichments'] | null;
  email: string | null;
  paid: boolean | null;
  created_at: string;
  completed_at: string | null;
  crawl_data: ScanJob['crawlData'] | null;
  score_result: ScanJob['scoreResult'] | null;
  generated_files: ScanJob['generatedFiles'] | null;
  mention_summary: ScanJob['mentionSummary'] | null;
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function canUseSupabase() {
  return hasSupabaseConfig();
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

function toRow(scan: ScanJob): SupabaseScanRow {
  return {
    id: scan.id,
    url: scan.url,
    normalized_url: scan.normalizedUrl,
    status: scan.status,
    progress: scan.progress,
    enrichments: scan.enrichments || null,
    email: scan.email || null,
    paid: scan.paid ?? false,
    created_at: new Date(scan.createdAt).toISOString(),
    completed_at: scan.completedAt ? new Date(scan.completedAt).toISOString() : null,
    crawl_data: scan.crawlData ?? null,
    score_result: scan.scoreResult ?? null,
    generated_files: scan.generatedFiles ?? null,
    mention_summary: scan.mentionSummary ?? null,
  };
}

function fromRow(row: SupabaseScanRow): ScanJob {
  return {
    id: row.id,
    url: row.url,
    normalizedUrl: row.normalized_url,
    status: row.status,
    progress: row.progress,
    enrichments: row.enrichments || undefined,
    email: row.email || undefined,
    paid: row.paid ?? false,
    createdAt: Date.parse(row.created_at),
    completedAt: row.completed_at ? Date.parse(row.completed_at) : undefined,
    crawlData: row.crawl_data ?? undefined,
    scoreResult: row.score_result ?? undefined,
    generatedFiles: row.generated_files ?? undefined,
    mentionSummary: row.mention_summary ?? undefined,
  };
}

async function queryRows(query: string) {
  const response = await fetch(supabaseUrl(`scans?${query}`), {
    headers: supabaseHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as SupabaseScanRow[];
}

export const supabaseDb: DatabaseService = {
  async getScan(id: string) {
    if (!hasSupabaseConfig()) {
      throw new Error('Supabase is not configured.');
    }

    const rows = await queryRows(`id=eq.${encodeURIComponent(id)}&select=*`);
    return rows[0] ? fromRow(rows[0]) : null;
  },

  async saveScan(scan: ScanJob) {
    if (!hasSupabaseConfig()) {
      throw new Error('Supabase is not configured.');
    }

    const response = await fetch(supabaseUrl('scans'), {
      method: 'POST',
      headers: supabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(toRow(scan)),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase save failed (${response.status}): ${detail}`);
    }
  },

  async findScanByUrl(normalizedUrl: string, maxAgeMs = 24 * 60 * 60 * 1000) {
    if (!hasSupabaseConfig()) {
      throw new Error('Supabase is not configured.');
    }

    const rows = await queryRows(
      `normalized_url=eq.${encodeURIComponent(normalizedUrl)}&status=eq.complete&order=created_at.desc&limit=10&select=*`
    );
    const cutoff = Date.now() - maxAgeMs;
    const match = rows.find((row) => Date.parse(row.created_at) >= cutoff);
    return match ? fromRow(match) : null;
  },

  async listCompletedScans(limit = 50, email?: string) {
    if (!hasSupabaseConfig()) {
      throw new Error('Supabase is not configured.');
    }

    let query = `status=eq.complete&order=completed_at.desc.nullslast,created_at.desc&limit=${Math.max(1, Math.min(limit, 200))}&select=*`;
    if (email) {
      query += `&email=eq.${encodeURIComponent(email)}`;
    }

    const rows = await queryRows(query);
    return rows.map(fromRow);
  },

  async findLatestScanByDomain(domain: string, email?: string) {
    if (!hasSupabaseConfig()) {
      throw new Error('Supabase is not configured.');
    }

    const normalizedDomain = domain.toLowerCase();
    let query = `status=eq.complete&order=completed_at.desc.nullslast,created_at.desc&limit=50&select=*&url=ilike.*${encodeURIComponent(normalizedDomain)}*`;
    if (email) {
      query += `&email=eq.${encodeURIComponent(email)}`;
    }

    const rows = await queryRows(query);
    const match = rows.find((row) => getDomain(row.url) === normalizedDomain);
    return match ? fromRow(match) : null;
  },
};
