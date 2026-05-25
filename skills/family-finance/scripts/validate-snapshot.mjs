#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DEFAULT_PRECISION = 4;
const UNIT_FACTORS = {
  wan: 1,
  万: 1,
  万元: 1,
  yuan: 0.0001,
  元: 0.0001,
  thousand_yuan: 0.1,
  千元: 0.1
};

const NOTE_FIELDS_BY_SECTION = {
  income: ['income_note'],
  expense: ['expense_note'],
  asset_conversion: ['asset_conversion_note'],
  asset_change: ['asset_change_note']
};

export function normalizeAmountToWan(value, precision = DEFAULT_PRECISION) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return round(value, precision);
  if (typeof value === 'object' && value !== null) {
    const unit = value.unit ?? 'wan';
    const factor = UNIT_FACTORS[unit];
    if (factor === undefined) {
      throw new Error(`Unsupported amount unit: ${unit}`);
    }
    return round(Number(value.value) * factor, precision);
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid numeric amount: ${value}`);
  }
  return round(numeric, precision);
}

export function normalizeMonthlySnapshot(input, options = {}) {
  const precision = options.precision ?? DEFAULT_PRECISION;
  const normalized = {
    month: input.month,
    currency: input.currency ?? options.currency ?? 'CNY',
    cashflow: {}
  };

  for (const [sectionName, fields] of Object.entries(input.cashflow ?? {})) {
    normalized.cashflow[sectionName] = {};
    for (const [fieldName, fieldValue] of Object.entries(fields ?? {})) {
      if (isNoteField(fieldName) || typeof fieldValue === 'string') {
        normalized.cashflow[sectionName][fieldName] = fieldValue;
      } else {
        normalized.cashflow[sectionName][fieldName] = normalizeAmountToWan(fieldValue, precision);
      }
    }
  }

  if (input.unresolved_items) normalized.unresolved_items = input.unresolved_items;
  return normalized;
}

export function validateMonthlySnapshot(input, options = {}) {
  const errors = [];

  if (!MONTH_PATTERN.test(input.month ?? '')) {
    errors.push(error('INVALID_MONTH', 'month', 'Month must use YYYY-MM format.', 'Use a value like 2026-05.'));
  }

  let normalized = null;
  try {
    normalized = normalizeMonthlySnapshot(input, options);
  } catch (err) {
    errors.push(error('INVALID_AMOUNT', 'cashflow', err.message, 'Use numeric values or { "value": number, "unit": "yuan|thousand_yuan|wan" }.'));
  }

  if (normalized) {
    for (const [sectionName, fields] of Object.entries(normalized.cashflow ?? {})) {
      const noteFields = NOTE_FIELDS_BY_SECTION[sectionName] ?? [];
      const hasNote = noteFields.some((fieldName) => {
        const value = fields[fieldName];
        return typeof value === 'string' && value.trim().length > 0;
      });

      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        if (typeof fieldValue === 'number' && fieldValue < 0 && !hasNote) {
          errors.push(error(
            'NEGATIVE_REQUIRES_NOTE',
            `cashflow.${sectionName}.${fieldName}`,
            'Negative financial values require an explanation note.',
            `Add one of: ${noteFields.join(', ') || 'a section note'}.`
          ));
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? normalized : undefined
  };
}

function isNoteField(fieldName) {
  return fieldName.endsWith('_note') || fieldName === 'note' || fieldName === 'description';
}

function round(value, precision) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function error(code, path, message, suggested_fix, severity = 'error') {
  return { code, path, message, severity, suggested_fix };
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find((arg) => !arg.startsWith('-'));
  const raw = inputPath ? await readFile(inputPath, 'utf8') : await readStdin();
  const parsed = JSON.parse(raw);
  const result = validateMonthlySnapshot(parsed);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
