import { LlmsTxtData, LlmsTxtSection, LlmsTxtLink } from '@/types/crawler';

export async function fetchLlmsTxt(baseUrl: string): Promise<LlmsTxtData> {
  const url = new URL('/llms.txt', baseUrl).href;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok || !res.headers.get('content-type')?.includes('text')) {
      return emptyLlmsTxt();
    }
    const raw = await res.text();
    // Basic heuristic: llms.txt should have markdown-like content
    if (raw.length < 10 || raw.includes('<!DOCTYPE') || raw.includes('<html')) {
      return emptyLlmsTxt();
    }
    return parseLlmsTxt(raw);
  } catch {
    return emptyLlmsTxt();
  }
}

function emptyLlmsTxt(): LlmsTxtData {
  return { exists: false, raw: '', sections: [], links: [] };
}

function parseLlmsTxt(raw: string): LlmsTxtData {
  const lines = raw.split('\n');
  let title: string | undefined;
  let description: string | undefined;
  const sections: LlmsTxtSection[] = [];
  const links: LlmsTxtLink[] = [];
  let currentSection: LlmsTxtSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Title (first h1)
    const h1Match = trimmed.match(/^#\s+(.+)/);
    if (h1Match && !title) {
      title = h1Match[1];
      continue;
    }

    // Blockquote description
    const bqMatch = trimmed.match(/^>\s*(.+)/);
    if (bqMatch && !description) {
      description = bqMatch[1];
      continue;
    }

    // Section heading
    const h2Match = trimmed.match(/^##\s+(.+)/);
    if (h2Match) {
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: h2Match[1], content: '' };
      continue;
    }

    // Links
    const linkMatch = trimmed.match(/^-\s*\[(.+?)\]\((.+?)\)(?::\s*(.+))?/);
    if (linkMatch) {
      links.push({
        title: linkMatch[1],
        url: linkMatch[2],
        description: linkMatch[3],
      });
    }

    // Accumulate content in current section
    if (currentSection && trimmed) {
      currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
    }
  }
  if (currentSection) sections.push(currentSection);

  return { exists: true, raw, title, description, sections, links };
}
