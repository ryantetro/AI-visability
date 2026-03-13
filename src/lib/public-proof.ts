import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/services/registry';
import { getPublicScoreSummary, PublicScoreSummary } from '@/lib/public-score';
import { getDomain } from '@/lib/url-utils';

export interface DomainVerificationRecord {
  id: string;
  domain: string;
  url: string;
  scanId: string;
  email?: string;
  verificationToken: string;
  status: 'pending' | 'verified';
  method?: 'meta-tag' | 'well-known';
  createdAt: number;
  verifiedAt?: number;
}

export interface PublicProfileRecord {
  id: string;
  scanId: string;
  domain: string;
  enabled: boolean;
  badgeEnabled: boolean;
  leaderboardEnabled: boolean;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DomainVerificationInstructions {
  domain: string;
  token: string;
  metaTag: string;
  filePath: string;
  fileContents: string;
}

export interface LeaderboardEntry {
  rank: number;
  summary: PublicScoreSummary;
  profile: PublicProfileRecord;
}

const globalStore = globalThis as unknown as {
  __aisoPublicProfiles?: Map<string, PublicProfileRecord>;
  __aisoDomainVerifications?: Map<string, DomainVerificationRecord>;
};

function getPublicProfileStore() {
  if (!globalStore.__aisoPublicProfiles) {
    globalStore.__aisoPublicProfiles = new Map();
  }
  return globalStore.__aisoPublicProfiles;
}

function getVerificationStore() {
  if (!globalStore.__aisoDomainVerifications) {
    globalStore.__aisoDomainVerifications = new Map();
  }
  return globalStore.__aisoDomainVerifications;
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseUrl(path: string) {
  return `${process.env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`;
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
    throw new Error(`Supabase public-proof query failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

function profileRowToRecord(row: {
  id: string;
  scan_id: string;
  domain: string;
  enabled: boolean;
  badge_enabled: boolean;
  leaderboard_enabled: boolean;
  verified?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}): PublicProfileRecord {
  return {
    id: row.id,
    scanId: row.scan_id,
    domain: row.domain,
    enabled: row.enabled,
    badgeEnabled: row.badge_enabled,
    leaderboardEnabled: row.leaderboard_enabled,
    verified: row.verified ?? false,
    createdAt: Date.parse(row.created_at),
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.parse(row.created_at),
  };
}

function verificationRowToRecord(row: {
  id: string;
  domain: string;
  verification_token: string;
  status: 'pending' | 'verified';
  method?: 'meta-tag' | 'well-known' | null;
  created_at: string;
  verified_at?: string | null;
  scan_id?: string | null;
  url?: string | null;
  email?: string | null;
}): DomainVerificationRecord {
  return {
    id: row.id,
    domain: row.domain,
    verificationToken: row.verification_token,
    status: row.status,
    method: row.method ?? undefined,
    createdAt: Date.parse(row.created_at),
    verifiedAt: row.verified_at ? Date.parse(row.verified_at) : undefined,
    scanId: row.scan_id ?? '',
    url: row.url ?? `https://${row.domain}`,
    email: row.email ?? undefined,
  };
}

async function getProfileByDomain(domain: string): Promise<PublicProfileRecord | null> {
  const normalizedDomain = domain.toLowerCase();

  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        scan_id: string;
        domain: string;
        enabled: boolean;
        badge_enabled: boolean;
        leaderboard_enabled: boolean;
        verified?: boolean | null;
        created_at: string;
        updated_at?: string | null;
      }>
    >(`public_profiles?domain=eq.${encodeURIComponent(normalizedDomain)}&limit=1&select=*`);
    return rows[0] ? profileRowToRecord(rows[0]) : null;
  }

  return getPublicProfileStore().get(normalizedDomain) ?? null;
}

