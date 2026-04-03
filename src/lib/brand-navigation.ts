export const BRAND_SECTION_KEYS = [
  'presence',
  'improve',
  'citations',
  'files',
  'traffic',
  'content',
  'services',
] as const;

export type BrandSectionKey = (typeof BRAND_SECTION_KEYS)[number];

export interface BrandSectionMeta {
  key: BrandSectionKey;
  label: string;
  description: string;
}

export const BRAND_SECTIONS: BrandSectionMeta[] = [
  {
    key: 'presence',
    label: 'AI Presence',
    description: 'Track mention rate, share of voice, and how AI engines surface your brand.',
  },
  {
    key: 'improve',
    label: 'Improve',
    description: 'Work through prioritized fixes, prompt recommendations, and content gaps.',
  },
  {
    key: 'citations',
    label: 'Citations',
    description: 'Review which URLs AI engines cite and how often your brand earns those references.',
  },
  {
    key: 'files',
    label: 'Files',
    description: 'Access deployment-ready assets, install prompts, and verification links for your site.',
  },
  {
    key: 'traffic',
    label: 'Traffic',
    description: 'Monitor AI crawler activity and referral traffic tied to your visibility efforts.',
  },
  {
    key: 'content',
    label: 'Content',
    description: 'Generate targeted pages and briefs to expand coverage for valuable prompts.',
  },
  {
    key: 'services',
    label: 'Services',
    description: 'Order expert help when you want the team to implement fixes and content for you.',
  },
];

const BRAND_SECTION_META = new Map<BrandSectionKey, BrandSectionMeta>(
  BRAND_SECTIONS.map((section) => [section.key, section])
);

export function isBrandSectionKey(value: string): value is BrandSectionKey {
  return BRAND_SECTION_KEYS.includes(value as BrandSectionKey);
}

export function resolveBrandSection(section: string | null | undefined): BrandSectionKey {
  return section && isBrandSectionKey(section) ? section : 'presence';
}

export function getBrandSectionMeta(section: string | null | undefined): BrandSectionMeta | null {
  const key = section ? resolveBrandSection(section) : null;
  return key ? BRAND_SECTION_META.get(key) ?? null : null;
}

export function buildBrandPath(section: BrandSectionKey = 'presence') {
  return `/brand/${section}`;
}

export function buildBrandHref(section: string | null | undefined, reportId?: string | null) {
  const path = buildBrandPath(resolveBrandSection(section));
  if (!reportId) return path;
  const params = new URLSearchParams({ report: reportId });
  return `${path}?${params.toString()}`;
}
