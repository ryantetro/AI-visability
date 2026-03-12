import { zipSync, strToU8 } from 'fflate';
import { GeneratedFiles } from '@/types/generated-files';
import { getDomain } from '@/lib/url-utils';

export function createGeneratedFilesArchive(generatedFiles: GeneratedFiles): Uint8Array {
  const archiveEntries = Object.fromEntries(
    generatedFiles.files.map((file) => [file.filename, strToU8(file.content)])
  );

  return zipSync(archiveEntries, { level: 6 });
}

export function createArchiveFilename(url: string): string {
  const domain = getDomain(url).replace(/[^a-z0-9.-]+/gi, '-').replace(/-+/g, '-');
  return `aiso-files-${domain || 'site'}.zip`;
}
