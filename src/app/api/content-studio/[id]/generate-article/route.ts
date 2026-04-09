import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getSupabaseClient } from '@/lib/supabase';
import { PLANS } from '@/lib/pricing';
import { runArticlePipeline } from '@/lib/content-studio/pipeline';
import type { PipelineContext, ContentItem, AudienceData } from '@/lib/content-studio/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('content_studio')) {
    return NextResponse.json({ error: 'Content Studio requires a Pro plan or higher.' }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Monthly usage limit — count completed articles this month
  const maxPages = PLANS[access.tier].contentPages;
  if (maxPages > 0) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    try {
      const { count } = await supabase
        .from('content_studio_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('brief_markdown', 'is', null)
        .gte('created_at', monthStart.toISOString());

      if (count !== null && count >= maxPages) {
        return NextResponse.json(
          {
            error: `Monthly content limit reached (${maxPages} items). Upgrade your plan for more.`,
            used: count,
            limit: maxPages,
          },
          { status: 403 },
        );
      }
    } catch {
      // If query fails, allow through
    }
  }

  // Verify item exists, belongs to user, and has a brief
  const { data: item, error: fetchError } = await supabase
    .from('content_studio_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Content item not found.' }, { status: 404 });
  }

  if (item.status !== 'brief_ready') {
    return NextResponse.json(
      { error: 'Brief must be ready before generating an article.' },
      { status: 400 },
    );
  }

  if (!item.brief_markdown) {
    return NextResponse.json(
      { error: 'No brief content found.' },
      { status: 400 },
    );
  }

  // Fetch audience if set
  let audience: AudienceData | null = null;
  if (item.audience_id) {
    const { data: aud } = await supabase
      .from('content_studio_audiences')
      .select('id, name, description')
      .eq('id', item.audience_id)
      .single();
    if (aud) audience = aud as AudienceData;
  }

  const ctx: PipelineContext = {
    item: item as ContentItem,
    audience,
  };

  // Schedule article generation after response
  after(async () => {
    try {
      await runArticlePipeline(ctx);
    } catch (error) {
      console.error('[content-studio] Article pipeline crashed:', error);
      await supabase
        .from('content_studio_items')
        .update({
          status: 'brief_ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  });

  return NextResponse.json({ ok: true, status: 'article_generating' });
}
