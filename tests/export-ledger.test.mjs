import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExportCommand } from '../skills/family-finance/scripts/export-ledger.mjs';

test('export command uses the current workbook export shortcut', () => {
  const result = buildExportCommand({
    spreadsheetToken: 'sht_demo',
    outputPath: './backup.xlsx'
  });

  assert.match(result.command, /lark-cli sheets \+workbook-export/);
  assert.match(result.command, /--spreadsheet-token 'sht_demo'/);
  assert.match(result.command, /--output-path '\.\/backup\.xlsx'/);
  assert.doesNotMatch(result.command, /sheets \+export/);
});
