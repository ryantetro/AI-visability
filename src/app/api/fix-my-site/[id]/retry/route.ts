import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getOrderById } from '@/lib/fix-my-site';
import { triggerFixMySiteAgent } from '@/lib/fix-my-site/pipeline';

const STALE_MINUTES = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'delivered') {
    return NextResponse.json({ error: 'Order already delivered' }, { status: 409 });
  }

  // Allow retry if status is 'ordered' (failed) or stalled 'in_progress'
  if (order.status === 'in_progress') {
    const updatedAt = order.updated_at ? new Date(order.updated_at).getTime() : 0;
    const minutesSinceUpdate = (Date.now() - updatedAt) / (1000 * 60);
    if (minutesSinceUpdate < STALE_MINUTES) {
      return NextResponse.json({ error: 'Order is still generating' }, { status: 409 });
    }
  }

  after(() => triggerFixMySiteAgent(id));

  return NextResponse.json({ ok: true, status: 'in_progress' });
}
