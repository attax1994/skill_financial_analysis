#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export function buildWritePreview({ profile, manifest, snapshot, existingValues = {}, readRevision = null }) {
  const year = snapshot.month.slice(0, 4);
  const month = snapshot.month.slice(5, 7);
  const row = manifest.month_rows[month];
  if (!row) throw new Error(`No month row mapping for ${snapshot.month}`);

  const cashflowSheetId = profile.years?.[year]?.cashflow_sheet_id;
  if (!cashflowSheetId) throw new Error(`No cashflow sheet configured for ${year}`);

  const writes = [];
  const cashflow = snapshot.cashflow ?? {};
  for (const [sectionName, fields] of Object.entries(cashflow)) {
    const sectionMapping = manifest.field_mappings.cashflow[sectionName] ?? {};
    for (const [fieldName, value] of Object.entries(fields ?? {})) {
      if (value === undefined) continue;
      const mapping = sectionMapping[fieldName];
      if (!mapping) {
        writes.push({
          field_path: `cashflow.${sectionName}.${fieldName}`,
          unresolved: true,
          value
        });
        continue;
      }
      if (mapping.kind === 'formula') continue;

      const range = `${cashflowSheetId}!${mapping.column}${row}`;
      const originalValue = existingValues[range] ?? null;
      const write = {
        field_path: `cashflow.${sectionName}.${fieldName}`,
        label: mapping.label,
        kind: mapping.kind,
        range,
        original_value: originalValue,
        value,
        conflict: false,
        merge_strategy: 'overwrite'
      };

      if (mapping.kind === 'note') {
        write.value = appendNote(originalValue, value);
        write.merge_strategy = originalValue ? 'append_note' : 'write_note';
      } else if (originalValue !== null && originalValue !== '' && !sameValue(originalValue, value)) {
        write.conflict = true;
      }

      writes.push(write);
    }
  }

  const previewInput = {
    profile_id: profile.profile_id,
    spreadsheet_token: profile.spreadsheet_token,
    snapshot,
    readRevision,
    original_values: Object.fromEntries(writes.filter((write) => !write.unresolved).map((write) => [write.range, write.original_value])),
    targets: writes.map((write) => ({ range: write.range, value: write.value, conflict: write.conflict }))
  };

  return {
    preview_id: hashPreviewInput(previewInput),
    read_revision: readRevision,
    profile_id: profile.profile_id,
    spreadsheet_token: profile.spreadsheet_token,
    month: snapshot.month,
    writes,
    unresolved_items: writes.filter((write) => write.unresolved),
    status: writes.some((write) => write.conflict) ? 'needs_confirmation' : 'ready_for_confirmation'
  };
}

export function detectStalePreview(preview, currentValues) {
  const changed = [];
  for (const write of preview.writes ?? []) {
    if (!write.range || write.unresolved) continue;
    const current = currentValues[write.range] ?? null;
    if (!sameValue(current, write.original_value)) {
      changed.push({
        range: write.range,
        preview_original_value: write.original_value,
        current_value: current
      });
    }
  }
  return {
    ok: changed.length === 0,
    changed
  };
}

export function hashPreviewInput(input) {
  return createHash('sha256').update(stableStringify(input)).digest('hex').slice(0, 24);
}

function appendNote(originalValue, newValue) {
  if (newValue === null || newValue === undefined || newValue === '') return originalValue ?? null;
  if (originalValue === null || originalValue === undefined || originalValue === '') return String(newValue);
  return `${originalValue}\n${newValue}`;
}

function sameValue(left, right) {
  if ((left === null || left === undefined || left === '') && (right === null || right === undefined || right === '')) {
    return true;
  }
  return String(left) === String(right);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find((arg) => !arg.startsWith('-'));
  if (!inputPath) throw new Error('Usage: build-write-preview.mjs <preview-input.json>');
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const preview = buildWritePreview(input);
  process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
