import assert from 'node:assert/strict';
import test from 'node:test';

import manifest from '../skills/family-finance/assets/family-finance-template.manifest.json' with { type: 'json' };
import {
  buildWritePreview,
  detectStalePreview,
  hashPreviewInput
} from '../skills/family-finance/scripts/build-write-preview.mjs';

const profile = {
  profile_id: 'demo-family',
  spreadsheet_token: 'sht_demo',
  years: {
    2026: {
      cashflow_sheet_id: 'cash2026',
      balance_sheet_id: 'bal2026'
    }
  }
};

test('hashPreviewInput is deterministic for semantically equal objects', () => {
  const left = hashPreviewInput({ b: 2, a: 1 });
  const right = hashPreviewInput({ a: 1, b: 2 });
  assert.equal(left, right);
});

test('preview captures original values and marks numeric conflicts', () => {
  const preview = buildWritePreview({
    profile,
    manifest,
    snapshot: {
      month: '2026-05',
      cashflow: {
        income: {
          member_a_salary: 5.8
        }
      }
    },
    existingValues: {
      'cash2026!B7': 5.1
    }
  });

  assert.ok(preview.preview_id);
  assert.equal(preview.writes[0].range, 'cash2026!B7');
  assert.equal(preview.writes[0].original_value, 5.1);
  assert.equal(preview.writes[0].conflict, true);
});

test('preview appends explanation fields with newlines', () => {
  const preview = buildWritePreview({
    profile,
    manifest,
    snapshot: {
      month: '2026-05',
      cashflow: {
        income: {
          income_note: 'tax refund'
        }
      }
    },
    existingValues: {
      'cash2026!F7': 'bonus'
    }
  });

  assert.equal(preview.writes[0].value, 'bonus\ntax refund');
  assert.equal(preview.writes[0].merge_strategy, 'append_note');
});

test('stale detection reports changed cells', () => {
  const preview = buildWritePreview({
    profile,
    manifest,
    snapshot: {
      month: '2026-05',
      cashflow: {
        expense: {
          flexible_expense: 1.5
        }
      }
    },
    existingValues: {
      'cash2026!I7': null
    }
  });

  const stale = detectStalePreview(preview, {
    'cash2026!I7': 1.4
  });

  assert.equal(stale.ok, false);
  assert.equal(stale.changed[0].range, 'cash2026!I7');
});
