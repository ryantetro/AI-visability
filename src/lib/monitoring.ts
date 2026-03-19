import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/services/registry';
import { getDomain } from '@/lib/url-utils';

export interface MonitoringRecord {
  id: string;
  domain: string;
  url: string;
  scanId: string;
  email: string;
  alertThreshold: number;
  status: 'active' | 'paused';
  createdAt: number;
  updatedAt: number;
}

const globalStore = globalThis as unknown as {
  __aisoMonitoring?: Map<string, MonitoringRecord>;
};

function getMonitoringStore() {
  if (!globalStore.__aisoMonitoring) {
    globalStore.__aisoMonitoring = new Map();
  }
  return globalStore.__aisoMonitoring;
}

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

async function querySupabase<T>(path: string) {
  const response = await fetch(supabaseUrl(path), {
    headers: supabaseHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase monitoring query failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

function fromRow(row: {
  id: string;
  domain: string;
  alert_threshold: number;
  created_at: string;
  status?: 'active' | 'paused' | null;
  updated_at?: string | null;
  scan_id?: string | null;
  url?: string | null;
  email?: string | null;
}) {
  return {
    id: row.id,
    domain: row.domain,
    url: row.url ?? `https://${row.domain}`,
    scanId: row.scan_id ?? '',
    email: row.email ?? '',
    alertThreshold: row.alert_threshold,
    status: row.status ?? 'active',
    createdAt: Date.parse(row.created_at),
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.parse(row.created_at),
  } satisfies MonitoringRecord;
}

async function saveRecord(record: MonitoringRecord) {
  if (hasSupabaseConfig()) {
    const response = await fetch(supabaseUrl('monitoring_domains'), {
      method: 'POST',
      headers: supabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        id: record.id,
        domain: record.domain,
        alert_threshold: record.alertThreshold,
        created_at: new Date(record.createdAt).toISOString(),
        updated_at: new Date(record.updatedAt).toISOString(),
        status: record.status,
        scan_id: record.scanId,
        url: record.url,
        email: record.email,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase monitoring save failed (${response.status}): ${detail}`);
    }
    return;
  }

  getMonitoringStore().set(record.domain, record);
}

export async function addMonitoringDomain(input: {
  scanId: string;
  alertThreshold?: number;
}) {
  const db = getDatabase();
  const scan = await db.getScan(input.scanId);

  if (!scan || !scan.url) {
    throw new Error('Scan not found.');
  }

  if (!scan.email) {
    throw new Error('Email is required before monitoring can be enabled.');
  }

  const domain = getDomain(scan.url);
  const now = Date.now();

  const record: MonitoringRecord = {
    id: randomUUID(),
    domain,
    url: scan.url,
    scanId: scan.id,
    email: scan.email,
    alertThreshold: Math.max(1, Math.min(input.alertThreshold ?? 5, 100)),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await saveRecord(record);

  return record;
}

export async function listMonitoringDomains(email: string) {
  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        domain: string;
        alert_threshold: number;
        created_at: string;
        status?: 'active' | 'paused' | null;
        updated_at?: string | null;
        scan_id?: string | null;
        url?: string | null;
        email?: string | null;
      }>
    >(`monitoring_domains?email=eq.${encodeURIComponent(email)}&select=*`);
    return rows.map(fromRow).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return [...getMonitoringStore().values()]
    .filter((record) => record.email === email)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listActiveMonitoringDomains(): Promise<MonitoringRecord[]> {
  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        domain: string;
        alert_threshold: number;
        created_at: string;
        status?: 'active' | 'paused' | null;
        updated_at?: string | null;
        scan_id?: string | null;
        url?: string | null;
        email?: string | null;
      }>
    >('monitoring_domains?status=eq.active&select=*');
    return rows.map(fromRow);
  }

  return [...getMonitoringStore().values()].filter((r) => r.status === 'active');
}

export async function removeMonitoringDomain(domain: string, email?: string) {
  const normalizedDomain = domain.toLowerCase();

  if (hasSupabaseConfig()) {
    const filters = [`domain=eq.${encodeURIComponent(normalizedDomain)}`];
    if (email) {
      filters.push(`email=eq.${encodeURIComponent(email)}`);
    }

    const response = await fetch(supabaseUrl(`monitoring_domains?${filters.join('&')}`), {
      method: 'DELETE',
      headers: supabaseHeaders({
        Prefer: 'return=minimal',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase monitoring delete failed (${response.status}): ${detail}`);
    }
    return true;
  }

  const record = getMonitoringStore().get(normalizedDomain);
  if (!record) return false;
  if (email && record.email !== email) return false;
  getMonitoringStore().delete(normalizedDomain);
  return true;
}

