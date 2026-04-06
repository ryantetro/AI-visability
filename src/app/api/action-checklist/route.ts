import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import {
  syncChecklist,
  toggleChecklistItem,
} from '@/lib/services/supabase-action-checklist';
import type { ManualStatus, SyncItemPayload } from '@/types/action-checklist';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { action, domain } = body as { action?: string; domain?: string };

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required.' }, { status: 400 });
  }

  if (action === 'sync') {
    const { items } = body as { items?: SyncItemPayload[] };
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items array is required for sync.' }, { status: 400 });
    }
    try {
      const result = await syncChecklist(user.id, domain, items);
      return NextResponse.json(result);
    } catch (err) {
      console.error('action-checklist sync error:', err);
      return NextResponse.json({ error: 'Failed to sync checklist.' }, { status: 500 });
    }
  }

  if (action === 'toggle') {
    const { checkId, manualStatus } = body as { checkId?: string; manualStatus?: ManualStatus };
    if (!checkId || !manualStatus) {
      return NextResponse.json({ error: 'checkId and manualStatus are required for toggle.' }, { status: 400 });
    }
    try {
      const result = await toggleChecklistItem(user.id, domain, checkId, manualStatus);
      return NextResponse.json(result);
    } catch (err) {
      console.error('action-checklist toggle error:', err);
      return NextResponse.json({ error: 'Failed to toggle item.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action. Use "sync" or "toggle".' }, { status: 400 });
}
