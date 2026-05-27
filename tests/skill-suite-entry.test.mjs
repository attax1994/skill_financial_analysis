import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const skillNames = [
  'family-finance-suite',
  'family-finance',
  'family-finance-health-check',
  'family-finance-structure-analysis',
  'family-finance-planning'
];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('suite entry skill routes to every family finance skill', () => {
  const body = read('skills/family-finance-suite/SKILL.md');

  assert.match(body, /^---\nname: family-finance-suite\n/m);
  assert.match(body, /description: Use when /);

  for (const skillName of skillNames.slice(1)) {
    assert.match(body, new RegExp(`\\\`${skillName}\\\``), `${skillName} should be discoverable from the entry skill`);
  }

  assert.match(body, /write-capable ledger/i);
  assert.match(body, /health/i);
  assert.match(body, /structure/i);
  assert.match(body, /planning/i);
  assert.match(body, /preview/i);
  assert.match(body, /confirmation/i);
});

test('all family finance skill UI prompts invoke the actual skill names', () => {
  for (const skillName of skillNames) {
    const yaml = read(`skills/${skillName}/agents/openai.yaml`);
    assert.ok(
      yaml.includes(`default_prompt: "Use $${skillName}`),
      `${skillName} default prompt should invoke $${skillName}`
    );
  }
});
