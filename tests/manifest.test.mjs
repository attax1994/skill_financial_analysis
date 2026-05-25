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

test('cashflow summary rows aggregate all monthly formulas', () => {
  const subtotal = manifest.renderable_templates.cashflow.values[15];
  const total = manifest.renderable_templates.cashflow.values[16];

  assert.equal(subtotal[16], '=SUM(Q3:Q14)');
  assert.equal(total[16], '=SUM(S3:S14)');
  assert.equal(total[27], '=SUM(AB3:AB14)');
});

test('balance sheet totals do not self-reference or point at blank rows', () => {
  const rows = manifest.renderable_templates.balance.values;

  assert.equal(rows[1][7], '=SUM(H3:H6)');
  assert.equal(rows[2][7], '=IFERROR(DIVIDE(G3,G13),0)');
  assert.equal(rows[6][7], '=SUM(H8:H9)');
  assert.equal(rows[7][7], '=IFERROR(DIVIDE(G8,G13),0)');
  assert.equal(rows[9][7], '=SUM(H11:H12)');
  assert.equal(rows[10][7], '=IFERROR(DIVIDE(G11,G13),0)');
  assert.equal(rows[12][2], '=SUM(C2:C12)');
  assert.equal(rows[12][5], '=SUM(F3:F12)');
  assert.equal(rows[12][6], '=SUM(G3:G12)');
  assert.equal(rows[12][11], '=SUM(L2:L12)');
  assert.equal(rows[12][12], '=SUM(M2:M12)');
  assert.equal(rows[13][11], '=-C13+G13+M13');

  for (const row of rows) {
    for (const cell of row) {
      if (typeof cell === 'string' && cell.startsWith('=')) {
        assert.equal(cell.includes('18'), false, `${cell} should not reference old row 18`);
        assert.equal(cell.includes('17'), false, `${cell} should not reference old row 17`);
      }
    }
  }
});
