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
  opportunityAlertsEnabled: boolean;
  lastOpportunityAlertAt: number | null;
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

export function resetMonitoringStore() {
  getMonitoringStore().clear();
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
  opportunity_alerts_enabled?: boolean | null;
  last_opportunity_alert_at?: string | null;
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
    email: row.email ? normalizeEmail(row.email) : '',
    alertThreshold: row.alert_threshold,
    opportunityAlertsEnabled: row.opportunity_alerts_enabled ?? true,
    lastOpportunityAlertAt: row.last_opportunity_alert_at ? Date.parse(row.last_opportunity_alert_at) : null,
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
        opportunity_alerts_enabled: record.opportunityAlertsEnabled,
        last_opportunity_alert_at: record.lastOpportunityAlertAt ? new Date(record.lastOpportunityAlertAt).toISOString() : null,
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
  email?: string;
}) {
  const db = getDatabase();
  const scan = await db.getScan(input.scanId);

  if (!scan || !scan.url) {
    throw new Error('Scan not found.');
  }

  const scanEmail = scan.email ? normalizeEmail(scan.email) : '';
  const requestedEmail = input.email ? normalizeEmail(input.email) : '';

  if (requestedEmail) {
    if (!scanEmail || scanEmail !== requestedEmail) {
      throw new Error('This scan belongs to another account.');
    }
  } else if (!scanEmail) {
    throw new Error('Email is required before monitoring can be enabled.');
  }

  const domain = getDomain(scan.url);
  const now = Date.now();

  const record: MonitoringRecord = {
    id: randomUUID(),
    domain,
    url: scan.url,
    scanId: scan.id,
    email: requestedEmail || scanEmail,
    alertThreshold: Math.max(1, Math.min(input.alertThreshold ?? 5, 100)),
    opportunityAlertsEnabled: true,
    lastOpportunityAlertAt: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await saveRecord(record);

  return record;
}

export async function listMonitoringDomains(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        domain: string;
        alert_threshold: number;
        opportunity_alerts_enabled?: boolean | null;
        last_opportunity_alert_at?: string | null;
        created_at: string;
        status?: 'active' | 'paused' | null;
        updated_at?: string | null;
        scan_id?: string | null;
        url?: string | null;
        email?: string | null;
      }>
    >(`monitoring_domains?email=eq.${encodeURIComponent(normalizedEmail)}&select=*`);
    return rows.map(fromRow).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return [...getMonitoringStore().values()]
    .filter((record) => normalizeEmail(record.email) === normalizedEmail)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listActiveMonitoringDomains(): Promise<MonitoringRecord[]> {
  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        domain: string;
        alert_threshold: number;
        opportunity_alerts_enabled?: boolean | null;
        last_opportunity_alert_at?: string | null;
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
  const normalizedEmail = email ? normalizeEmail(email) : undefined;

  if (hasSupabaseConfig()) {
    const filters = [`domain=eq.${encodeURIComponent(normalizedDomain)}`];
    if (normalizedEmail) {
      filters.push(`email=eq.${encodeURIComponent(normalizedEmail)}`);
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
  if (normalizedEmail && normalizeEmail(record.email) !== normalizedEmail) return false;
  getMonitoringStore().delete(normalizedDomain);
  return true;
}

export async function getMonitoringDomain(domain: string, email: string): Promise<MonitoringRecord | null> {
  const normalizedDomain = domain.toLowerCase();
  const normalizedEmail = normalizeEmail(email);

  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        domain: string;
        alert_threshold: number;
        opportunity_alerts_enabled?: boolean | null;
        last_opportunity_alert_at?: string | null;
        created_at: string;
        status?: 'active' | 'paused' | null;
        updated_at?: string | null;
        scan_id?: string | null;
        url?: string | null;
        email?: string | null;
      }>
    >(`monitoring_domains?domain=eq.${encodeURIComponent(normalizedDomain)}&email=eq.${encodeURIComponent(normalizedEmail)}&order=updated_at.desc&limit=1&select=*`);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  const record = getMonitoringStore().get(normalizedDomain);
  if (!record || normalizeEmail(record.email) !== normalizedEmail) return null;
  return record;
}

export async function updateMonitoringDomain(
  domain: string,
  email: string,
  updates: {
    opportunityAlertsEnabled?: boolean;
    lastOpportunityAlertAt?: number | null;
  }
): Promise<MonitoringRecord | null> {
  const normalizedDomain = domain.toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  const nowIso = new Date().toISOString();

  if (hasSupabaseConfig()) {
    const payload: Record<string, unknown> = {
      updated_at: nowIso,
    };

    if (updates.opportunityAlertsEnabled !== undefined) {
      payload.opportunity_alerts_enabled = updates.opportunityAlertsEnabled;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'lastOpportunityAlertAt')) {
      payload.last_opportunity_alert_at = updates.lastOpportunityAlertAt
        ? new Date(updates.lastOpportunityAlertAt).toISOString()
        : null;
    }

    const response = await fetch(
      supabaseUrl(`monitoring_domains?domain=eq.${encodeURIComponent(normalizedDomain)}&email=eq.${encodeURIComponent(normalizedEmail)}&select=*`),
      {
        method: 'PATCH',
        headers: supabaseHeaders({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase monitoring update failed (${response.status}): ${detail}`);
    }

    const rows = await response.json() as Array<{
      id: string;
      domain: string;
      alert_threshold: number;
      opportunity_alerts_enabled?: boolean | null;
      last_opportunity_alert_at?: string | null;
      created_at: string;
      status?: 'active' | 'paused' | null;
      updated_at?: string | null;
      scan_id?: string | null;
      url?: string | null;
      email?: string | null;
    }>;
    return rows[0] ? fromRow(rows[0]) : null;
  }

  const current = getMonitoringStore().get(normalizedDomain);
  if (!current || normalizeEmail(current.email) !== normalizedEmail) return null;

  const next: MonitoringRecord = {
    ...current,
    opportunityAlertsEnabled: updates.opportunityAlertsEnabled ?? current.opportunityAlertsEnabled,
    lastOpportunityAlertAt: Object.prototype.hasOwnProperty.call(updates, 'lastOpportunityAlertAt')
      ? updates.lastOpportunityAlertAt ?? null
      : current.lastOpportunityAlertAt,
    updatedAt: Date.now(),
  };
  getMonitoringStore().set(normalizedDomain, next);
  return next;
}
