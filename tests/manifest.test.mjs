import assert from 'node:assert/strict';
import test from 'node:test';

import manifest from '../skills/family-finance/assets/family-finance-template.manifest.json' with { type: 'json' };

function columnIndex(name) {
  return [...name].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function cell(template, ref) {
  const match = /^([A-Z]+)(\d+)$/.exec(ref);
  assert.ok(match, `invalid cell reference: ${ref}`);
  return template.values[Number(match[2]) - 1]?.[columnIndex(match[1])];
}

function rangeBounds(range) {
  const match = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(range);
  assert.ok(match, `invalid range: ${range}`);
  return {
    left: columnIndex(match[1]),
    top: Number(match[2]),
    right: columnIndex(match[3] ?? match[1]),
    bottom: Number(match[4] ?? match[2])
  };
}

function rangesOverlap(leftRange, rightRange) {
  const left = rangeBounds(leftRange);
  const right = rangeBounds(rightRange);
  return left.left <= right.right
    && left.right >= right.left
    && left.top <= right.bottom
    && left.bottom >= right.top;
}

test('manifest defines the v2 template contract and required seed sheets', () => {
  assert.equal(manifest.schema_version, '2.0.0');
  assert.equal(manifest.template_version, '2.0.0');
  assert.ok(manifest.sheets.cashflow_template);
  assert.ok(manifest.sheets.balance_template);
  assert.ok(manifest.sheets.config);
  assert.ok(manifest.renderable_templates.cashflow.values.length > 0);
  assert.ok(manifest.renderable_templates.balance.values.length > 0);
  assert.equal(
    manifest.sheets.cashflow_template.frozen_row_count,
    manifest.renderable_templates.cashflow.frozen_row_count
  );
  assert.equal(
    manifest.sheets.cashflow_template.frozen_column_count,
    manifest.renderable_templates.cashflow.frozen_column_count
  );
  assert.equal(
    manifest.sheets.balance_template.frozen_row_count,
    manifest.renderable_templates.balance.frozen_row_count
  );
  assert.equal(
    manifest.sheets.balance_template.frozen_column_count,
    manifest.renderable_templates.balance.frozen_column_count
  );
});

test('cashflow mappings follow the remote-derived v2 input blocks', () => {
  const mapping = manifest.field_mappings.cashflow;

  assert.deepEqual(
    Object.fromEntries(Object.entries(mapping.income).map(([key, value]) => [key, value.column])),
    { member_a_salary: 'D', member_b_salary: 'E', other_income: 'F', income_note: 'G' }
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(mapping.expense).map(([key, value]) => [key, value.column])),
    { fixed_expense: 'I', flexible_expense: 'J', special_expense: 'K', expense_note: 'L' }
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(mapping.asset_change).map(([key, value]) => [key, value.column])),
    { equity_units: 'N', equity_amount: 'O', asset_income: 'P', asset_loss: 'Q', asset_change_note: 'R' }
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(mapping.asset_conversion).map(([key, value]) => [key, value.column])),
    { recurring_conversion: 'Z', other_conversion: 'AA', asset_conversion_note: 'AB' }
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(mapping.asset_redemption).map(([key, value]) => [key, value.column])),
    { recurring_redemption: 'AD', other_redemption: 'AE', asset_redemption_note: 'AF' }
  );
  assert.equal(manifest.month_rows['05'], 7);
});

test('cashflow writable ranges stay outside protected formula and summary ranges', () => {
  assert.deepEqual(manifest.writable_ranges.cashflow, [
    'D3:G14',
    'I3:L14',
    'N3:N14',
    'P3:R14',
    'Z3:AB14',
    'AD3:AF14',
    'O2'
  ]);
  assert.deepEqual(manifest.protected_ranges.cashflow, [
    'O3:O14',
    'T3:W14',
    'AH3:AI14',
    'C16:AI18'
  ]);

  for (const writable of manifest.writable_ranges.cashflow) {
    for (const protectedRange of manifest.protected_ranges.cashflow) {
      assert.equal(
        rangesOverlap(writable, protectedRange),
        false,
        `${writable} overlaps protected range ${protectedRange}`
      );
    }
  }
});

