import assert from 'node:assert/strict';
import test from 'node:test';

import manifest from '../skills/family-finance/assets/family-finance-template.manifest.json' with { type: 'json' };

test('manifest defines required sheet roles and renderable seed sheets', () => {
  assert.ok(manifest.sheets.cashflow_template);
  assert.ok(manifest.sheets.balance_template);
  assert.ok(manifest.sheets.config);
  assert.ok(manifest.renderable_templates.cashflow.values.length > 0);
  assert.ok(manifest.renderable_templates.balance.values.length > 0);
});

test('cashflow field mappings include month-relative writable cells', () => {
  assert.equal(manifest.field_mappings.cashflow.income.member_a_salary.column, 'B');
  assert.equal(manifest.field_mappings.cashflow.income.income_note.column, 'F');
  assert.equal(manifest.month_rows['05'], 7);
});

test('writable ranges do not overlap protected formula ranges', () => {
  const protectedRanges = new Set(manifest.protected_ranges.cashflow);
  for (const range of manifest.writable_ranges.cashflow) {
    assert.equal(protectedRanges.has(range), false, `${range} overlaps protected ranges`);
  }
});

test('cashflow monthly rows include protected formulas', () => {
  const january = manifest.renderable_templates.cashflow.values[2];
  assert.equal(january[16], '=B3+C3+D3+E3-H3-I3-J3');
  assert.equal(january[17], '=R2+Q3');
  assert.equal(january[18], '=Q3-M3-N3');
  assert.equal(january[19], '=T2+S3');
  assert.equal(january[22], '=V3*W2');
  assert.equal(january[27], '=Q3+W3+X3-Y3');
  assert.equal(january[28], '=AC2+AB3');
});
