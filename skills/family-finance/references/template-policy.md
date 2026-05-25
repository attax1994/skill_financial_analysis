# Template Policy

The installed skill must be self-contained. The original Feishu template is a development source only.

## Local Assets

- `assets/family-finance-template.xlsx`: generalized local workbook.
- `assets/family-finance-template.manifest.json`: source of truth for field mapping and reconstruction.

## Generalization Rules

Preserve:

- Table structure.
- Headers.
- Generic instructions.
- Formulas.
- Basic styles.
- Frozen rows/columns.
- Generic asset/debt category examples.

Remove or replace:

- Real personal amounts.
- Personal account names.
- Employer-specific holdings.
- Specific car/house/product names.
- Source spreadsheet tokens or URLs.

Use generic labels such as:

- `成员A工资`, `成员B工资`
- `公司股权/RSU`
- `车辆资产`
- `贷款备还金`
- `宽基基金账户`
- `海外指数账户`

## Privacy Rules

- Treat all user finance data as private.
- Do not store raw auth material anywhere.
- Full backups include system metadata.
- Report-only exports should omit `_config`, `_imports`, and raw profile metadata by default.

## Template Verification

Before shipping or regenerating the template, inspect the `.xlsx` contents for known personal labels from the source template and verify that formulas still exist in worksheet XML.
