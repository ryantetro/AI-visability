import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';

export function runStructuredDataChecks(data: CrawlData): CheckResult[] {
  const allSchemas = data.pages.flatMap((p) => p.schemaObjects);
  const schemaTypes = allSchemas.map((s) => s.type.toLowerCase());

  const hasOrgSchema = schemaTypes.some(
    (t) => t === 'organization' || t === 'localbusiness'
  );

  const orgSchema = allSchemas.find(
    (s) => s.type.toLowerCase() === 'organization' || s.type.toLowerCase() === 'localbusiness'
  );
  const orgComplete = orgSchema
    ? checkOrgCompleteness(orgSchema.raw)
    : false;

  const hasFaq = schemaTypes.some((t) => t === 'faqpage');

  const allValid = allSchemas.length > 0; // simplified validation

  return [
    {
      id: 'sd-org-schema',
      dimension: 'structured-data',
      label: 'Organization schema markup',
      verdict: hasOrgSchema ? 'pass' : 'fail',
      points: hasOrgSchema ? 8 : 0,
      maxPoints: 8,
      detail: hasOrgSchema
        ? 'Organization or LocalBusiness schema found.'
        : 'No Organization schema found. Add JSON-LD markup to help AI understand your business.',
    },
    {
      id: 'sd-completeness',
      dimension: 'structured-data',
      label: 'Schema completeness',
      verdict: !hasOrgSchema ? 'unknown' : orgComplete ? 'pass' : 'fail',
      points: orgComplete ? 5 : 0,
      maxPoints: 5,
      detail: !hasOrgSchema
        ? 'Cannot check — no Organization schema present.'
        : orgComplete
        ? 'Organization schema has all key fields.'
        : 'Organization schema is missing important fields (name, url, description, logo).',
    },
    {
      id: 'sd-faq',
      dimension: 'structured-data',
      label: 'FAQ schema markup',
      verdict: hasFaq ? 'pass' : 'fail',
      points: hasFaq ? 4 : 0,
      maxPoints: 4,
      detail: hasFaq
        ? 'FAQ schema found — great for AI answer generation.'
        : 'No FAQ schema found. FAQ markup helps AI models generate answers about your business.',
    },
    {
      id: 'sd-validation',
      dimension: 'structured-data',
      label: 'Schema validity',
      verdict: allSchemas.length === 0 ? 'unknown' : allValid ? 'pass' : 'fail',
      points: allValid && allSchemas.length > 0 ? 3 : 0,
      maxPoints: 3,
      detail: allSchemas.length === 0
        ? 'No schema markup to validate.'
        : 'Schema markup is valid JSON-LD.',
    },
  ];
}

function checkOrgCompleteness(raw: Record<string, unknown>): boolean {
  const required = ['name', 'url'];
  const optional = ['description', 'logo', 'sameAs', 'contactPoint'];
  const hasRequired = required.every((key) => raw[key]);
  const optionalCount = optional.filter((key) => raw[key]).length;
  return hasRequired && optionalCount >= 2;
}
