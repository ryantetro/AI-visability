#!/usr/bin/env node
require('./register-ts.cjs');

const { AI_ENGINES, getAIEngineMeta, getAIEngineModel, getConfiguredAIEngines } = require('../src/lib/ai-engines.ts');

const configured = new Set(getConfiguredAIEngines());

console.log('AI engine status');
console.log('================');

for (const engine of AI_ENGINES) {
  const meta = getAIEngineMeta(engine);
  const enabled = configured.has(engine);
  console.log(
    [
      `${meta.label} (${meta.provider})`,
      `configured=${enabled ? 'yes' : 'no'}`,
      `env=${meta.envKey}`,
      `model=${enabled ? getAIEngineModel(engine) : meta.defaultModel}`,
      `scanTesting=${enabled ? 'eligible' : 'disabled'}`,
      `promptMonitoring=${enabled ? 'eligible' : 'disabled'}`,
    ].join(' | ')
  );
}
