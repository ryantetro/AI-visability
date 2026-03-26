import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { generateContentPage } from '@/lib/content-generator';
import { getSupabaseClient } from '@/lib/supabase';
import { PLANS } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('content_generation')) {
    return NextResponse.json(
      { error: 'Content generation requires the Pro plan or above.' },
      { status: 403 }
    );
  }

  let body: {
    topic?: string;
    domain?: string;
    brand?: string;
    industry?: string;
    keywords?: string[];
    tone?: 'professional' | 'conversational' | 'technical';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { topic, domain, brand, industry, keywords, tone } = body;

  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    return NextResponse.json({ error: 'Topic must be at least 3 characters' }, { status: 400 });
  }
  if (topic.length > 200) {
    return NextResponse.json({ error: 'Topic must be under 200 characters' }, { status: 400 });
  }
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  // Check monthly usage limit
  const maxPages = PLANS[access.tier].contentPages;
  if (maxPages > 0) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    try {
      const supabase = getSupabaseClient();
      const { count } = await supabase
        .from('generated_content_pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString());

      if (count !== null && count >= maxPages) {
        return NextResponse.json(
          {
            error: `Monthly content page limit reached (${maxPages}). Upgrade for more pages.`,
            used: count,
            limit: maxPages,
          },
          { status: 403 }
        );
      }
    } catch {
      // If table doesn't exist yet, allow through
    }
  }

  try {
    const page = await generateContentPage({
      topic: topic.trim(),
      domain: domain.trim().toLowerCase(),
      brand: brand?.trim() || domain.trim().toLowerCase(),
      industry: industry?.trim(),
      keywords: keywords?.filter((k) => typeof k === 'string' && k.trim()),
      tone,
    });

    // Save to DB for tracking
    try {
      const supabase = getSupabaseClient();
      await supabase.from('generated_content_pages').insert({
        user_id: user.id,
        domain: domain.trim().toLowerCase(),
        topic: topic.trim(),
        title: page.title,
        slug: page.slug,
        word_count: page.wordCount,
        content_markdown: page.markdown,
        faq_schema: page.faqSchema,
        html_head: page.htmlHead,
      });
    } catch {
      // Non-critical: page was generated, just tracking failed
    }

    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Content generation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('generated_content_pages')
      .select('id, domain, topic, title, slug, word_count, created_at')
      .eq('user_id', user.id)
      .eq('domain', domain.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(20);

    // Monthly usage
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('generated_content_pages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString());

    const access = await getUserAccess(user.id, user.email);

    return NextResponse.json({
      pages: data ?? [],
      usage: {
        used: count ?? 0,
        limit: PLANS[access.tier].contentPages,
      },
    });
  } catch {
    return NextResponse.json({ pages: [], usage: { used: 0, limit: 0 } });
  }
}
