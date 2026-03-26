import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { validatePlatformSelection, getSelectedPlatforms, saveSelectedPlatforms } from '@/lib/platform-gating';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  const selected = await getSelectedPlatforms(user.id, domain.trim().toLowerCase());

  return NextResponse.json({
    selectedPlatforms: selected,
    maxPlatforms: access.maxPlatforms,
    tier: access.tier,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { domain?: string; platforms?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { domain, platforms } = body;
  if (!domain || !Array.isArray(platforms)) {
    return NextResponse.json({ error: 'domain and platforms are required' }, { status: 400 });
  }

  const normalizedDomain = domain.trim().toLowerCase();
  if (normalizedDomain.length > 253) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  const validated = validatePlatformSelection(platforms, access.tier);

  if (validated.length === 0) {
    return NextResponse.json({ error: 'At least one valid platform must be selected' }, { status: 400 });
  }

  await saveSelectedPlatforms(user.id, normalizedDomain, validated);

  return NextResponse.json({
    selectedPlatforms: validated,
    maxPlatforms: access.maxPlatforms,
  });
}
