/**
 * Fix My Site Agent Pipeline
 *
 * Uses the Claude Agent SDK to run an autonomous agent that inspects
 * a site, generates AI visibility files, and delivers them to the user.
 */

import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { getDatabase } from '@/lib/services/registry';
import type { ScoreResult } from '@/types/score';
import {
  getOrderById,
  updateOrderProgress,
  updateOrderStatus,
  setScanId,
} from '@/lib/fix-my-site';
import type { AgentProgress } from '@/lib/fix-my-site';
import {
  createUpdateOrderProgressTool,
  createSaveGeneratedFileTool,
  createCompleteOrderTool,
} from './agent-tools';
import { buildFixMySiteAgentPrompt } from './agent-prompts';

const STALE_SCAN_DAYS = 30;

export async function triggerFixMySiteAgent(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) {
    console.error(`[fix-my-site] Order ${orderId} not found`);
    return;
  }

  // Find the latest scan for this domain
  const db = getDatabase();
  const scan = await db.findLatestScanByDomain(order.domain);

  if (!scan?.crawlData || !scan.scoreResult) {
    // No scan data — mark as needing scan
    await updateOrderProgress(orderId, {
      step: 0,
      totalSteps: 6,
      progress: 0,
      currentTask: 'Waiting for scan data',
      filesCompleted: [],
      error: 'no_scan',
      startedAt: new Date().toISOString(),
    });
    return;
  }

  // Link scan to order
  await setScanId(orderId, scan.id);

  // Use the stored score result (already scored during the scan)
  const scoreResult = scan.scoreResult as ScoreResult;
  const fixes = scoreResult.fixes;

  // Check scan staleness
  const scanAge = Date.now() - (scan.completedAt ?? scan.createdAt);
  const isStaleScan = scanAge > STALE_SCAN_DAYS * 24 * 60 * 60 * 1000;

  // Initialize progress
  await updateOrderProgress(orderId, {
    step: 0,
    totalSteps: 6,
    progress: 0,
    currentTask: 'Starting agent...',
    filesCompleted: [],
    error: null,
    startedAt: new Date().toISOString(),
  });

  // Create in-process MCP server with custom tools
  const mcpServer = createSdkMcpServer({
    name: 'fix-my-site',
    tools: [
      createUpdateOrderProgressTool(orderId),
      createSaveGeneratedFileTool(orderId, order.files_requested),
      createCompleteOrderTool(orderId),
    ],
  });

  try {
    const systemPrompt = buildFixMySiteAgentPrompt({
      domain: order.domain,
      filesRequested: order.files_requested,
      notes: order.notes,
      scoreResult,
      fixes,
      isStaleScan,
      alreadyCompleted: ((order.agent_progress as AgentProgress | null)?.filesCompleted) ?? [],
    });

    let result: SDKResultMessage | null = null;

    for await (const message of query({
      prompt: `Generate production-ready AI visibility files for ${order.domain}. Inspect the live site, then generate and save each requested file.`,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-6',
        tools: ['WebSearch', 'WebFetch', 'Read'],
        allowedTools: [
          'WebSearch', 'WebFetch', 'Read',
          'mcp__fix-my-site__update_order_progress',
          'mcp__fix-my-site__save_generated_file',
          'mcp__fix-my-site__complete_order',
        ],
        mcpServers: { 'fix-my-site': mcpServer },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 30,
        maxBudgetUsd: 1.50,
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
      console.log(`[fix-my-site] Agent complete for order ${orderId}. Cost: $${cost.toFixed(3)}, error: ${isError}`);

      if (isError) {
        const errors = 'errors' in result ? (result as unknown as { errors?: string[] }).errors : [];
        throw new Error(`Agent ended with error: ${errors?.join('; ') || 'unknown'}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[fix-my-site] Agent failed for order ${orderId}:`, message);

    // Revert status so user can retry
    await updateOrderProgress(orderId, { error: message });
    await updateOrderStatus(orderId, 'ordered');
  }
}
