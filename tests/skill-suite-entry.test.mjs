import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const skillNames = [
  'family-finance-suite',
  'family-finance-onboarding',
  'family-finance-environment',
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

  assert.match(body, /你能做什么/);
  assert.match(body, /有哪些功能/);
  assert.match(body, /write-capable ledger/i);
  assert.match(body, /environment/i);
  assert.match(body, /health/i);
  assert.match(body, /structure/i);
  assert.match(body, /planning/i);
  assert.match(body, /preview/i);
  assert.match(body, /confirmation/i);
});

test('repository root is installable as the suite entry skill', () => {
  const body = read('SKILL.md');
  const yaml = read('agents/openai.yaml');

  assert.match(body, /^---\nname: family-finance-suite\n/m);
  assert.match(body, /description: Use when /);
  assert.match(body, /tools expect a SKILL\.md at the repository root/i);
  assert.match(body, /skills\/family-finance-suite\/SKILL\.md/);

  for (const skillName of skillNames.slice(1)) {
    assert.match(body, new RegExp(`\\\`${skillName}\\\``), `${skillName} should be discoverable from the root entry skill`);
  }

  assert.ok(yaml.includes('display_name: "Family Finance Suite"'));
  assert.ok(yaml.includes('default_prompt: "Use $family-finance-suite'));
});

test('onboarding skill gives beginner-friendly capability guidance', () => {
  const body = read('skills/family-finance-onboarding/SKILL.md');

  assert.match(body, /^---\nname: family-finance-onboarding\n/m);
  assert.match(body, /你能做什么/);
  assert.match(body, /有哪些功能/);
  assert.match(body, /理财小白/);
  assert.match(body, /少用术语/);
  assert.match(body, /每月/);
  assert.match(body, /现金/);
  assert.match(body, /资产和负债/);
  assert.match(body, /预算/);
  assert.match(body, /不会自动写入/);
  assert.match(body, /不是投资建议/);
});

test('main finance skill starts Feishu work with environment initialization', () => {
  const body = read('skills/family-finance/SKILL.md');

  assert.match(body, /family-finance-environment/);
  assert.match(body, /scripts\/check-env\.sh/);
  assert.match(body, /scripts\/check-env\.mjs/);
  assert.match(body, /Node\.js 20/);
  assert.match(body, /lark-cli >= 1\.0\.39/);
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
