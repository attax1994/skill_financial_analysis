# Manifest Contract

The manifest at `assets/family-finance-template.manifest.json` is the field map and the renderable template source of truth. The current `schema_version` and `template_version` are `2.0.0`.

## Required Sections

- `schema_version`, `template_version`
- `unit_policy`, `annual_sheet_naming`, `sheets`, `month_rows`
- `field_mappings`, `writable_ranges`, `protected_ranges`
- `renderable_templates`

## V2 Cashflow Mapping

Stable keys are separate from user-facing labels. The v2 blocks are:

| Section | Range | Meaning |
| --- | --- | --- |
| `income` | `D3:G14` | Cash salary and other cash income |
| `expense` | `I3:L14` | Fixed, flexible, and special spending |
| `asset_change` | `N3:N14`, `P3:R14` | Equity units plus non-cash asset income/loss; `O` is formula-protected |
| `asset_conversion` | `Z3:AB14` | Cash converted into assets or debt principal repayments |
| `asset_redemption` | `AD3:AF14` | Assets redeemed or sold back into cash |

Supported `kind` values are `number`, `note`, and `formula`. Formula mappings are never user-writable. A numeric `other` field must remain paired with its note field.

The cashflow sheet intentionally has no opening or ending cash-balance field. `现金结余` is income less spending; `现金净增加额` also includes asset conversions and redemptions.

## Renderable Templates

Each template contains enough information to rebuild a usable sheet:

- `sheet_title`, `dimensions`, `frozen_row_count`, `frozen_column_count`
- `values`, with formulas represented as strings starting with `=`
- `merges`, `styles`, `column_widths`, `default_row_height`, and `dropdowns` where relevant

`scripts/generate-template-xlsx.mjs` consumes the same metadata, so the XLSX asset and manifest reconstruction path stay aligned. Column widths in the manifest use Feishu pixel units; the XLSX generator converts them to Excel character widths.

## Range Safety

Writable and protected ranges must not overlap. Keep all formula and summary cells in `protected_ranges`. Any schema version change must update field mappings, writable ranges, protected ranges, renderable formulas, references, tests, and the generated XLSX together.

The reusable balance template keeps the default `40% Defense / 40% Beta / 20% Alpha`. A live ledger may override those targets without changing the reusable template default.

## Annual Rollover

Preferred path:

1. Copy `_template_cashflow` to `<year>现金流`.
2. Copy `_template_balance` to `<year>资产负债`.
3. Verify formulas, merges, dimensions, and writable/protected ranges.
4. Update `_config` only after verification.

Fallback path:

1. Create sheets from `renderable_templates`.
2. Write values and formulas.
3. Apply frozen dimensions, styles, merges, column widths, and dropdowns.
4. Re-read the constructed sheets and verify them before accepting writes.