async function getVerificationByDomain(domain: string): Promise<DomainVerificationRecord | null> {
  const normalizedDomain = domain.toLowerCase();

  if (hasSupabaseConfig()) {
    const rows = await querySupabase<
      Array<{
        id: string;
        domain: string;
        verification_token: string;
        status: 'pending' | 'verified';
        method?: 'meta-tag' | 'well-known' | null;
        created_at: string;
        verified_at?: string | null;
        scan_id?: string | null;
        url?: string | null;
        email?: string | null;
      }>
    >(`domain_verifications?domain=eq.${encodeURIComponent(normalizedDomain)}&limit=1&select=*`);
    return rows[0] ? verificationRowToRecord(rows[0]) : null;
  }

  return getVerificationStore().get(normalizedDomain) ?? null;
}

async function saveProfile(record: PublicProfileRecord) {
  if (hasSupabaseConfig()) {
    const response = await fetch(supabaseUrl('public_profiles'), {
      method: 'POST',
      headers: supabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        id: record.id,
        scan_id: record.scanId,
        domain: record.domain,
        enabled: record.enabled,
        badge_enabled: record.badgeEnabled,
        leaderboard_enabled: record.leaderboardEnabled,
        verified: record.verified,
        created_at: new Date(record.createdAt).toISOString(),
        updated_at: new Date(record.updatedAt).toISOString(),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase public profile save failed (${response.status}): ${detail}`);
    }
    return;
  }

  getPublicProfileStore().set(record.domain, record);
}

async function saveVerification(record: DomainVerificationRecord) {
  if (hasSupabaseConfig()) {
    const response = await fetch(supabaseUrl('domain_verifications'), {
      method: 'POST',
      headers: supabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        id: record.id,
        domain: record.domain,
        verification_token: record.verificationToken,
        status: record.status,
        method: record.method ?? null,
        created_at: new Date(record.createdAt).toISOString(),
        verified_at: record.verifiedAt ? new Date(record.verifiedAt).toISOString() : null,
        scan_id: record.scanId,
        url: record.url,
        email: record.email ?? null,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase domain verification save failed (${response.status}): ${detail}`);
    }
    return;
  }

  getVerificationStore().set(record.domain, record);
}

function buildInstructions(domain: string, token: string): DomainVerificationInstructions {
  return {
    domain,
    token,
    metaTag: `<meta name="aiso-verification" content="${token}" />`,
    filePath: '/.well-known/aiso-verification.txt',
    fileContents: token,
  };
}

export async function startDomainVerification(input: {
  scanId: string;
  url: string;
  email?: string;
  enablePublicScore?: boolean;
  enableBadge?: boolean;
  enableLeaderboard?: boolean;
}) {
  const domain = getDomain(input.url);
  const existingProfile = await getProfileByDomain(domain);
  const existingVerification = await getVerificationByDomain(domain);
  const token = randomUUID().replace(/-/g, '');
  const now = Date.now();

  const verification: DomainVerificationRecord = {
    id: existingVerification?.id ?? randomUUID(),
    domain,
    url: input.url,
    scanId: input.scanId,
    email: input.email,
    verificationToken: token,
    status: 'pending',
    method: undefined,
    createdAt: existingVerification?.createdAt ?? now,
  };

  const profile: PublicProfileRecord = {
    id: existingProfile?.id ?? randomUUID(),
    scanId: input.scanId,
    domain,
    enabled: Boolean(input.enablePublicScore ?? existingProfile?.enabled),
    badgeEnabled: Boolean(input.enableBadge ?? existingProfile?.badgeEnabled),
    leaderboardEnabled: Boolean(input.enableLeaderboard ?? existingProfile?.leaderboardEnabled),
    verified: false,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
  };

  await saveVerification(verification);
  await saveProfile(profile);

  return {
    verification,
    profile,
    instructions: buildInstructions(domain, token),
  };
}

