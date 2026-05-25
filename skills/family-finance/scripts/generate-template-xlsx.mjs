#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import manifest from '../assets/family-finance-template.manifest.json' with { type: 'json' };

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, '..');
const outputPath = resolve(skillDir, 'assets/family-finance-template.xlsx');

const sheets = [
  {
    name: '_config',
    values: [
      ['家庭财务配置表'],
      ['风险提示', '此表由 family-finance skill 管理。可以查看和谨慎修改；修改版本、字段映射或 sheet id 可能导致自动更新失败。'],
      ['template_version', manifest.template_version],
      ['schema_version', manifest.schema_version]
    ]
  },
  {
    name: '_snapshots',
    values: [['snapshot_id', 'created_at', 'year_month', 'net_worth_wan', 'note']]
  },
  {
    name: '_imports',
    values: [['operation_id', 'preview_id', 'status', 'started_at', 'finished_at', 'ranges', 'recovery_note']]
  },
  {
    name: manifest.renderable_templates.cashflow.sheet_title,
    values: manifest.renderable_templates.cashflow.values,
    frozenRowCount: manifest.renderable_templates.cashflow.frozen_row_count,
    frozenColumnCount: manifest.renderable_templates.cashflow.frozen_column_count
  },
  {
    name: manifest.renderable_templates.balance.sheet_title,
    values: manifest.renderable_templates.balance.values,
    frozenRowCount: manifest.renderable_templates.balance.frozen_row_count,
    frozenColumnCount: manifest.renderable_templates.balance.frozen_column_count
  }
];

export async function generateTemplateXlsx(target = outputPath) {
  const dir = await mkdtemp(join(tmpdir(), 'family-finance-xlsx-'));
  try {
    await createPackage(dir);
    await execFileAsync('zip', ['-qr', target, '.'], { cwd: dir });
    return target;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function createPackage(root) {
  await mkdir(join(root, '_rels'), { recursive: true });
  await mkdir(join(root, 'docProps'), { recursive: true });
  await mkdir(join(root, 'xl/_rels'), { recursive: true });
  await mkdir(join(root, 'xl/worksheets'), { recursive: true });

  await writeFile(join(root, '[Content_Types].xml'), contentTypesXml());
  await writeFile(join(root, '_rels/.rels'), packageRelsXml());
  await writeFile(join(root, 'docProps/core.xml'), corePropsXml());
  await writeFile(join(root, 'docProps/app.xml'), appPropsXml());
  await writeFile(join(root, 'xl/workbook.xml'), workbookXml());
  await writeFile(join(root, 'xl/_rels/workbook.xml.rels'), workbookRelsXml());
  await writeFile(join(root, 'xl/styles.xml'), stylesXml());

  for (let i = 0; i < sheets.length; i += 1) {
    await writeFile(join(root, `xl/worksheets/sheet${i + 1}.xml`), worksheetXml(sheets[i]));
  }
}

function contentTypesXml() {
  const worksheetOverrides = sheets.map((_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${worksheetOverrides}
</Types>`);
}

function packageRelsXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function workbookRelsXml() {
  const sheetRels = sheets.map((_, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function workbookXml() {
  const sheetEntries = sheets.map((sheet, index) => (
    `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  )).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEntries}</sheets>
</workbook>`);
}

function worksheetXml(sheet) {
  const rows = sheet.values ?? [];
  const maxColumnCount = rows.reduce((max, row) => Math.max(max, row.length), 1);
  const dimension = `A1:${columnName(maxColumnCount)}${Math.max(rows.length, 1)}`;
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cellXml(value, columnIndex + 1, rowIndex + 1)).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const sheetViews = sheetViewsXml(sheet);

  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  ${sheetViews}
  <sheetFormatPr defaultRowHeight="18"/>
  <sheetData>${rowXml}</sheetData>
</worksheet>`);
}

function sheetViewsXml(sheet) {
  const frozenRows = sheet.frozenRowCount ?? 0;
  const frozenColumns = sheet.frozenColumnCount ?? 0;
  if (!frozenRows && !frozenColumns) return '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const topLeftCell = `${columnName(frozenColumns + 1)}${frozenRows + 1}`;
  const attrs = [
    frozenColumns ? `xSplit="${frozenColumns}"` : '',
    frozenRows ? `ySplit="${frozenRows}"` : '',
    `topLeftCell="${topLeftCell}"`,
    'activePane="bottomRight"',
    'state="frozen"'
  ].filter(Boolean).join(' ');
  return `<sheetViews><sheetView workbookViewId="0"><pane ${attrs}/></sheetView></sheetViews>`;
}

function cellXml(value, column, row) {
  if (value === null || value === undefined || value === '') return '';
  const ref = `${columnName(column)}${row}`;
  const style = row === 1 ? ' s="1"' : '';
  if (typeof value === 'number') return `<c r="${ref}"${style}><v>${value}</v></c>`;
  if (typeof value === 'string' && value.startsWith('=')) {
    return `<c r="${ref}"${style}><f>${escapeXml(value.slice(1))}</f></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function stylesXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F3FF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`);
}

function corePropsXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Family Finance Template</dc:title>
  <dc:creator>family-finance skill</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-05-25T00:00:00Z</dcterms:created>
</cp:coreProperties>`);
}

function appPropsXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>family-finance skill</Application>
</Properties>`);
}

function columnName(index) {
  let name = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xml(value) {
  return `${value.trim()}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateTemplateXlsx().then((target) => {
    process.stdout.write(`${target}\n`);
  }).catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
