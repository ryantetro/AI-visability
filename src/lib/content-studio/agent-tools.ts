/**
 * Custom MCP tools for the Content Studio agent.
 *
 * These tools are run in-process via `createSdkMcpServer()` so the agent
 * can update workflow progress and save content to the database.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod/v4';
import { createContentPersistChain, setPhaseStatus } from './db';
import type { WorkflowProgress, PhaseKey } from './types';

/* ── Step → phase mapping (matches PHASE_META in db.ts) ──────────── */

const STEP_TO_PHASE: Record<number, PhaseKey> = {
  1: 'web_research',
  2: 'quote_extraction',
  3: 'outline',
  4: 'brief',
  5: 'article',
};

/* ── update_progress tool ────────────────────────────────────────── */

export function createUpdateProgressTool(itemId: string) {
  return tool(
    'update_progress',
    'Update the workflow progress shown to the user. Call this at each major phase transition (research, extraction, outline, brief/article generation).',
    {
      step: z.number().min(1).max(5).describe('Current step number (1=research, 2=extraction, 3=outline, 4=brief, 5=article)'),
      progress: z.number().min(0).max(100).describe('Overall progress percentage (0-100)'),
      currentTask: z.string().describe('Human-readable description of what you are doing right now'),
    },
    async (args) => {
      const { updateItem } = createContentPersistChain(itemId);
      const phase = STEP_TO_PHASE[args.step];

      await updateItem((item) => {
        if (phase) {
          setPhaseStatus(item, phase, 'running');
        }
        const wp = (item.workflow_progress ?? {}) as WorkflowProgress;
        wp.step = args.step;
        wp.progress = args.progress;
        wp.currentTask = args.currentTask;
        item.workflow_progress = wp;
      });

      return {
        content: [{ type: 'text' as const, text: `Progress updated: step ${args.step}, ${args.progress}% — ${args.currentTask}` }],
      };
    },
  );
}

/* ── save_content tool ───────────────────────────────────────────── */

export function createSaveContentTool(itemId: string) {
  return tool(
    'save_content',
    'Save the final generated content (brief or article) to the database. Call this once when you have finished writing the complete brief or article.',
    {
      type: z.enum(['brief', 'article']).describe('Type of content being saved'),
      markdown: z.string().describe('The complete content in markdown format'),
    },
    async (args) => {
      const { updateItem } = createContentPersistChain(itemId);

      const phaseKey: PhaseKey = args.type === 'brief' ? 'brief' : 'article';
      const statusValue = args.type === 'brief' ? 'brief_ready' : 'article_ready';
      const stepNum = args.type === 'brief' ? 4 : 5;

      await updateItem((item) => {
        setPhaseStatus(item, phaseKey, 'complete');
        if (args.type === 'brief') {
          item.brief_markdown = args.markdown;
        } else {
          item.article_markdown = args.markdown;
        }
        item.status = statusValue;
        const wp = item.workflow_progress as WorkflowProgress;
        wp.step = stepNum;
        wp.progress = 100;
        wp.currentTask = 'Complete';
      });

      return {
        content: [{ type: 'text' as const, text: `${args.type} saved successfully (${args.markdown.length} chars)` }],
      };
    },
  );
}
