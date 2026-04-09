/* ── Content Studio Pipeline Types ─────────────────────────────────── */

export type PhaseKey = 'web_research' | 'quote_extraction' | 'outline' | 'brief' | 'article';

export type PhaseStatus = 'pending' | 'running' | 'complete' | 'error';

export interface PhaseState {
  status: PhaseStatus;
  error?: string;
}

/**
 * WorkflowProgress stored in `content_studio_items.workflow_progress` (JSONB).
 *
 * Top-level `step`, `progress`, and `currentTask` are read by the existing
 * frontend polling — keep them in sync.  The `phases` map and intermediate
 * data (`research`, `quotes`, `outline`) are new nested fields that the
 * pipeline uses internally and that the frontend can optionally display.
 */
export interface WorkflowProgress {
  /** 1-based step index matching WORKFLOW_STEPS in brief-viewer */
  step: number;
  /** 0-100 overall progress */
  progress: number;
  /** Human-readable label the frontend shows next to the spinner */
  currentTask: string;
  /** Per-phase status map */
  phases?: Record<PhaseKey, PhaseState>;
  /** Intermediate results persisted between phases */
  research?: ResearchResult;
  quotes?: ExtractedQuote[];
  outline?: OutlineResult;
}

/* ── Phase Result Types ──────────────────────────────────────────────── */

export interface ResearchSource {
  url: string;
  title: string;
}

export interface ResearchResult {
  summary: string;
  topicAnalysis: string;
  keyFindings: string[];
  sources: ResearchSource[];
}

export interface ExtractedQuote {
  text: string;
  attribution: string;
  source: string;
  type: 'quote' | 'statistic' | 'fact' | 'definition';
}

export interface OutlineSection {
  heading: string;
  keyPoints: string[];
}

export interface OutlineResult {
  title: string;
  sections: OutlineSection[];
  estimatedWordCount: number;
  suggestedKeywords: string[];
}

/* ── Pipeline Context ────────────────────────────────────────────────── */

export interface ContentItem {
  id: string;
  user_id: string;
  domain: string;
  title: string;
  content_type: string;
  status: string;
  topic: string | null;
  selected_prompts: string[] | null;
  audience_id: string | null;
  tone: string;
  length: string;
  perspective: string;
  sections: { id: string; enabled: boolean }[] | null;
  cta_text: string | null;
  additional_instructions: string[] | null;
  brief_markdown: string | null;
  article_markdown: string | null;
  workflow_progress: WorkflowProgress | null;
}

export interface AudienceData {
  id: string;
  name: string;
  description: string | null;
}

export interface PipelineContext {
  item: ContentItem;
  audience: AudienceData | null;
}

/* ── Helper to build initial workflow progress ───────────────────────── */

export function createInitialWorkflowProgress(): WorkflowProgress {
  return {
    step: 1,
    progress: 0,
    currentTask: 'Researching your topic',
    phases: {
      web_research: { status: 'pending' },
      quote_extraction: { status: 'pending' },
      outline: { status: 'pending' },
      brief: { status: 'pending' },
      article: { status: 'pending' },
    },
  };
}
