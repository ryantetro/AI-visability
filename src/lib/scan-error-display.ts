/**
 * Sanitize a raw scan-failure message for display in the UI.
 *
 * Failed scans persist whatever error string the workflow caught into
 * `scan.progress.error`. That string can be a raw infrastructure error
 * — e.g. `Supabase request failed (500): {"code":"57014",...}` from a
 * statement timeout — which leaks implementation details and offers the
 * user no actionable guidance.
 *
 * This helper maps known infrastructure-error shapes to user-friendly
 * messages. Anything that doesn't match a known pattern is returned
 * as-is so application-level error messages (e.g. "Site unreachable
 * (DNS lookup failed)") continue to surface verbatim.
 */
export function formatScanFailureMessage(rawError?: string | null): string {
  const fallback = 'Scan failed';
  if (!rawError) return fallback;

  const trimmed = rawError.trim();
  if (!trimmed) return fallback;

  // Postgres statement_timeout / Supabase 500s — surface as a retryable
  // database hiccup rather than a code: 57014 JSON blob.
  if (/statement timeout|57014|Supabase request failed/i.test(trimmed)) {
    return 'The scan failed due to a temporary database issue. Please retry.';
  }

  // Other PostgREST / Supabase HTTP wrappers we generate from supabase-db.ts.
  if (/Supabase (save|request) failed/i.test(trimmed)) {
    return 'The scan failed due to a temporary database issue. Please retry.';
  }

  return trimmed;
}
