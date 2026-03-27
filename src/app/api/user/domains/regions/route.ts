import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { PLANS } from '@/lib/pricing';
import {
  getDefaultRegions,
  getSelectedRegions,
  saveSelectedRegions,
  validateRegionSelection,
} from '@/lib/region-gating';

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
  const selected = await getSelectedRegions(user.id, domain.trim().toLowerCase());

  return NextResponse.json({
    selectedRegions: selected,
    maxRegions: access.maxRegions,
    tier: access.tier,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { domain?: string; regions?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { domain, regions } = body;
  if (!domain || !Array.isArray(regions)) {
    return NextResponse.json({ error: 'domain and regions are required' }, { status: 400 });
  }

  const normalizedDomain = domain.trim().toLowerCase();
  if (normalizedDomain.length > 253) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  const currentSelection = await getSelectedRegions(user.id, normalizedDomain)
    ?? getDefaultRegions(access.tier);
  const requestedValidCount = [...new Set(regions.filter((region) => typeof region === 'string'))].length;
  const validated = validateRegionSelection(regions, access.tier);

  if (validated.length === 0) {
    return NextResponse.json({ error: 'At least one valid region must be selected' }, { status: 400 });
  }

  if (requestedValidCount > access.maxRegions && currentSelection.length <= access.maxRegions) {
    return NextResponse.json(
      { error: `Your ${PLANS[access.tier].name} plan allows up to ${access.maxRegions} region${access.maxRegions === 1 ? '' : 's'}. Upgrade for more.` },
      { status: 403 },
    );
  }

  await saveSelectedRegions(user.id, normalizedDomain, validated);

  return NextResponse.json({
    selectedRegions: validated,
    maxRegions: access.maxRegions,
  });
}
