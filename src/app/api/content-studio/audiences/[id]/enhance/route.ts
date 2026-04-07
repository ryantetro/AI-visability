import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getSupabaseClient } from '@/lib/supabase';

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

  // In production, this would call an AI service to enhance the description.
  // For now, generate an enhanced placeholder based on the audience name.
  const enhanced = `## ${audience.name}\n\n**Demographics:** Decision-makers and professionals in target industries, typically aged 25-55, with moderate to high digital literacy.\n\n**Pain Points:**\n- Difficulty finding reliable solutions in a crowded market\n- Need for streamlined workflows and efficiency gains\n- Budget constraints balanced with quality expectations\n\n**Goals:**\n- Improve operational efficiency and ROI\n- Stay ahead of industry trends and competitors\n- Build sustainable, scalable processes\n\n**Preferred Channels:** LinkedIn, industry publications, webinars, email newsletters\n\n**Content Preferences:** Data-driven insights, actionable guides, case studies with measurable results`;

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
}
