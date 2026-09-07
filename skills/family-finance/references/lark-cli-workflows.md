# Lark CLI Workflows

Use `lark-cli >= 1.0.61` with user identity for personal finance ledgers.

## Environment Check

```bash
sh skills/family-finance/scripts/check-env.sh
node skills/family-finance/scripts/check-env.mjs
lark-cli --version
```

The ordinary requirements are Node.js 20+, npm/npx, `lark-cli >= 1.0.61`, and Feishu user access. `zip` is required only for local template regeneration. Request only the minimum missing user scope.

## Read And Verify

Resolve sheet IDs before sheet-level operations:

```bash
lark-cli sheets +workbook-info --url "<spreadsheet-or-wiki-url>"
```

Read pure values with `+csv-get`; include formulas when verifying a copied or reconstructed template:

```bash
lark-cli sheets +csv-get --url "<url>" --sheet-id "<sheetId>" --range "A1:AI18"
lark-cli sheets +cells-get --url "<url>" --sheet-id "<sheetId>" --range "A1:AI18" --include value,formula
```

## Create Ledger

1. Create a workbook with `+workbook-create`.
2. Inspect its sheets with `+workbook-info`.
3. Create or reuse visible system and seed sheets with `+sheet-create`.
4. Populate seed sheets from the manifest using `+cells-set`.
5. Apply `+dim-freeze`, `+cells-merge`, `+cells-set-style`, `+cols-resize`, and `+rows-resize` from manifest metadata.
6. Copy verified seeds with `+sheet-copy` for the first annual group.
7. Write `_config` only after sheet IDs are verified.

Representative commands:

```bash
lark-cli sheets +workbook-create --title "家庭财务账本"
lark-cli sheets +sheet-create --url "<url>" --title "_config"
lark-cli sheets +sheet-copy --url "<url>" --sheet-id "<seedId>" --title "2026现金流"
lark-cli sheets +dim-freeze --url "<url>" --sheet-id "<sheetId>" --dimension row --count 1
lark-cli sheets +cells-merge --url "<url>" --sheet-id "<sheetId>" --range "B1:B18"
lark-cli sheets +cells-set-style --url "<url>" --sheet-id "<sheetId>" --range "A1:AI1" --font-weight bold
```

## Write Protocol

Never write without a `WritePreview`.

1. Build the preview from current values.
2. Show target cells, original values, proposed values, note appends, and conflicts.
3. Ask for explicit confirmation.
4. Re-read every target cell and reject a stale preview.
5. Write grouped ranges with `+cells-set`.
6. Re-read and verify every written range.
7. Log success or partial failure.

Run writes serially. If Feishu returns `90217 too many request`, re-read target ranges before retrying. Do not assume that a failed batch wrote nothing.

Example shape:

```bash
lark-cli sheets +cells-set --url "<url>" --sheet-id "<sheetId>" --range "D7:G7" --cells -
```

Pass the JSON cell matrix through stdin. If a failure cannot be logged to Feishu, write a local recovery record next to the local profile and surface it before later writes.

## Export

```bash
lark-cli sheets +workbook-export --url "<url>" --file-extension xlsx --output-path "./family-finance-backup.xlsx"
```

Report-only export is an enhanced flow: export first, then remove or filter system sheets only when the environment already has the required tooling.
