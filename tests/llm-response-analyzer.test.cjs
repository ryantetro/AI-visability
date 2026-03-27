require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeResponsesWithLLM } = require('../src/lib/ai-mentions/llm-response-analyzer.ts');

function makePrompt(id = 'prompt-1', text = 'What are the best AI visibility tools?') {
  return {
    id,
    text,
    category: 'comparison',
    industry: 'Technology',
    brand: 'Example Co',
  };
}

function makeBusinessProfile() {
  return {
    brand: 'Example Co',
    domain: 'example.com',
    industry: 'Technology',
    location: 'Denver, CO',
    vertical: 'saas',
    businessType: 'software_platform',
    siteModel: 'software_platform',
    categoryPhrases: ['AI visibility platform'],
    productCategories: ['AI visibility platform'],
    serviceSignals: ['AI visibility audits'],
    geoSignals: ['Denver, CO'],
    similarityKeywords: ['example', 'visibility'],
    scanCompetitorSeeds: ['Competitor One'],
  };
}

function makeResponse(overrides = {}) {
  return {
    engine: 'chatgpt',
    prompt: makePrompt(),
    text: 'Example Co is one of the best AI visibility platforms for growing teams.',
    testedAt: Date.now(),
    citations: ['https://example.com'],
    ...overrides,
  };
}

test('analyzeResponsesWithLLM maps valid LLM payloads into enriched mention results', async () => {
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              mentioned: true,
              mentionType: 'direct',
              position: 2,
              positionContext: 'listed_ranking',
              sentiment: 'positive',
              sentimentStrength: 9,
              sentimentReasoning: 'Strong recommendation language is used.',
              keyQuote: 'Example Co is one of the best AI visibility platforms for growing teams.',
              descriptionAccuracy: 'accurate',
              competitors: [{ name: 'Competitor One', position: 1 }],
              citationFound: true,
            }),
          },
        }],
      }),
    });

    const [result] = await analyzeResponsesWithLLM(
      [makeResponse()],
      { brand: 'Example Co', domain: 'example.com', businessProfile: makeBusinessProfile() },
      { timeoutMs: 1000, totalBudgetMs: 5000 }
    );

    assert.equal(result.analysisSource, 'llm');
    assert.equal(result.mentionType, 'direct');
    assert.equal(result.position, 2);
    assert.equal(result.sentimentLabel, 'positive');
    assert.equal(result.sentimentStrength, 9);
    assert.equal(result.competitorsWithPositions[0].name, 'Competitor One');
    assert.equal(result.citationPresent, true);
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('analyzeResponsesWithLLM falls back to heuristic analysis on invalid JSON', async () => {
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{invalid json',
          },
        }],
      }),
    });

    const [result] = await analyzeResponsesWithLLM(
      [makeResponse()],
      { brand: 'Example Co', domain: 'example.com', businessProfile: makeBusinessProfile() },
      { timeoutMs: 1000, totalBudgetMs: 5000 }
    );

    assert.equal(result.analysisSource, 'heuristic');
    assert.equal(result.mentionType, 'direct');
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('analyzeResponsesWithLLM recovers when the model wraps valid JSON in fences or trailing prose', async () => {
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `\`\`\`json
{
  "mentioned": true,
  "mentionType": "direct",
  "position": 1,
  "positionContext": "listed_ranking",
  "sentiment": "positive",
  "sentimentStrength": 8,
  "sentimentReasoning": "The answer ranks the brand highly.",
  "keyQuote": "Example Co is the top choice.",
  "descriptionAccuracy": "accurate",
  "competitors": [{"name": "Competitor One", "position": 2}],
  "citationFound": true,
}
\`\`\`
Additional note that should be ignored.`,
          },
        }],
      }),
    });

    const [result] = await analyzeResponsesWithLLM(
      [makeResponse()],
      { brand: 'Example Co', domain: 'example.com', businessProfile: makeBusinessProfile() },
      { timeoutMs: 1000, totalBudgetMs: 5000 }
    );

    assert.equal(result.analysisSource, 'llm');
    assert.equal(result.position, 1);
    assert.equal(result.competitorsWithPositions[0].name, 'Competitor One');
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('analyzeResponsesWithLLM falls back to heuristic analysis on timeout', async () => {
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    global.fetch = async (_url, init) => new Promise((_, reject) => {
      const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (init?.signal?.aborted) return onAbort();
      init?.signal?.addEventListener('abort', onAbort);
    });

    const [result] = await analyzeResponsesWithLLM(
      [makeResponse()],
      { brand: 'Example Co', domain: 'example.com', businessProfile: makeBusinessProfile() },
      { timeoutMs: 50, totalBudgetMs: 500 }
    );

    assert.equal(result.analysisSource, 'heuristic');
    assert.equal(result.mentioned, true);
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('analyzeResponsesWithLLM disables remaining LLM batches after repeated retryable failures', async () => {
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;
  let fetchCalls = 0;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    global.fetch = async (_url, init) => new Promise((_, reject) => {
      fetchCalls += 1;
      const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (init?.signal?.aborted) return onAbort();
      init?.signal?.addEventListener('abort', onAbort);
    });

    const results = await analyzeResponsesWithLLM(
      [
        makeResponse({ prompt: makePrompt('prompt-1') }),
        makeResponse({ prompt: makePrompt('prompt-2') }),
        makeResponse({ prompt: makePrompt('prompt-3') }),
      ],
      { brand: 'Example Co', domain: 'example.com', businessProfile: makeBusinessProfile() },
      { batchSize: 1, timeoutMs: 50, totalBudgetMs: 500 }
    );

    assert.equal(results.length, 3);
    assert.equal(fetchCalls, 2);
    assert.ok(results.every((result) => result.analysisSource === 'heuristic'));
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('analyzeResponsesWithLLM stops starting new LLM requests when the total budget is exhausted', async () => {
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;
  let fetchCalls = 0;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    global.fetch = async (_url, init) => new Promise((resolve, reject) => {
      fetchCalls += 1;
      const timer = setTimeout(() => {
        resolve({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  mentioned: true,
                  mentionType: 'direct',
                  position: 1,
                  positionContext: 'listed_ranking',
                  sentiment: 'positive',
                  sentimentStrength: 8,
                  sentimentReasoning: 'The answer ranks the brand first.',
                  keyQuote: 'Example Co is the top option.',
                  descriptionAccuracy: 'accurate',
                  competitors: [],
                  citationFound: true,
                }),
              },
            }],
          }),
        });
      }, 40);

      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };

      if (init?.signal?.aborted) return onAbort();
      init?.signal?.addEventListener('abort', onAbort, { once: true });
    });

    const results = await analyzeResponsesWithLLM(
      [
        makeResponse({ prompt: makePrompt('prompt-1') }),
        makeResponse({ prompt: makePrompt('prompt-2') }),
        makeResponse({ prompt: makePrompt('prompt-3') }),
      ],
      { brand: 'Example Co', domain: 'example.com', businessProfile: makeBusinessProfile() },
      { batchSize: 1, timeoutMs: 100, totalBudgetMs: 320 }
    );

    assert.equal(results[0].analysisSource, 'llm');
    assert.ok(results.slice(1).every((result) => result.analysisSource === 'heuristic'));
    assert.equal(fetchCalls, 2);
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});
