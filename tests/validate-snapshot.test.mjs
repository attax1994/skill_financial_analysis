import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeAmountToWan,
  normalizeMonthlySnapshot,
  validateMonthlySnapshot
} from '../skills/family-finance/scripts/validate-snapshot.mjs';

test('omitted amount units default to wan', () => {
  assert.equal(normalizeAmountToWan(5.38), 5.38);
  assert.equal(normalizeAmountToWan({ value: 5.38 }), 5.38);
});

test('explicit yuan and thousand-yuan amounts normalize to wan', () => {
  assert.equal(normalizeAmountToWan({ value: 53800, unit: 'yuan' }), 5.38);
  assert.equal(normalizeAmountToWan({ value: 53.8, unit: 'thousand_yuan' }), 5.38);
  assert.equal(normalizeAmountToWan({ value: 5.38, unit: 'wan' }), 5.38);
});

test('null remains unknown and zero remains explicit zero', () => {
  const snapshot = normalizeMonthlySnapshot({
    month: '2026-05',
    cashflow: {
      income: {
        member_a_salary: 0,
        member_b_salary: null
      }
    }
  });

  assert.equal(snapshot.cashflow.income.member_a_salary, 0);
  assert.equal(snapshot.cashflow.income.member_b_salary, null);
});

test('negative values require an explanation note', () => {
  const result = validateMonthlySnapshot({
    month: '2026-05',
    cashflow: {
      expense: {
        special_expense: -0.2
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'NEGATIVE_REQUIRES_NOTE');
});

test('asset redemption values normalize and use their own explanation note', () => {
  const result = validateMonthlySnapshot({
    month: '2026-06',
    cashflow: {
      asset_redemption: {
        recurring_redemption: { value: 2400, unit: 'yuan' },
        other_redemption: -1,
        asset_redemption_note: '赎回冲正'
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.cashflow.asset_redemption.recurring_redemption, 0.24);
  assert.equal(result.value.cashflow.asset_redemption.other_redemption, -1);
});

test('negative asset redemption requires an asset redemption note', () => {
  const result = validateMonthlySnapshot({
    month: '2026-06',
    cashflow: {
      asset_redemption: {
        other_redemption: -1
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'NEGATIVE_REQUIRES_NOTE');
  assert.equal(result.errors[0].path, 'cashflow.asset_redemption.other_redemption');
});

test('month keys must use YYYY-MM', () => {
  const result = validateMonthlySnapshot({
    month: '2026-5',
    cashflow: {
      income: {
        member_a_salary: 5.38
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'INVALID_MONTH');
});

test('normalization keeps stable field keys and rounds to four decimals', () => {
  const snapshot = normalizeMonthlySnapshot({
    month: '2026-05',
    cashflow: {
      income: {
        other_income: { value: 1234.5678, unit: 'yuan' },
        income_note: 'tax refund'
      }
    }
  });

  assert.equal(snapshot.cashflow.income.other_income, 0.1235);
  assert.equal(snapshot.cashflow.income.income_note, 'tax refund');
});
