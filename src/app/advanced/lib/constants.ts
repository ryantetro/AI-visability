import {
  Bot,
  FileCode2,
  FileJson2,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import type { FileMeta, PromptCategory, WorkstreamMeta } from './types';
import { BOT_TO_PROVIDER } from '@/lib/ai-crawlers';
import { AI_ENGINE_META } from '@/lib/ai-engines';

export const FILE_META: Record<string, FileMeta> = {
  'llms.txt': {
    subtitle: 'AI Guidance Layer',
    purpose: 'Supplies context for LLM agents about your organization and priority pages.',
    installTarget: 'Serve as /llms.txt from your public site root.',
    verify: 'Open /llms.txt in a private browser window and confirm content loads publicly.',
    icon: Bot,
  },
  'robots.txt': {
    subtitle: 'Crawler Access Policy',
    purpose: 'Declares crawl permissions so AI and search bots can read your important URLs.',
    installTarget: 'Publish as /robots.txt and preserve any existing required directives.',
    verify: 'Open /robots.txt and verify bot allow rules plus sitemap directives are present.',
    icon: ShieldCheck,
  },
  'organization-schema.json': {
    subtitle: 'Entity Definition',
    purpose: 'Strengthens machine understanding of your business with Organization JSON-LD.',
    installTarget: 'Embed as one JSON-LD script block in your homepage <head>.',
    verify: 'Inspect source and confirm one valid schema script block is rendered.',
    icon: FileJson2,
  },
  'sitemap.xml': {
    subtitle: 'Discovery Map',
    purpose: 'Provides canonical URL inventory for discovery and refresh in crawler pipelines.',
    installTarget: 'Serve as /sitemap.xml and reference it from robots.txt.',
    verify: 'Open /sitemap.xml and check that URLs are live and canonical.',
    icon: Globe2,
  },
};

export const DEFAULT_META: FileMeta = {
  subtitle: 'Generated Asset',
  purpose: 'Supports AI visibility signal quality and crawl discoverability.',
  installTarget: 'Deploy this file as part of your web configuration.',
  verify: 'Publish and re-run scan to validate impact.',
  icon: FileCode2,
};

export const WORKSTREAMS: WorkstreamMeta[] = [
  {
    key: 'ai-visibility',
    title: 'AI visibility',
    description: 'Clarify what your site is about and what AI systems should understand first.',
    icon: Bot,
  },
  {
    key: 'crawl-discovery',
    title: 'Crawl & discovery',
    description: 'Make important pages easier for crawlers and indexers to find and trust.',
    icon: Waypoints,
  },
  {
    key: 'structured-data',
    title: 'Structured data',
    description: 'Improve entity clarity with schema and machine-readable identity signals.',
    icon: FileJson2,
  },
  {
    key: 'performance',
    title: 'Performance & web health',
    description: 'Improve speed, quality, and technical reliability.',
    icon: RefreshCw,
  },
  {
    key: 'trust',
    title: 'Trust & quality',
    description: 'Reduce credibility gaps and strengthen quality/security signals.',
    icon: ShieldCheck,
  },
];

export const UPGRADE_FEATURES = [
  'Unlimited website analyses',
  'High authority do-follow backlink',
  'Website score badge',
  'Daily automated monitoring (up to 10 domains)',
  'Critical change alerts',
  'History tracking',
  'Certified report page',
  'Copy to LLM',
];

export const MAX_DOMAINS = 10;
export const MONITORED_DOMAINS_KEY = 'aiso_monitored_domains';
export const HIDDEN_DOMAINS_KEY = 'aiso_hidden_monitored_domains';
export const ADVANCED_PAID_PREVIEW_KEY = 'aiso_advanced_paid_unlocked';

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'brand', label: 'Brand' },
  { id: 'competitor', label: 'Competitor' },
  { id: 'industry', label: 'Industry' },
  { id: 'custom', label: 'Custom' },
];

export const ENGINE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(AI_ENGINE_META).map(([engine, meta]) => [engine, meta.color])
);

export const BOT_COLORS: Record<string, string> = {
  GPTBot: '#10b981',
  'ChatGPT-User': '#34d399',
  PerplexityBot: '#3b82f6',
  ClaudeBot: '#a855f7',
  'Claude-Web': '#c084fc',
  'anthropic-ai': '#d8b4fe',
  CCBot: '#f59e0b',
  'cohere-ai': '#fb923c',
  GoogleOther: '#ef4444',
  'Google-CloudVertexBot': '#f87171',
  'Google-Extended': '#ef4444',
};

export const BOT_CATEGORY_LABEL: Record<string, string> = {
  indexing: 'AI Indexing',
  citation: 'AI Citations',
  training: 'AI Training',
  unknown: 'Unknown',
};

export { BOT_TO_PROVIDER };

export const PROVIDER_DISPLAY_ORDER = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;

export const PROVIDER_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  other: 'Other',
};

export const REFERRER_ENGINE_ORDER = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;

export const REFERRER_ENGINE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
};

export const CHART_COLORS = { pass: '#25c972', fail: '#ff5252', unknown: '#ff8a1e' } as const;

export const SENTIMENT_COLORS = { positive: '#25c972', neutral: '#ffbb00', negative: '#ff5252' } as const;
