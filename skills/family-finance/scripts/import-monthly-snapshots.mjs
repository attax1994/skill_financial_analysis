#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { validateMonthlySnapshot } from './validate-snapshot.mjs';

export function validateMonthlySnapshotBatch(items, options = {}) {
  if (!Array.isArray(items)) {
    return {
      ok: false,
      errors: [{ code: 'INVALID_BATCH', path: '', message: 'Batch input must be an array.', severity: 'error' }]
    };
  }

  const results = items.map((item, index) => ({
    index,
    ...validateMonthlySnapshot(item, options)
  }));
  return {
    ok: results.every((result) => result.ok),
    results
  };
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
  const raw = inputPath ? await readFile(inputPath, 'utf8') : await readStdin();
  const result = validateMonthlySnapshotBatch(JSON.parse(raw));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
