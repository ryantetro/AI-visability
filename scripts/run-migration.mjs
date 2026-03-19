#!/usr/bin/env node

/**
 * Run Supabase migrations against your project.
 *
 * Usage:
 *   node scripts/run-migration.mjs                    # run all migrations in order
 *   node scripts/run-migration.mjs 007                # run a specific migration by prefix
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// ---------------------------------------------------------------------------
// 1. Load env vars from .env.local
// ---------------------------------------------------------------------------
const root = resolve(import.meta.dirname, '..');
const envPath = join(root, '.env.local');

let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error('Could not read .env.local — make sure it exists in the project root.');
  process.exit(1);
}

const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Determine which migration files to run
// ---------------------------------------------------------------------------
const migrationsDir = join(root, 'supabase', 'migrations');
let files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const filterPrefix = process.argv[2];
if (filterPrefix) {
  files = files.filter((f) => f.startsWith(filterPrefix));
  if (files.length === 0) {
    console.error(`No migration files matching prefix "${filterPrefix}"`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 3. Execute each migration via the Supabase REST SQL endpoint
// ---------------------------------------------------------------------------
async function runSQL(sql) {
  // Use the PostgREST rpc endpoint to execute raw SQL via a custom function,
  // or fall back to the pg-meta SQL endpoint available in Supabase.
  const url = `${SUPABASE_URL}/rest/v1/rpc/`;

  // Supabase exposes a SQL execution endpoint at /pg/query for service role
  // but the most reliable approach is the management API sql endpoint.
  // We'll use the standard approach: POST to /rest/v1/rpc with raw SQL
  // Actually, Supabase doesn't expose raw SQL via REST by default.
  // The recommended way is to use the Supabase Management API or the SQL editor.
  // For automation, we can use the postgres connection string directly.
  // However, the simplest approach without pg dependency is the Supabase
  // Management API's /v1/projects/{ref}/database/query endpoint.

  const ref = SUPABASE_URL.replace('https://', '').split('.')[0];

  // Try the Supabase Management API first (requires service role key)
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (mgmtRes.ok) {
    return { ok: true, data: await mgmtRes.json() };
  }

  // Fallback: try the PostgREST SQL endpoint (some Supabase setups expose this)
  const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgRes.ok) {
    return { ok: true, data: await pgRes.json() };
  }

  const errorText = await mgmtRes.text().catch(() => 'unknown error');
  return { ok: false, error: errorText };
}

console.log(`\nRunning ${files.length} migration(s) against ${SUPABASE_URL}\n`);

let failed = false;
for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf-8');
  process.stdout.write(`  ${file} ... `);

  const result = await runSQL(sql);
  if (result.ok) {
    console.log('OK');
  } else {
    console.log('FAILED');
    console.error(`    Error: ${result.error}`);
    failed = true;
  }
}

console.log('');
if (failed) {
  console.error(
    'Some migrations failed. You can also paste the SQL directly into\n' +
      'the Supabase Dashboard → SQL Editor to run them manually.'
  );
  process.exit(1);
} else {
  console.log('All migrations applied successfully.');
}
