require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

test('real mention tester aborts slow OpenAI requests using the configured timeout', async () => {
  const originalTimeout = process.env.AI_ENGINE_TIMEOUT_MS;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;

  process.env.AI_ENGINE_TIMEOUT_MS = '25';
  process.env.OPENAI_API_KEY = 'test-openai-key';

  try {
    const modulePath = require.resolve('../src/lib/services/mention-tester-real.ts');
    delete require.cache[modulePath];
    const { realMentionTester } = require(modulePath);

    global.fetch = (_input, init = {}) => new Promise((_, reject) => {
      const signal = init.signal;
      const abort = () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      };

      if (signal?.aborted) {
        abort();
        return;
      }

      signal?.addEventListener('abort', abort, { once: true });
    });

    const startedAt = Date.now();
    await assert.rejects(
      realMentionTester.query('chatgpt', {
        id: 'prompt-1',
        text: 'What are the best AI visibility tools?',
        category: 'direct',
        industry: 'Technology',
        brand: 'Airadr',
      }),
      /OpenAI API timeout after 25ms/,
    );
    assert.ok(Date.now() - startedAt < 1_000);
  } finally {
    if (originalTimeout === undefined) {
      delete process.env.AI_ENGINE_TIMEOUT_MS;
    } else {
      process.env.AI_ENGINE_TIMEOUT_MS = originalTimeout;
    }

    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }

    global.fetch = originalFetch;
  }
});
