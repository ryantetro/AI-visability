import type { DimensionKey, WebHealthPillarKey } from '@/types/score';

/** Build in-app URLs that preserve the active scan (`report` query) like the sidebar. */

export function withReportQuery(path: string, reportId: string | null | undefined): string {
  if (!reportId) return path;
  const [base, existingQuery] = path.split('?');
  const params = new URLSearchParams(existingQuery ?? '');
  params.set('report', reportId);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/** Brand page, Services tab (Fix My Site / AI-optimized articles). */
export function brandServicesHref(reportId: string | null | undefined): string {
  return withReportQuery('/brand?tab=services', reportId);
}

/** Brand page default tab (prompts / presence). */
export function brandHref(reportId: string | null | undefined): string {
  return withReportQuery('/brand', reportId);
}

/** Full report with optional section hash. */
export function reportHref(reportId: string | null | undefined, hash?: string): string {
  const path = withReportQuery('/report', reportId);
  return hash ? `${path}#${hash.replace(/^#/, '')}` : path;
}

/** Dashboard home with hash for AI bot tracking panel. */
export function dashboardTrackingHref(reportId: string | null | undefined): string {
  return `${withReportQuery('/dashboard', reportId)}#tracking`;
}

/** Dashboard with hash for monitoring section. */
export function dashboardMonitoringHref(reportId: string | null | undefined): string {
  return `${withReportQuery('/dashboard', reportId)}#monitoring`;
}

/** Map a fix dimension to its report section anchor ID. Returns null for unknown dimensions. */
const DIMENSION_SECTION_MAP: Record<string, string> = {
  'file-presence': 'section-ai-readiness',
  'structured-data': 'section-ai-readiness',
  'content-signals': 'section-content-authority',
  'topical-authority': 'section-content-authority',
  'entity-clarity': 'section-content-authority',
  'ai-registration': 'section-ai-readiness',
  'performance': 'section-performance-security',
  'quality': 'section-website-quality',
  'security': 'section-performance-security',
};

export function dimensionToSection(dimension: DimensionKey | WebHealthPillarKey): string | null {
  return DIMENSION_SECTION_MAP[dimension] ?? null;
}

/** Build a dashboard URL that deep-links to a specific report section. */
export function dashboardSectionHref(
  reportId: string | null | undefined,
  dimension: DimensionKey | WebHealthPillarKey,
): string | null {
  const section = dimensionToSection(dimension);
  if (!section) return null;
  return reportHref(reportId, section);
}
