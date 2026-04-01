import { getSupabaseClient } from '@/lib/supabase';
import { getPromptContext, parseCitationEntries } from '@/lib/optimize/shared';
import type { AIEngine } from '@/types/ai-mentions';
import type {
  SourceCategory,
  SourceDomainSummary,
  SourceEcosystemAnalysis,
  SourceGap,
} from '@/lib/optimize/types';

const SOURCE_CATEGORY_MAP: Record<string, Extract<SourceCategory, 'review_platform' | 'community' | 'directory'>> = {
  'g2.com': 'review_platform',
  'capterra.com': 'review_platform',
  'trustradius.com': 'review_platform',
  'trustpilot.com': 'review_platform',
  'reddit.com': 'community',
  'quora.com': 'community',
  'linkedin.com': 'community',
  'youtube.com': 'community',
  'crunchbase.com': 'directory',
  'producthunt.com': 'directory',
};

type SourceAccumulator = {
  citations: number;
  prompts: Set<string>;
  engines: Set<AIEngine>;
  brandPresence: boolean;
  ownSite: boolean;
  competitor: boolean;
};

function emptyCounts(): Record<SourceCategory, number> {
  return {
    own_site: 0,
    competitor: 0,
    review_platform: 0,
    community: 0,
    directory: 0,
    publisher: 0,
    other: 0,
  };
}

function matchesKnownDomain(domain: string, known: string) {
  return domain === known || domain.endsWith(`.${known}`);
}

function resolveSourceCategory(
  domain: string,
  citationCount: number,
  flags: { ownSite: boolean; competitor: boolean },
): SourceCategory {
  if (flags.ownSite) return 'own_site';
  if (flags.competitor) return 'competitor';

  for (const [knownDomain, category] of Object.entries(SOURCE_CATEGORY_MAP)) {
    if (matchesKnownDomain(domain, knownDomain)) {
      return category;
    }
  }

  return citationCount >= 3 ? 'publisher' : 'other';
}

function recommendationForGap(domain: string, category: Exclude<SourceCategory, 'own_site' | 'competitor'>) {
  switch (category) {
    case 'review_platform':
      return `Claim or strengthen your presence on ${domain}, then add reviews and profile detail that AI engines can cite.`;
    case 'community':
      return `Show up on ${domain} with direct answers, examples, and links back to your best proof assets.`;
    case 'directory':
      return `Create or update your listing on ${domain} so your brand data stays complete and citation-friendly.`;
    case 'publisher':
      return `Pitch contributed expertise or data to ${domain} so your brand appears in the same editorial ecosystem as competitors.`;
    default:
      return `Investigate how competitors are earning visibility on ${domain} and build a credible footprint there.`;
  }
}

function toActionTitle(domain: string, category: Exclude<SourceCategory, 'own_site' | 'competitor'>): string {
  switch (category) {
    case 'review_platform':
      return `Strengthen your profile on ${domain}`;
    case 'community':
      return `Build community visibility on ${domain}`;
    case 'directory':
      return `Update your listing on ${domain}`;
    case 'publisher':
      return `Earn editorial mentions on ${domain}`;
    default:
      return `Create a presence on ${domain}`;
  }
}

async function getPromptFingerprint(userId: string, domain: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: prompts } = await supabase
    .from('monitored_prompts')
    .select('id')
    .eq('user_id', userId)
    .eq('domain', domain)
    .eq('active', true);

  const promptIds = (prompts ?? []).map((row) => String(row.id));
  if (promptIds.length === 0) return 'none';

  const { data } = await supabase
    .from('prompt_results')
    .select('tested_at')
    .in('prompt_id', promptIds)
    .order('tested_at', { ascending: false })
    .limit(1);

  return data?.[0]?.tested_at ? String(data[0].tested_at) : 'none';
}

