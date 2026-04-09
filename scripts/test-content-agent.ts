/**
 * Test script: Content Studio Agent SDK pipeline
 *
 * Runs the brief agent for a "marine products" blog post topic
 * and streams the output to the console. Uses mock DB operations
 * so no Supabase connection is required.
 *
 * Usage: npx tsx scripts/test-content-agent.ts
 */

import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod/v4';
import { buildBriefAgentPrompt } from '../src/lib/content-studio/agent-prompts';
import type { PipelineContext } from '../src/lib/content-studio/types';

/* ── Mock context: marine products blog post ─────────────────────── */

const mockContext: PipelineContext = {
  item: {
    id: 'test-00000000-0000-0000-0000-000000000001',
    user_id: 'test-user',
    domain: 'marineproducts.com',
    title: 'Best Marine Products for Coastal Living',
    content_type: 'blog_post',
    status: 'brief_generating',
    topic: 'Essential marine products for boat maintenance, coastal home protection, and water sports in 2025',
    selected_prompts: [
      'What are the top-rated marine products for boat owners?',
      'How do marine coatings protect against saltwater corrosion?',
      'What new marine technology products are trending in 2025?',
    ],
    audience_id: null,
    tone: 'informative',
    length: 'medium',
    perspective: 'second',
    sections: [
      { id: 'key_takeaways', enabled: true },
      { id: 'faq', enabled: true },
      { id: 'cta', enabled: true },
    ],
    cta_text: 'Browse our curated marine products collection',
    additional_instructions: [
      'Focus on products available in 2025',
      'Include price ranges where possible',
      'Mention eco-friendly and sustainable options',
    ],
    brief_markdown: null,
    article_markdown: null,
    workflow_progress: null,
  },
  audience: {
    id: 'test-audience-1',
    name: 'Coastal Homeowners & Boat Enthusiasts',
    description: 'Adults 30-65 who own boats or live in coastal areas. They care about product quality, durability against saltwater, and value for money. Active on boating forums and YouTube channels.',
  },
};

/* ── Mock MCP tools (print to console instead of DB) ─────────────── */

const mockUpdateProgress = tool(
  'update_progress',
  'Update the workflow progress shown to the user.',
  {
    step: z.number().min(1).max(5),
    progress: z.number().min(0).max(100),
    currentTask: z.string(),
  },
  async (args) => {
    const bar = '█'.repeat(Math.floor(args.progress / 5)) + '░'.repeat(20 - Math.floor(args.progress / 5));
    console.log(`\n  ⟩ PROGRESS [${bar}] ${args.progress}% — Step ${args.step}: ${args.currentTask}\n`);
    return {
      content: [{ type: 'text' as const, text: `Progress updated: step ${args.step}, ${args.progress}%` }],
    };
  },
);

let savedBrief = '';

const mockSaveContent = tool(
  'save_content',
  'Save the final generated content to the database.',
  {
    type: z.enum(['brief', 'article']),
    markdown: z.string(),
  },
  async (args) => {
    savedBrief = args.markdown;
    console.log(`\n  ⟩ SAVE: ${args.type} saved (${args.markdown.length} chars)\n`);
    return {
      content: [{ type: 'text' as const, text: `${args.type} saved (${args.markdown.length} chars)` }],
    };
  },
);

/* ── Run the agent ───────────────────────────────────────────────── */

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Content Studio Agent Test — Marine Products Blog Post      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('  Topic:', mockContext.item.topic);
  console.log('  Type:', mockContext.item.content_type);
  console.log('  Tone:', mockContext.item.tone);
  console.log('  Length:', mockContext.item.length);
  console.log('  Audience:', mockContext.audience?.name);
  console.log();
  console.log('Starting agent...\n');

  const mcpServer = createSdkMcpServer({
    name: 'content-studio',
    tools: [mockUpdateProgress, mockSaveContent],
  });

  const systemPrompt = buildBriefAgentPrompt(mockContext);
  const startTime = Date.now();

  try {
    for await (const message of query({
      prompt: `Research and create a comprehensive content brief for: "${mockContext.item.topic}"`,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-6',
        tools: ['WebSearch', 'WebFetch'],
        allowedTools: [
          'WebSearch',
          'WebFetch',
          'mcp__content-studio__update_progress',
          'mcp__content-studio__save_content',
        ],
        mcpServers: { 'content-studio': mcpServer },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 25,
        maxBudgetUsd: 0.75,
        persistSession: false,
        settingSources: [],
      },
    })) {
      if (message.type === 'result') {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n' + '═'.repeat(64));
        console.log('  AGENT RESULT');
        console.log('═'.repeat(64));
        console.log(`  Status: ${message.subtype}`);
        console.log(`  Turns: ${message.num_turns}`);
        console.log(`  Cost: $${message.total_cost_usd.toFixed(4)}`);
        console.log(`  Time: ${elapsed}s`);
        if (message.is_error && 'errors' in message) {
          console.log(`  Errors: ${(message as { errors: string[] }).errors.join('; ')}`);
        }
        console.log('═'.repeat(64));
      }
    }
  } catch (error) {
    console.error('\nAgent error:', error instanceof Error ? error.message : error);
  }

  // Always print the saved brief (even if budget was exceeded after saving)
  if (savedBrief) {
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  GENERATED BRIEF                                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log();
    console.log(savedBrief);
    console.log('\n' + '═'.repeat(64));
    console.log(`  Brief length: ${savedBrief.length} characters`);
    console.log('═'.repeat(64));
  } else {
    console.log('\n⚠ No brief was saved — the agent may not have called save_content.');
  }
}

main();
