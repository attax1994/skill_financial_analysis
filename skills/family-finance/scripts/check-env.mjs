#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MIN_LARK_CLI = '1.0.39';

export async function checkEnvironment() {
  const result = {
    node: {
      version: process.versions.node,
      ok: compareVersions(process.versions.node, '20.0.0') >= 0
    },
    lark_cli: {
      ok: false,
      version: null,
      min_version: MIN_LARK_CLI,
      error: null
    }
  };

  try {
    const { stdout } = await execFileAsync('lark-cli', ['--version']);
    const version = stdout.trim().match(/(\d+\.\d+\.\d+)/)?.[1] ?? null;
    result.lark_cli.version = version;
    result.lark_cli.ok = Boolean(version) && compareVersions(version, MIN_LARK_CLI) >= 0;
  } catch (err) {
    result.lark_cli.error = err.message;
  }

  result.ok = result.node.ok && result.lark_cli.ok;
  return result;
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkEnvironment().then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 1;
  }).catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
