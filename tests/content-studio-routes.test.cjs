require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');

const nextServer = require('next/server');
const supabaseModule = require('../src/lib/supabase.ts');
const accessModule = require('../src/lib/access.ts');
const {
  AUTH_COOKIE_NAME,
  _setTestAuth,
  _clearTestAuth,
} = require('../src/lib/auth.ts');

const originalAfter = nextServer.after;
const originalGetSupabaseClient = supabaseModule.getSupabaseClient;
const originalGetUserAccess = accessModule.getUserAccess;
const pipelineModulePath = require.resolve('../src/lib/content-studio/pipeline.ts');
const originalPipelineModule = require.cache[pipelineModulePath];

const tables = {
  content_studio_items: [],
  content_studio_audiences: [],
};

function resetTables() {
  tables.content_studio_items = [];
  tables.content_studio_audiences = [];
}

function matchesFilters(row, filters) {
  return filters.every((filter) => {
    if (filter.type === 'eq') {
      return row[filter.field] === filter.value;
    }
    if (filter.type === 'not-null') {
      return row[filter.field] !== null && row[filter.field] !== undefined;
    }
    if (filter.type === 'gte') {
      return String(row[filter.field] ?? '') >= String(filter.value);
    }
    return true;
  });
}

function makeChain(tableName) {
  const state = {
    filters: [],
    updateData: null,
    singleMode: false,
    countMode: false,
    headMode: false,
  };

  const chain = {
    select(_fields, opts) {
      state.countMode = opts?.count === 'exact';
      state.headMode = !!opts?.head;
      return chain;
    },
    eq(field, value) {
      state.filters.push({ type: 'eq', field, value });
      return chain;
    },
    not(field, operator, value) {
      if (operator === 'is' && value === null) {
        state.filters.push({ type: 'not-null', field });
      }
      return chain;
    },
    gte(field, value) {
      state.filters.push({ type: 'gte', field, value });
      return chain;
    },
    update(data) {
      state.updateData = data;
      return chain;
    },
    single() {
      state.singleMode = true;
      return chain._execute();
    },
    _execute() {
      let rows = [...tables[tableName]].filter((row) => matchesFilters(row, state.filters));

      if (state.updateData) {
        rows.forEach((row) => Object.assign(row, state.updateData));
      }

      if (state.countMode && state.headMode) {
        return { count: rows.length, error: null };
      }

      if (state.singleMode) {
        if (!rows.length) {
          return { data: null, error: { code: 'PGRST116', message: 'not found' } };
        }
        return { data: rows[0], error: null };
      }

      return { data: rows, error: null };
    },
    then(resolve, reject) {
      return Promise.resolve(chain._execute()).then(resolve, reject);
    },
  };

  return chain;
}

function createAuthedJsonRequest(url, method, body, email = 'writer@example.com') {
  const user = { id: `test-${email}`, email, name: 'Writer', provider: 'email' };
  const token = `content-test-token-${email}`;
  _setTestAuth(token, user);
  return new NextRequest(url, {
    method,
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

nextServer.after = () => {};
supabaseModule.getSupabaseClient = () => ({
  from: (tableName) => makeChain(tableName),
});
accessModule.getUserAccess = async () => ({
  tier: 'pro',
  canAccessFeature: () => true,
});
require.cache[pipelineModulePath] = {
  id: pipelineModulePath,
  filename: pipelineModulePath,
  loaded: true,
  exports: {
    runArticlePipeline: async () => {},
  },
};

const generateArticleRoute = require('../src/app/api/content-studio/[id]/generate-article/route.ts');

test.beforeEach(() => {
  resetTables();
  _clearTestAuth();
});

test.after(() => {
  nextServer.after = originalAfter;
  supabaseModule.getSupabaseClient = originalGetSupabaseClient;
  accessModule.getUserAccess = originalGetUserAccess;
  if (originalPipelineModule) {
    require.cache[pipelineModulePath] = originalPipelineModule;
  } else {
    delete require.cache[pipelineModulePath];
  }
  _clearTestAuth();
});

test('article generation quota ignores briefs that have not produced articles yet', async () => {
  const createdAt = new Date().toISOString();
  const targetId = '00000000-0000-4000-8000-000000000003';
  tables.content_studio_items.push(
    {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: 'test-writer@example.com',
      status: 'brief_ready',
      brief_markdown: '# Brief 1',
      article_markdown: null,
      created_at: createdAt,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      user_id: 'test-writer@example.com',
      status: 'brief_ready',
      brief_markdown: '# Brief 2',
      article_markdown: null,
      created_at: createdAt,
    },
    {
      id: targetId,
      user_id: 'test-writer@example.com',
      status: 'brief_ready',
      brief_markdown: '# Ready to write',
      article_markdown: null,
      audience_id: null,
      content_type: 'blog_post',
      title: 'Target',
      topic: 'AI visibility',
      created_at: createdAt,
    },
  );

  const request = createAuthedJsonRequest(
    `http://localhost/api/content-studio/${targetId}/generate-article`,
    'POST',
    {}
  );

  const response = await generateArticleRoute.POST(request, {
    params: Promise.resolve({ id: targetId }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, 'article_generating');
});

test('article generation quota blocks once completed articles reach the plan limit', async () => {
  const createdAt = new Date().toISOString();
  const targetId = '00000000-0000-4000-8000-000000000006';
  tables.content_studio_items.push(
    {
      id: '00000000-0000-4000-8000-000000000004',
      user_id: 'test-writer@example.com',
      status: 'article_ready',
      brief_markdown: '# Brief 1',
      article_markdown: '# Article 1',
      created_at: createdAt,
    },
    {
      id: '00000000-0000-4000-8000-000000000005',
      user_id: 'test-writer@example.com',
      status: 'article_ready',
      brief_markdown: '# Brief 2',
      article_markdown: '# Article 2',
      created_at: createdAt,
    },
    {
      id: targetId,
      user_id: 'test-writer@example.com',
      status: 'brief_ready',
      brief_markdown: '# Ready to write',
      article_markdown: null,
      audience_id: null,
      content_type: 'blog_post',
      title: 'Target',
      topic: 'AI visibility',
      created_at: createdAt,
    },
  );

  const request = createAuthedJsonRequest(
    `http://localhost/api/content-studio/${targetId}/generate-article`,
    'POST',
    {}
  );

  const response = await generateArticleRoute.POST(request, {
    params: Promise.resolve({ id: targetId }),
  });
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.match(payload.error, /Monthly content limit reached/);
  assert.equal(payload.used, 2);
  assert.equal(payload.limit, 2);
});
