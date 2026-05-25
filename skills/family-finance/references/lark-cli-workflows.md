# Lark CLI Workflows

Use `lark-cli >= 1.0.39` with user identity for personal finance ledgers.

## Environment Check

```bash
node skills/family-finance/scripts/check-env.mjs
lark-cli --version
```

If `lark-cli` is missing, direct the user to install/configure it from the official Lark CLI quick-start. If user authorization is missing, ask for the minimum needed `lark-cli auth login --scope ...`; do not request broad permissions up front.

## Read Spreadsheet Metadata

```bash
lark-cli sheets +info --spreadsheet-token "<token>"
```

Use this before writes to resolve sheet IDs and verify expected system sheets.

## Read Cells

```bash
lark-cli sheets +read --spreadsheet-token "<token>" --range "<sheetId>!A1:D10"
lark-cli sheets +read --spreadsheet-token "<token>" --range "<sheetId>!A1:D10" --value-render-option Formula
```

Use formula rendering when validating copied or reconstructed template sheets.

## Create Ledger

1. `lark-cli sheets +create --title "家庭财务账本"`
2. Inspect the default sheet.
3. Create or reuse visible system and seed sheets.
4. Populate seed sheets from the manifest.
5. Copy seed sheets for the first annual sheet group.
6. Write `_config` only after sheet IDs are verified.

Relevant commands:

```bash
lark-cli sheets +create-sheet --spreadsheet-token "<token>" --title "_config"
lark-cli sheets +copy-sheet --spreadsheet-token "<token>" --sheet-id "<seedId>" --title "2026现金流"
lark-cli sheets +update-sheet --spreadsheet-token "<token>" --sheet-id "<sheetId>" --frozen-row-count 1 --frozen-col-count 1
lark-cli sheets +merge-cells --spreadsheet-token "<token>" --range "<sheetId>!A1:B1"
lark-cli sheets +set-style --spreadsheet-token "<token>" --range "<sheetId>!A1:Z1" --style '{"font":{"bold":true}}'
```

## Write Protocol

Never write without a `WritePreview`.

1. Build preview from current values.
2. Show preview and ask for confirmation.
3. Re-read all target ranges.
4. Reject stale preview if any original value changed.
5. Write grouped ranges with `lark-cli sheets +write`.
6. Re-read written ranges and verify values.
7. Log success or partial failure.

Example write:

```bash
lark-cli sheets +write --spreadsheet-token "<token>" --range "<sheetId>!B7:F7" --values '[[5.8,2.7,0.5,0.8,"退税"]]'
```

If a failure cannot be logged to Feishu, write a local recovery record next to the local profile and surface it before future writes.

## Export

Full backup:

```bash
lark-cli sheets +export --spreadsheet-token "<token>" --file-extension xlsx --output-path "./family-finance-backup.xlsx"
```

Report-only export is an enhanced flow: first export, then remove or filter system sheets if the environment has the needed optional tooling.
