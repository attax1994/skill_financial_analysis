#!/usr/bin/env node

export function buildExportCommand({ spreadsheetToken, outputPath, mode = 'full', fileExtension = 'xlsx' }) {
  if (!spreadsheetToken) throw new Error('spreadsheetToken is required');
  const args = [
    'lark-cli',
    'sheets',
    '+export',
    '--spreadsheet-token',
    shellQuote(spreadsheetToken),
    '--file-extension',
    shellQuote(fileExtension)
  ];
  if (outputPath) args.push('--output-path', shellQuote(outputPath));
  return {
    mode,
    command: args.join(' '),
    note: mode === 'report'
      ? 'Report-only export may require a follow-up filtering step; full backup is the baseline lark-cli export.'
      : 'Full backup exports all sheets, including system metadata sheets.'
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--spreadsheet-token') parsed.spreadsheetToken = args[++i];
    else if (arg === '--output-path') parsed.outputPath = args[++i];
    else if (arg === '--mode') parsed.mode = args[++i];
    else if (arg === '--file-extension') parsed.fileExtension = args[++i];
  }
  return parsed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = buildExportCommand(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