async function computeSourceAnalysis(userId: string, domain: string): Promise<SourceEcosystemAnalysis> {
  const supabase = getSupabaseClient();
  const { latestResults } = await getPromptContext(userId, domain);

  const sourceMap = new Map<string, SourceAccumulator>();
  const perEngineMaps = new Map<AIEngine, Map<string, SourceAccumulator>>();

  for (const result of latestResults) {
    const citations = parseCitationEntries(result.citationUrls);

    for (const citation of citations) {
      const existing = sourceMap.get(citation.domain) ?? {
        citations: 0,
        prompts: new Set<string>(),
        engines: new Set<AIEngine>(),
        brandPresence: false,
        ownSite: false,
        competitor: false,
      };
      existing.citations += 1;
      existing.prompts.add(result.promptId);
      existing.engines.add(result.engine);
      existing.brandPresence ||= result.mentioned || citation.isOwnDomain;
      existing.ownSite ||= citation.isOwnDomain;
      existing.competitor ||= citation.isCompetitor;
      sourceMap.set(citation.domain, existing);

      const engineMap = perEngineMaps.get(result.engine) ?? new Map<string, SourceAccumulator>();
      const engineExisting = engineMap.get(citation.domain) ?? {
        citations: 0,
        prompts: new Set<string>(),
        engines: new Set<AIEngine>(),
        brandPresence: false,
        ownSite: false,
        competitor: false,
      };
      engineExisting.citations += 1;
      engineExisting.prompts.add(result.promptId);
      engineExisting.engines.add(result.engine);
      engineExisting.brandPresence ||= result.mentioned || citation.isOwnDomain;
      engineExisting.ownSite ||= citation.isOwnDomain;
      engineExisting.competitor ||= citation.isCompetitor;
      engineMap.set(citation.domain, engineExisting);
      perEngineMaps.set(result.engine, engineMap);
    }
  }

  const counts = emptyCounts();
  let totalCitations = 0;
  let ownCitations = 0;
  let competitorCitationCount = 0;

  const topSources = [...sourceMap.entries()]
    .map(([sourceDomain, entry]) => {
      const category = resolveSourceCategory(sourceDomain, entry.citations, entry);
      counts[category] += entry.citations;
      totalCitations += entry.citations;
      if (category === 'own_site') ownCitations += entry.citations;
      if (category === 'competitor') competitorCitationCount += entry.citations;

      return {
        domain: sourceDomain,
        category,
        citations: entry.citations,
        prompts: entry.prompts.size,
        sharePct: 0,
        engines: [...entry.engines].sort(),
        brandPresence: entry.brandPresence,
      } satisfies SourceDomainSummary;
    })
    .sort((left, right) => right.citations - left.citations || left.domain.localeCompare(right.domain))
    .map((entry) => ({
      ...entry,
      sharePct: totalCitations > 0 ? Math.round((entry.citations / totalCitations) * 1000) / 10 : 0,
    }));

  const { data: competitorRows } = await supabase
    .from('user_competitors')
    .select('scan_id, competitor_domain')
    .eq('user_id', userId)
    .eq('domain', domain)
    .not('scan_id', 'is', null);

  const scanIds = (competitorRows ?? [])
    .map((row) => row.scan_id)
    .filter((scanId): scanId is string => typeof scanId === 'string' && scanId.length > 0);

  const competitorScanMap = new Map<string, unknown>();
  if (scanIds.length > 0) {
    const { data: scanRows } = await supabase
      .from('scans')
      .select('id, mention_summary')
      .in('id', scanIds);

    for (const scan of scanRows ?? []) {
      competitorScanMap.set(String(scan.id), scan.mention_summary ?? null);
    }
  }

  const competitorCitationMap = new Map<string, { count: number; competitors: Set<string> }>();
  for (const competitor of competitorRows ?? []) {
    const summary = competitor.scan_id ? competitorScanMap.get(String(competitor.scan_id)) : null;
    if (!summary || typeof summary !== 'object') continue;

    const results = Array.isArray((summary as { results?: unknown[] }).results)
      ? (summary as { results: Array<{ citationUrls?: unknown }> }).results
      : [];

    for (const result of results) {
      for (const citation of parseCitationEntries(result.citationUrls)) {
        const existing = competitorCitationMap.get(citation.domain) ?? {
          count: 0,
          competitors: new Set<string>(),
        };
        existing.count += 1;
        if (typeof competitor.competitor_domain === 'string' && competitor.competitor_domain.trim()) {
          existing.competitors.add(competitor.competitor_domain);
        }
        competitorCitationMap.set(citation.domain, existing);
      }
    }
  }

  const ownedSourceDomains = new Set(topSources.map((source) => source.domain));
  const gaps = [...competitorCitationMap.entries()]
    .map(([sourceDomain, value]) => {
      if (ownedSourceDomains.has(sourceDomain)) return null;

      const category = resolveSourceCategory(sourceDomain, value.count, { ownSite: false, competitor: false });
      if (category === 'own_site' || category === 'competitor') return null;

      return {
        domain: sourceDomain,
        category,
        competitorCitations: value.count,
        competitors: [...value.competitors].sort(),
        recommendation: recommendationForGap(sourceDomain, category),
        actionTitle: toActionTitle(sourceDomain, category),
      } satisfies SourceGap;
    })
    .filter((gap): gap is SourceGap => Boolean(gap))
    .sort((left, right) => right.competitorCitations - left.competitorCitations || left.domain.localeCompare(right.domain));

  const thirdPartyCitations = Math.max(0, totalCitations - ownCitations - competitorCitationCount);
  const perEngine = Object.fromEntries(
    [...perEngineMaps.entries()].map(([engine, engineSources]) => {
      const items = [...engineSources.entries()]
        .map(([sourceDomain, entry]) => ({
          domain: sourceDomain,
          category: resolveSourceCategory(sourceDomain, entry.citations, entry),
          citations: entry.citations,
          prompts: entry.prompts.size,
          sharePct: 0,
          engines: [...entry.engines].sort(),
          brandPresence: entry.brandPresence,
        }))
        .sort((left, right) => right.citations - left.citations || left.domain.localeCompare(right.domain))
        .slice(0, 6)
        .map((entry) => ({
          ...entry,
          sharePct: totalCitations > 0 ? Math.round((entry.citations / totalCitations) * 1000) / 10 : 0,
        }));

      return [engine, items];
    }),
  ) as Partial<Record<AIEngine, SourceDomainSummary[]>>;

  return {
    computedAt: new Date().toISOString(),
    sourcesCount: topSources.length,
    breakdown: {
      ownSitePct: totalCitations > 0 ? Math.round((ownCitations / totalCitations) * 1000) / 10 : 0,
      competitorPct: totalCitations > 0 ? Math.round((competitorCitationCount / totalCitations) * 1000) / 10 : 0,
      thirdPartyPct: totalCitations > 0 ? Math.round((thirdPartyCitations / totalCitations) * 1000) / 10 : 0,
      counts,
    },
    topSources,
    gaps,
    perEngine,
  };
}