test('cashflow v2 formulas distinguish surplus, asset increase, conversion, and redemption', () => {
  const cashflow = manifest.renderable_templates.cashflow;

  assert.equal(cashflow.dimensions.column_count, 35);
  for (let row = 3; row <= 14; row += 1) {
    assert.equal(cell(cashflow, `O${row}`), `=N${row}*O2`);
    assert.equal(cell(cashflow, `T${row}`), `=D${row}+E${row}+F${row}-I${row}-J${row}-K${row}`);
    assert.equal(cell(cashflow, `U${row}`), `=U${row - 1}+T${row}`);
    assert.equal(cell(cashflow, `V${row}`), `=T${row}+O${row}+P${row}-Q${row}`);
    assert.equal(cell(cashflow, `W${row}`), `=W${row - 1}+V${row}`);
    assert.equal(cell(cashflow, `AH${row}`), `=T${row}-Z${row}-AA${row}+AD${row}+AE${row}`);
    assert.equal(cell(cashflow, `AI${row}`), `=AI${row - 1}+AH${row}`);
  }
});

test('cashflow v2 summaries aggregate the three distinct flows', () => {
  const cashflow = manifest.renderable_templates.cashflow;

  assert.equal(cell(cashflow, 'T16'), '=D17-I17');
  assert.equal(cell(cashflow, 'N17'), '=O16+P16-Q16');
  assert.equal(cell(cashflow, 'T17'), '=T16+N17');
  assert.equal(cell(cashflow, 'Z17'), '=Z16+AA16');
  assert.equal(cell(cashflow, 'AD17'), '=AD16+AE16');
  assert.equal(cell(cashflow, 'AH16'), '=T16-Z17+AD17');
});

test('cashflow v2 preserves the remote layout merges without cash balance fields', () => {
  const cashflow = manifest.renderable_templates.cashflow;
  const merges = new Set(cashflow.merges);

  for (const range of ['B1:B18', 'X1:X18', 'T16:W16', 'Z17:AA17', 'AD17:AE17', 'AH16:AI17']) {
    assert.ok(merges.has(range), `${range} should be merged`);
  }
  const headers = cashflow.values[0].filter((value) => typeof value === 'string').join('\n');
  assert.doesNotMatch(headers, /期初现金|期末现金|剩余现金/);
  const labels = cashflow.values.flat().filter((value) => typeof value === 'string').join('\n');
  assert.match(labels, /现金结余/);
  assert.match(labels, /现金净增加额/);
});

test('balance seed uses the expanded remote-derived 21-row structure with generic labels', () => {
  const balance = manifest.renderable_templates.balance;

  assert.equal(balance.values.length, 21);
  assert.equal(cell(balance, 'H2'), '=SUM(H3:H10)');
  assert.equal(cell(balance, 'I2'), 0.4);
  assert.equal(cell(balance, 'H3'), '=IFERROR(G3/G20,0)');
  assert.equal(cell(balance, 'H11'), '=SUM(H12:H15)');
  assert.equal(cell(balance, 'I11'), 0.4);
  assert.equal(cell(balance, 'H16'), '=SUM(H17:H19)');
  assert.equal(cell(balance, 'I16'), 0.2);
  assert.equal(cell(balance, 'B20'), '=SUM(C2:C19)');
  assert.equal(cell(balance, 'F20'), '=SUM(F3:F19)');
  assert.equal(cell(balance, 'G20'), '=SUM(G3:G19)');
  assert.equal(cell(balance, 'L20'), '=SUM(L2:L19)');
  assert.equal(cell(balance, 'M20'), '=SUM(M2:M19)');
  assert.equal(cell(balance, 'L21'), '=-B20+G20+M20');
  for (const row of [3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19]) {
    assert.equal(cell(balance, `H${row}`), `=IFERROR(G${row}/G20,0)`);
  }

  const labels = balance.values.flat().filter((value) => typeof value === 'string').join('\n');
  assert.match(labels, /公司股权\/RSU/);
  assert.doesNotMatch(labels, /字节|奔驰|民生|工行/);
  assert.doesNotMatch(labels, /DIVIDE\(/);
});
