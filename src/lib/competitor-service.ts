import { getSupabaseClient } from '@/lib/supabase';
import type { UserCompetitor } from '@/types/competitors';

function rowToCompetitor(row: Record<string, unknown>): UserCompetitor {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    domain: row.domain as string,
    competitorUrl: row.competitor_url as string,
    competitorDomain: row.competitor_domain as string,
    scanId: (row.scan_id as string) ?? null,
    status: row.status as UserCompetitor['status'],
    addedAt: row.added_at as string,
    lastScannedAt: (row.last_scanned_at as string) ?? null,
  };
}

export async function addCompetitor(
  userId: string,
  domain: string,
  competitorUrl: string,
  competitorDomain: string
): Promise<UserCompetitor> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_competitors')
    .insert({
      user_id: userId,
      domain,
      competitor_url: competitorUrl,
      competitor_domain: competitorDomain,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This competitor is already being tracked.');
    }
    throw new Error(`Failed to add competitor: ${error.message}`);
  }

  return rowToCompetitor(data as Record<string, unknown>);
}

export async function listCompetitors(userId: string, domain: string): Promise<UserCompetitor[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_competitors')
    .select('*')
    .eq('user_id', userId)
    .eq('domain', domain)
    .order('added_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to list competitors: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => rowToCompetitor(row));
}

export async function getCompetitor(id: string, userId: string): Promise<UserCompetitor | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_competitors')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return rowToCompetitor(data as Record<string, unknown>);
}

export async function updateCompetitorScan(
  id: string,
  scanId: string,
  status: UserCompetitor['status']
): Promise<void> {
  const supabase = getSupabaseClient();

  const updates: Record<string, unknown> = { scan_id: scanId, status };
  if (status === 'complete') {
    updates.last_scanned_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('user_competitors')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update competitor scan: ${error.message}`);
  }
}

export async function deleteCompetitor(id: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_competitors')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete competitor: ${error.message}`);
  }
}

export async function countCompetitors(userId: string, domain: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('user_competitors')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('domain', domain);

  if (error) {
    throw new Error(`Failed to count competitors: ${error.message}`);
  }

  return count ?? 0;
}
