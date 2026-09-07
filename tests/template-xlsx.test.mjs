import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { generateTemplateXlsx } from '../skills/family-finance/scripts/generate-template-xlsx.mjs';

test('generated XLSX contains the v2 cashflow layout and no live private data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'family-finance-template-test-'));
  const target = join(directory, 'template.xlsx');

  try {
    await generateTemplateXlsx(target);
    const cashflowXml = execFileSync('unzip', ['-p', target, 'xl/worksheets/sheet4.xml'], { encoding: 'utf8' });
    const balanceXml = execFileSync('unzip', ['-p', target, 'xl/worksheets/sheet5.xml'], { encoding: 'utf8' });
    const stylesXml = execFileSync('unzip', ['-p', target, 'xl/styles.xml'], { encoding: 'utf8' });
    const workbookXml = execFileSync('unzip', ['-p', target, 'xl/workbook.xml'], { encoding: 'utf8' });
    const entries = execFileSync('unzip', ['-Z1', target], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((entry) => entry.startsWith('xl/') && entry.endsWith('.xml'));
    const archiveText = entries
      .map((entry) => execFileSync('unzip', ['-p', target, entry], { encoding: 'utf8' }))
      .join('\n');

    assert.match(cashflowXml, /<dimension ref="A1:AI18"\/>/);
    assert.match(cashflowXml, /<sheetFormatPr defaultRowHeight="20\.25"\/>/);
    assert.match(cashflowXml, /<f>N3\*O2<\/f>/);
    assert.match(cashflowXml, /<f>T3-Z3-AA3\+AD3\+AE3<\/f>/);
    assert.match(cashflowXml, /<mergeCell ref="B1:B18"\/>/);
    assert.match(cashflowXml, /<mergeCell ref="AH16:AI17"\/>/);
    assert.match(cashflowXml, /<cols>/);
    assert.match(cashflowXml, /width="20\.57"/);
    assert.doesNotMatch(cashflowXml, /width="149"/);
    assert.match(balanceXml, /<dimension ref="A1:M21"\/>/);
    assert.match(balanceXml, /<f>SUM\(H3:H10\)<\/f>/);
    assert.match(balanceXml, /<f>IFERROR\(G3\/G20,0\)<\/f>/);
    assert.doesNotMatch(balanceXml, /DIVIDE\(/);
    assert.match(balanceXml, /<f>-B20\+G20\+M20<\/f>/);
    assert.match(balanceXml, /<mergeCell ref="L21:M21"\/>/);
    assert.match(balanceXml, /<c r="H2" s="3"><f>SUM\(H3:H10\)<\/f><\/c>/);
    assert.match(balanceXml, /<c r="I2" s="4"><v>0\.4<\/v><\/c>/);
    assert.match(stylesXml, /<xf numFmtId="10"/);
    assert.match(stylesXml, /<xf numFmtId="9"/);
    assert.match(workbookXml, /name="_template_cashflow"/);
    assert.doesNotMatch(archiveText, /字节|奔驰|民生|工行|Li个人|Zhang|38万|1f55f3/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('generated XLSX is byte-for-byte reproducible', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'family-finance-template-repro-'));
  const first = join(directory, 'first.xlsx');
  const second = join(directory, 'second.xlsx');

  try {
    await generateTemplateXlsx(first);
    await generateTemplateXlsx(second);
    assert.deepEqual(await readFile(first), await readFile(second));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('failed generation preserves an existing target file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'family-finance-template-failure-'));
  const target = join(directory, 'template.xlsx');
  const originalPath = process.env.PATH;

  try {
    await writeFile(target, 'existing-template');
    process.env.PATH = '';
    await assert.rejects(generateTemplateXlsx(target), /ENOENT/);
    assert.equal(await readFile(target, 'utf8'), 'existing-template');
  } finally {
    process.env.PATH = originalPath;
    await rm(directory, { recursive: true, force: true });
  }
});