export async function getSourceEcosystemAnalysis(userId: string, domain: string): Promise<SourceEcosystemAnalysis> {
  const supabase = getSupabaseClient();
  const fingerprint = await getPromptFingerprint(userId, domain);

  try {
    const { data: cached } = await supabase
      .from('source_ecosystem_cache')
      .select('analysis_json, computed_at, prompt_results_hash')
      .eq('user_id', userId)
      .eq('domain', domain)
      .maybeSingle();

    if (cached?.analysis_json && cached.computed_at) {
      const cacheAgeMs = Date.now() - Date.parse(String(cached.computed_at));
      if (cacheAgeMs < 60 * 60 * 1000 || cached.prompt_results_hash === fingerprint) {
        return cached.analysis_json as SourceEcosystemAnalysis;
      }
    }
  } catch {
    // Cache table may not exist yet; fall through to live computation.
  }

  const analysis = await computeSourceAnalysis(userId, domain);

  try {
    await supabase
      .from('source_ecosystem_cache')
      .upsert({
        user_id: userId,
        domain,
        analysis_json: analysis,
        sources_count: analysis.sourcesCount,
        own_site_pct: analysis.breakdown.ownSitePct,
        competitor_pct: analysis.breakdown.competitorPct,
        third_party_pct: analysis.breakdown.thirdPartyPct,
        top_gaps_json: analysis.gaps,
        computed_at: analysis.computedAt,
        prompt_results_hash: fingerprint,
      }, { onConflict: 'user_id,domain' });
  } catch {
    // Non-blocking cache write.
  }

  return analysis;
}