export async function confirmDomainVerification(input: {
  domain: string;
  enablePublicScore?: boolean;
  enableBadge?: boolean;
  enableLeaderboard?: boolean;
}) {
  const normalizedDomain = input.domain.toLowerCase();
  const verification = await getVerificationByDomain(normalizedDomain);

  if (!verification) {
    return { verified: false, reason: 'Verification not started.' as const };
  }

  const instructions = buildInstructions(normalizedDomain, verification.verificationToken);
  const origin = new URL(verification.url).origin;

  let detectedMethod: 'meta-tag' | 'well-known' | null = null;

  try {
    const pageResponse = await fetch(origin, { cache: 'no-store' });
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      if (html.includes(instructions.metaTag)) {
        detectedMethod = 'meta-tag';
      }
    }
  } catch {
    // Ignore network failures here and try the fallback path.
  }

  if (!detectedMethod) {
    try {
      const fileResponse = await fetch(`${origin}${instructions.filePath}`, { cache: 'no-store' });
      if (fileResponse.ok) {
        const text = (await fileResponse.text()).trim();
        if (text.includes(verification.verificationToken)) {
          detectedMethod = 'well-known';
        }
      }
    } catch {
      // Ignore network failures and return a pending status below.
    }
  }

  if (!detectedMethod) {
    return {
      verified: false,
      reason: 'Verification token not found on the live site.' as const,
      instructions,
    };
  }

  const now = Date.now();
  const updatedVerification: DomainVerificationRecord = {
    ...verification,
    status: 'verified',
    method: detectedMethod,
    verifiedAt: now,
  };

  const existingProfile = await getProfileByDomain(normalizedDomain);
  const updatedProfile: PublicProfileRecord = {
    id: existingProfile?.id ?? randomUUID(),
    scanId: existingProfile?.scanId ?? verification.scanId,
    domain: normalizedDomain,
    enabled: input.enablePublicScore ?? existingProfile?.enabled ?? true,
    badgeEnabled: input.enableBadge ?? existingProfile?.badgeEnabled ?? true,
    leaderboardEnabled: input.enableLeaderboard ?? existingProfile?.leaderboardEnabled ?? false,
    verified: true,
    createdAt: existingProfile?.createdAt ?? verification.createdAt,
    updatedAt: now,
  };

  await saveVerification(updatedVerification);
  await saveProfile(updatedProfile);

  return {
    verified: true,
    method: detectedMethod,
    profile: updatedProfile,
  };
}

export async function getPublicProfile(scanId: string) {
  const summary = await getPublicScoreSummary(scanId);
  if (!summary) return null;
  const profile = await getProfileByDomain(summary.domain);
  if (!profile || profile.scanId !== scanId) return null;
  return profile;
}

export async function listLeaderboardEntries(limit = 25): Promise<LeaderboardEntry[]> {
  const db = getDatabase();
  const scans = await db.listCompletedScans(Math.max(limit * 4, 50));
  const entries: Array<{ summary: PublicScoreSummary; profile: PublicProfileRecord }> = [];

  for (const scan of scans) {
    const profile = await getProfileByDomain(getDomain(scan.url));
    if (!profile || !profile.verified || !profile.enabled || !profile.leaderboardEnabled || profile.scanId !== scan.id) {
      continue;
    }

    const summary = await getPublicScoreSummary(scan.id);
    if (!summary) continue;
    entries.push({ summary, profile });
  }

  return entries
    .sort((a, b) => b.summary.percentage - a.summary.percentage || b.summary.completedAt - a.summary.completedAt)
    .slice(0, limit)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

export async function getCertifiedSummary(domain: string) {
  const normalizedDomain = domain.toLowerCase();
  const profile = await getProfileByDomain(normalizedDomain);

  if (!profile || !profile.enabled || !profile.verified) {
    return null;
  }

  const summary = await getPublicScoreSummary(profile.scanId);
  if (!summary) {
    return null;
  }

  const db = getDatabase();
  const scan = await db.getScan(profile.scanId);

  if (!scan || scan.status !== 'complete' || !scan.scoreResult) {
    return null;
  }

  return {
    profile,
    summary,
    scoreResult: scan.scoreResult,
    url: scan.url,
  };
}

