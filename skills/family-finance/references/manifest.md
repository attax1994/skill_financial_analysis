# Manifest Contract

The manifest is both a field map and a renderable template definition. It lives at `assets/family-finance-template.manifest.json`.

## Required Sections

- `schema_version`, `template_version`
- `unit_policy`
- `annual_sheet_naming`
- `sheets`
- `month_rows`
- `field_mappings`
- `writable_ranges`
- `protected_ranges`
- `renderable_templates`

## Field Mappings

Field mappings use stable keys separate from user-facing labels:

```json
{
  "member_a_salary": {
    "column": "B",
    "kind": "number",
    "label": "成员A工资"
  }
}
```

Supported `kind` values:

- `number`: user-writable numeric value.
- `note`: user-writable text field; append by default.
- `formula`: protected formula; never write directly.

## Renderable Templates

Each renderable template must include enough detail to rebuild a usable Feishu sheet if copy-based annual rollover fails:

- `sheet_title`
- `dimensions`
- `frozen_row_count`
- `frozen_column_count`
- `values`, including formulas as strings starting with `=`
- `merges`
- `styles`
- `dropdowns`

The local `.xlsx` generator also reads this section.

## Range Safety

Writable and protected ranges must not overlap. Formula ranges belong in `protected_ranges`. Scripts should reject writes into formula mappings or protected ranges.

## Annual Rollover

Preferred path:

1. Copy `_template_cashflow` to `<year>现金流`.
2. Copy `_template_balance` to `<year>资产负债`.
3. Verify formulas, metadata, and writable/protected ranges.
4. Update `_config`.

Fallback path:

1. Create sheets from `renderable_templates`.
2. Write values and formulas.
3. Apply metadata, styles, merges, dimensions, dropdowns as supported by `lark-cli`.
4. Verify before accepting writes.
