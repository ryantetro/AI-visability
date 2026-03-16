import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPromptMonitoring } from '@/lib/services/registry';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { active, promptText, category } = body ?? {};

  const updates: { active?: boolean; promptText?: string; category?: string } = {};
  if (active !== undefined) updates.active = Boolean(active);
  if (promptText !== undefined) updates.promptText = String(promptText).trim();
  if (category !== undefined) updates.category = String(category);

  const pm = getPromptMonitoring();

  try {
    await pm.updatePrompt(id, updates);
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
  const pm = getPromptMonitoring();

  try {
    await pm.deletePrompt(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed.' },
      { status: 400 }
    );
  }
}
