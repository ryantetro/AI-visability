import type {
  ActionChecklistItem,
  ActionChecklistSummary,
  SyncItemPayload,
  ManualStatus,
  ScanStatus,
} from '@/types/action-checklist';

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

interface ChecklistRow {
  id: string;
  user_id: string;
  domain: string;
  check_id: string;
  action_type: string;
  manual_status: string;
  scan_status: string;
  last_scan_id: string | null;
  created_at: string;
  updated_at: string;
}

function deriveCompletion(manualStatus: string, scanStatus: string) {
  const isRegression = manualStatus === 'done' && scanStatus === 'fail';
  const isComplete =
    scanStatus === 'pass' ||
    (manualStatus === 'done' && scanStatus !== 'fail');
  return { isComplete, isRegression };
}

export async function syncChecklist(
  userId: string,
  domain: string,
  items: SyncItemPayload[],
): Promise<{ items: ActionChecklistItem[]; summary: ActionChecklistSummary }> {
  const upsertRows = items.map((item) => ({
    user_id: userId,
    domain,
    check_id: item.checkId,
    action_type: item.actionType,
    scan_status: item.scanStatus,
    updated_at: new Date().toISOString(),
  }));

  if (upsertRows.length > 0) {
    await fetch(
      supabaseUrl('action_checklist?on_conflict=user_id,domain,check_id'),
      {
        method: 'POST',
        headers: supabaseHeaders({
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(upsertRows),
      },
    );
  }

  const qs = new URLSearchParams({
    user_id: `eq.${userId}`,
    domain: `eq.${domain}`,
    order: 'created_at.asc',
  });
  const res = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'GET',
    headers: supabaseHeaders(),
  });
  const rows: ChecklistRow[] = await res.json();

  const payloadMap = new Map(items.map((i) => [i.checkId, i]));

  const merged: ActionChecklistItem[] = rows
    .map((row) => {
      const payload = payloadMap.get(row.check_id);
      if (!payload) return null;
      const { isComplete, isRegression } = deriveCompletion(row.manual_status, row.scan_status);
      return {
        checkId: row.check_id,
        actionType: row.action_type as ActionChecklistItem['actionType'],
        manualStatus: row.manual_status as ActionChecklistItem['manualStatus'],
        scanStatus: row.scan_status as ActionChecklistItem['scanStatus'],
        label: payload.label,
        detail: payload.detail,
        dimension: payload.dimension,
        category: payload.category,
        estimatedLift: payload.estimatedLift,
        effortBand: payload.effortBand,
        copyPrompt: payload.copyPrompt,
        isComplete,
        isRegression,
      };
    })
    .filter((x): x is ActionChecklistItem => x !== null);

  const complete = merged.filter((i) => i.isComplete).length;
  const remaining = merged.length - complete;
  const potentialLift = merged
    .filter((i) => !i.isComplete)
    .reduce((sum, i) => sum + i.estimatedLift, 0);

  return {
    items: merged,
    summary: { total: merged.length, complete, remaining, potentialLift },
  };
}

export async function toggleChecklistItem(
  userId: string,
  domain: string,
  checkId: string,
  manualStatus: ManualStatus,
): Promise<{
  checkId: string;
  manualStatus: ManualStatus;
  scanStatus: ScanStatus;
  isComplete: boolean;
  isRegression: boolean;
  updatedAt: string;
}> {
  const now = new Date().toISOString();
  const qs = new URLSearchParams({
    user_id: `eq.${userId}`,
    domain: `eq.${domain}`,
    check_id: `eq.${checkId}`,
  });

  const res = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'PATCH',
    headers: supabaseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({ manual_status: manualStatus, updated_at: now }),
  });

  const rows: ChecklistRow[] = await res.json();
  if (!rows.length) throw new Error('Item not found');

  const row = rows[0];
  const { isComplete, isRegression } = deriveCompletion(row.manual_status, row.scan_status);

  return {
    checkId: row.check_id,
    manualStatus: row.manual_status as ManualStatus,
    scanStatus: row.scan_status as ScanStatus,
    isComplete,
    isRegression,
    updatedAt: row.updated_at,
  };
}

export async function getChecklistCount(
  userId: string,
  domain: string,
): Promise<{ remaining: number }> {
  const qs = new URLSearchParams({
    user_id: `eq.${userId}`,
    domain: `eq.${domain}`,
    scan_status: 'neq.pass',
    or: '(manual_status.neq.done,scan_status.eq.fail)',
    select: 'id',
  });

  const countRes = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'HEAD',
    headers: supabaseHeaders({ Prefer: 'count=exact' }),
  });

  const contentRange = countRes.headers.get('content-range');
  const countedRemaining = contentRange ? Number.parseInt(contentRange.split('/').pop() ?? '', 10) : Number.NaN;

  if (countRes.ok && Number.isFinite(countedRemaining)) {
    return { remaining: countedRemaining };
  }

  const res = await fetch(supabaseUrl(`action_checklist?${qs}`), {
    method: 'GET',
    headers: supabaseHeaders(),
  });
  const rows: Array<Pick<ChecklistRow, 'id'>> = await res.json();

  return { remaining: rows.length };
}
