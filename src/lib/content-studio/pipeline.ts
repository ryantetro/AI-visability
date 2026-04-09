/**
 * Content Studio Pipeline Orchestrator — Agent SDK Edition
 *
 * Uses the Claude Agent SDK to run an autonomous agent that researches,
 * outlines, and writes content briefs/articles. The agent has access to
 * WebSearch, WebFetch, and custom MCP tools for progress updates and
 * saving content to the database.
 */

import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { PipelineContext, WorkflowProgress } from './types';
import { createInitialWorkflowProgress } from './types';
import { createContentPersistChain, setPhaseStatus } from './db';
import { createUpdateProgressTool, createSaveContentTool } from './agent-tools';
import { buildBriefAgentPrompt, buildArticleAgentPrompt } from './agent-prompts';

/**
 * Run the brief pipeline using an autonomous Claude agent.
 *
 * The agent uses WebSearch/WebFetch for real research and calls custom
 * MCP tools to update progress and save the final brief.
 */
export async function runBriefPipeline(ctx: PipelineContext): Promise<void> {
  const { updateItem } = createContentPersistChain(ctx.item.id);

  // Initialize workflow progress
  await updateItem((item) => {
    item.status = 'brief_generating';
    item.workflow_progress = createInitialWorkflowProgress();
  });

  // Create in-process MCP server with custom tools
  const mcpServer = createSdkMcpServer({
    name: 'content-studio',
    tools: [
      createUpdateProgressTool(ctx.item.id),
      createSaveContentTool(ctx.item.id),
    ],
  });

  try {
    const systemPrompt = buildBriefAgentPrompt(ctx);

    let result: SDKResultMessage | null = null;

    for await (const message of query({
      prompt: `Research and create a comprehensive content brief for: "${ctx.item.topic || ctx.item.title}"`,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-6',
        tools: ['WebSearch', 'WebFetch', 'Read'],
        allowedTools: ['WebSearch', 'WebFetch', 'Read', 'mcp__content-studio__update_progress', 'mcp__content-studio__save_content'],
        mcpServers: { 'content-studio': mcpServer },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 50,
        maxBudgetUsd: 1.00,
        persistSession: false,
        settingSources: [],
      },
    })) {
      if (message.type === 'result') {
        result = message as SDKResultMessage;
      }
    }

    if (result) {
      const cost = 'total_cost_usd' in result ? (result as unknown as { total_cost_usd: number }).total_cost_usd : 0;
      const isError = result.is_error;
      console.log(`[content-studio] Brief agent complete. Cost: $${cost.toFixed(3)}, error: ${isError}`);

      if (isError) {
        const errors = 'errors' in result ? (result as unknown as { errors?: string[] }).errors : [];
        throw new Error(`Agent ended with error: ${errors?.join('; ') || 'unknown'}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[content-studio] Brief agent failed for item ${ctx.item.id}:`, message);

    await updateItem((item) => {
      // Mark the currently-running phase as errored
      const wp = item.workflow_progress as WorkflowProgress | null;
      if (wp?.phases) {
        for (const key of Object.keys(wp.phases) as Array<keyof typeof wp.phases>) {
          if (wp.phases[key].status === 'running') {
            setPhaseStatus(item, key, 'error', message);
            break;
          }
        }
      }
      // Reset status so user can retry
      item.status = 'draft';
    });
  }
}

/**
 * Run article generation using an autonomous Claude agent.
 *
 * The agent takes the completed brief and writes a full publication-ready
 * article, calling save_content when done.
 */
export async function runArticlePipeline(ctx: PipelineContext): Promise<void> {
  const { updateItem } = createContentPersistChain(ctx.item.id);

  await updateItem((item) => {
    item.status = 'article_generating';
    // Reset progress so the frontend doesn't show stale 100% from the brief phase
    const wp = item.workflow_progress as Record<string, unknown> | null;
    if (wp) {
      wp.step = 5;
      wp.progress = 0;
      wp.currentTask = 'Starting article generation...';
    }
    setPhaseStatus(item, 'article', 'running');
  });

  // Create in-process MCP server with custom tools
  const mcpServer = createSdkMcpServer({
    name: 'content-studio',
    tools: [
      createUpdateProgressTool(ctx.item.id),
      createSaveContentTool(ctx.item.id),
    ],
  });

  try {
    const briefMarkdown = ctx.item.brief_markdown;
    if (!briefMarkdown) {
      throw new Error('No brief available — generate a brief first');
    }

    const systemPrompt = buildArticleAgentPrompt(ctx, briefMarkdown);

    let result: SDKResultMessage | null = null;

    for await (const message of query({
      prompt: `Write a complete ${ctx.item.content_type.replace(/_/g, ' ')} article based on the brief provided in your instructions.`,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-6',
        tools: ['WebSearch', 'WebFetch', 'Read'],
        allowedTools: ['WebSearch', 'WebFetch', 'Read', 'mcp__content-studio__update_progress', 'mcp__content-studio__save_content'],
        mcpServers: { 'content-studio': mcpServer },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 30,
        maxBudgetUsd: 1.00,
        persistSession: false,
        settingSources: [],
      },
    })) {
      if (message.type === 'result') {
        result = message as SDKResultMessage;
      }
    }

    if (result) {
      const cost = 'total_cost_usd' in result ? result.total_cost_usd : 0;
      const isError = result.is_error;
      console.log(`[content-studio] Article agent complete. Cost: $${cost.toFixed(3)}, error: ${isError}`);

      if (isError) {
        const errors = 'errors' in result ? (result as { errors?: string[] }).errors : [];
        throw new Error(`Agent ended with error: ${errors?.join('; ') || 'unknown'}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[content-studio] Article agent failed for item ${ctx.item.id}:`, message);

    await updateItem((item) => {
      setPhaseStatus(item, 'article', 'error', message);
      // Revert to brief_ready so user can retry
      item.status = 'brief_ready';
    });
  }
}
