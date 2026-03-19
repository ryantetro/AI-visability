import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getCompetitor, deleteCompetitor } from '@/lib/competitor-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const competitor = await getCompetitor(id);

  if (!competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  if (competitor.userId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    await deleteCompetitor(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete competitor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
