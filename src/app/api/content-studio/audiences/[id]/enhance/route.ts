import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getSupabaseClient } from '@/lib/supabase';
import { enhanceAudienceProfile } from '@/lib/content-studio/audience-enhance';

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

  // Fetch the audience
  const { data: audience, error: fetchError } = await supabase
    .from('content_studio_audiences')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !audience) {
    return NextResponse.json({ error: 'Audience not found.' }, { status: 404 });
  }

  try {
    const enhanced = await enhanceAudienceProfile(
      audience.name,
      audience.description,
    );

    // Update the audience with the enhanced description
    const { data, error: updateError } = await supabase
      .from('content_studio_audiences')
      .update({
        description: enhanced,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[content-studio] Audience enhancement failed:', error);
    return NextResponse.json(
      { error: 'Failed to enhance audience profile.' },
      { status: 500 },
    );
  }
}
