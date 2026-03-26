/**
 * Data export utilities for CSV and JSON generation.
 */

/** Escape a CSV field value (wrap in quotes if needed) */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert an array of objects to a CSV string */
export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: string; label: string }[]
): string {
  if (data.length === 0) return '';

  const cols = columns ?? Object.keys(data[0]).map((key) => ({ key, label: key }));
  const header = cols.map((c) => escapeCSV(c.label)).join(',');
  const rows = data.map((row) =>
    cols.map((c) => escapeCSV(row[c.key])).join(',')
  );

  return [header, ...rows].join('\n');
}

/** Convert data to a pretty-printed JSON string */
export function generateJSON<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}

/** Create a NextResponse with file download headers */
export function createDownloadResponse(
  content: string,
  filename: string,
  contentType: string
): Response {
  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

/** Build a CSV download response */
export function csvResponse(content: string, filename: string): Response {
  return createDownloadResponse(content, filename, 'text/csv; charset=utf-8');
}

/** Build a JSON download response */
export function jsonResponse(content: string, filename: string): Response {
  return createDownloadResponse(content, filename, 'application/json; charset=utf-8');
}
