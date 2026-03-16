import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';

export function runStructuredDataChecks(data: CrawlData): CheckResult[] {
  const allSchemas = data.pages.flatMap((p) => p.schemaObjects);
  const schemaTypes = allSchemas.flatMap((schema) => getSchemaTypes(schema.type));
  const totalParseErrors = data.pages.reduce((sum, page) => sum + page.schemaParseErrors, 0);
  const hasAnySchemaMarkup = allSchemas.length > 0 || totalParseErrors > 0;

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

  const allValid =
    allSchemas.length > 0 &&
    totalParseErrors === 0 &&
    allSchemas.every((schema) => getSchemaTypes(schema.type).length > 0);

  return [
    {
      id: 'sd-org-schema',
      dimension: 'structured-data',
      category: 'ai',
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
      category: 'ai',
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
      category: 'ai',
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
      category: 'ai',
      label: 'Schema validity',
      verdict: !hasAnySchemaMarkup ? 'unknown' : allValid ? 'pass' : 'fail',
      points: allValid && allSchemas.length > 0 ? 3 : 0,
      maxPoints: 3,
      detail: !hasAnySchemaMarkup
        ? 'No schema markup to validate.'
        : allValid
        ? 'Schema markup is valid JSON-LD.'
        : totalParseErrors > 0
        ? `Detected ${totalParseErrors} malformed JSON-LD block(s).`
        : 'Schema markup is missing @type values or could not be classified.',
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

function getSchemaTypes(type: string): string[] {
  return String(type || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value) => value !== 'unknown');
}
