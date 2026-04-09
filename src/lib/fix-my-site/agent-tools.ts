/**
 * Custom MCP tools for the Fix My Site agent.
 *
 * Run in-process via createSdkMcpServer() so the agent can update
 * order progress, save generated files, and complete the order.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod/v4';
import {
  updateOrderProgress,
  saveGeneratedFile,
  completeOrder as dbCompleteOrder,
  VALID_FILES_REQUESTED,
} from '@/lib/fix-my-site';

/* ── update_order_progress tool ─────────────────────────────────── */

export function createUpdateOrderProgressTool(orderId: string) {
  return tool(
    'update_order_progress',
    'Update the order progress shown to the user. Call this at each major phase: inspecting site, analyzing gaps, generating files, writing guide.',
    {
      step: z.number().min(1).max(6).describe(
        'Current step (1=inspect site, 2=analyze gaps, 3=generate AI readiness files, 4=generate structured data files, 5=self-review, 6=write guide)',
      ),
      progress: z.number().min(0).max(100).describe('Overall progress percentage (0-100)'),
      currentTask: z.string().describe('Human-readable description of what you are doing right now'),
    },
    async (args) => {
      await updateOrderProgress(orderId, {
        step: args.step,
        totalSteps: 6,
        progress: args.progress,
        currentTask: args.currentTask,
      });

      return {
        content: [{ type: 'text' as const, text: `Progress updated: step ${args.step}/6, ${args.progress}% — ${args.currentTask}` }],
      };
    },
  );
}

/* ── save_generated_file tool ───────────────────────────────────── */

export function createSaveGeneratedFileTool(orderId: string, filesRequested: string[]) {
  const validSet = new Set(filesRequested);

  return tool(
    'save_generated_file',
    'Save a generated file to the order. Call this once per file type after generating each file. The fileType must be one of the files requested in the order.',
    {
      fileType: z.string().describe(`File type key: ${VALID_FILES_REQUESTED.join(', ')}`),
      filename: z.string().describe('The filename for download (e.g., "robots.txt", "organization-schema.json")'),
      content: z.string().describe('The complete file content'),
      description: z.string().describe('One-line description of what this file does'),
    },
    async (args) => {
      if (!validSet.has(args.fileType)) {
        return {
          content: [{ type: 'text' as const, text: `Error: "${args.fileType}" was not requested. Valid types: ${filesRequested.join(', ')}` }],
        };
      }

      await saveGeneratedFile(orderId, args.fileType, {
        filename: args.filename,
        content: args.content,
        description: args.description,
      });

      return {
        content: [{ type: 'text' as const, text: `File saved: ${args.filename} (${args.content.length} chars)` }],
      };
    },
  );
}

/* ── complete_order tool ────────────────────────────────────────── */

export function createCompleteOrderTool(orderId: string) {
  return tool(
    'complete_order',
    'Mark the order as delivered and save the implementation guide. Call this ONCE after all files have been saved and the guide is written. This is the final step.',
    {
      guideMarkdown: z.string().describe('Complete implementation guide in markdown format'),
    },
    async (args) => {
      await dbCompleteOrder(orderId, args.guideMarkdown);

      return {
        content: [{ type: 'text' as const, text: `Order completed and marked as delivered. Guide: ${args.guideMarkdown.length} chars.` }],
      };
    },
  );
}
