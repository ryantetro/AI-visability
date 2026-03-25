import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPromptMonitoring } from '@/lib/services/registry';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid prompt id.' }, { status: 400 });
  }

  const body = await request.json();
  const { active, promptText, category } = body ?? {};

  if (promptText !== undefined && String(promptText).length > 500) {
    return NextResponse.json({ error: 'promptText must be 500 characters or fewer.' }, { status: 400 });
  }
  if (category !== undefined && String(category).length > 50) {
    return NextResponse.json({ error: 'category must be 50 characters or fewer.' }, { status: 400 });
  }

  const updates: { active?: boolean; promptText?: string; category?: string } = {};
  if (active !== undefined) updates.active = Boolean(active);
  if (promptText !== undefined) updates.promptText = String(promptText).trim();
  if (category !== undefined) updates.category = String(category);

  const pm = getPromptMonitoring();

  try {
    await pm.updatePrompt(id, updates, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid prompt id.' }, { status: 400 });
  }

  const pm = getPromptMonitoring();

  try {
    await pm.deletePrompt(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed.' },
      { status: 400 }
    );
  }
}
