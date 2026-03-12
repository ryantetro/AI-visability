import { SitePlatform } from './crawler';

export interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
  installInstructions: string;
}

export interface GeneratedFiles {
  files: GeneratedFile[];
  generatedAt: number;
  scanId: string;
  detectedPlatform: SitePlatform;
}
