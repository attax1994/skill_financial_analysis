import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('environment initialization skill documents runtime and development dependencies', () => {
  const body = read('skills/family-finance-environment/SKILL.md');

  assert.match(body, /^---\nname: family-finance-environment\n/m);
  assert.match(body, /Node\.js 20/);
  assert.match(body, /npm/);
  assert.match(body, /npx/);
  assert.match(body, /lark-cli >= 1\.0\.39/);
  assert.match(body, /Feishu/);
  assert.match(body, /zip/);
  assert.match(body, /PyYAML/);
  assert.match(body, /runtime/i);
  assert.match(body, /development/i);
  assert.match(body, /Do not silently install/i);
});

test('no-node bootstrap checker exists and checks prerequisites before Node scripts', () => {
  const body = read('skills/family-finance/scripts/check-env.sh');

  assert.match(body, /command -v node/);
  assert.match(body, /command -v npm/);
  assert.match(body, /command -v npx/);
  assert.match(body, /command -v lark-cli/);
  assert.match(body, /1\.0\.39/);
  assert.match(body, /Node\.js 20/);
  assert.match(body, /check-env\.mjs/);
});
