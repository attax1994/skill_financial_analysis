# Remote Template V2 Design

## Goal

Upgrade the repository-local family-finance template and its schema infrastructure so new ledgers use the current remote workbook structure without copying private balances, account names, or other personal data.

## Product Decisions

- Keep the cashflow sheet understandable to non-accountants. Use the current labels such as `现金结余`, `现金流结余`, `资产转化`, and `资产赎回`.
- Do not store opening or ending cash balances. The omission is a privacy boundary, not missing data. `现金结余` reports income less spending; `现金流结余` reports the cash change after asset conversions and redemptions.
- Treat the annual sheet as a rolling actuals view. It may begin as a projection and be overwritten with actual monthly values. Do not add budget-versus-actual columns. A future budget feature belongs on a separate sheet.
- Do not pre-create detailed accounting categories for transactions that do not yet exist or cannot be tracked reliably. Keep numeric `other` fields paired with notes.
- Preserve the local template's generalized labels. The remote workbook is the structural and formula target, not a source of personal values.

## V2 Cashflow Contract

Use the remote sheet's `A:AI` structure with input blocks separated from formulas:

1. `D:G`: cash income — member A salary, member B salary, other income, note.
2. `I:L`: spending — fixed, flexible, special, note.
3. `N:R`: non-cash asset changes — company equity units, calculated equity amount, asset income, asset loss, note.
4. `T:W`: calculated operating surplus and net-asset increase — monthly and cumulative.
5. `Z:AB`: cash-to-asset conversions — recurring, other, note.
6. `AD:AF`: asset-to-cash redemptions — recurring, other, note.
7. `AH:AI`: calculated monthly and cumulative cash changes.

Monthly formulas must express these identities:

- `本行收支 = cash income - spending`
- `本行资产 = 本行收支 + equity amount + asset income - asset loss`
- `本行现金流 = 本行收支 - asset conversion + asset redemption`

The template intentionally leaves personal values blank, including RSU price, opening cash, target cash, and monthly data. Formula regions remain protected from generated writes.

## V2 Balance Contract

Use the remote `A:M` layout as the semantic target: debts, liquid assets grouped by Defense/Beta/Alpha, non-current assets, current/target allocations, totals, and net assets. Retain generalized item labels from the local template. Expand the seed rows so each layer can represent the remote structure without copying personal product names.

Target allocations remain configurable profile data. Template defaults stay generalized; they are not copied from the user's live workbook.

## Schema And Automation Changes

- Bump `schema_version` and `template_version` to `2.0.0`.
- Move all existing cashflow field mappings to their v2 columns.
- Add an `asset_redemption` section to `MonthlySnapshot`, validation note rules, field mappings, writable ranges, and write previews.
- Update formula protection ranges for the v2 calculated blocks.
- Keep stable field keys where semantics did not change, so existing structured inputs still work.
- Update references and main skill instructions so future agents understand the rolling-actuals model, privacy boundary, and distinction between conversion/redemption and income/spending.

## XLSX Generation

Continue generating `family-finance-template.xlsx` from the manifest. Extend the generator to preserve manifest-declared merged cells, styles, dimensions, frozen panes, and column widths required by the v2 templates. The generated XLSX must be reproducible and contain no live values or identifiers.

## Testing And Verification

1. Add failing tests for v2 versions, column mappings, asset redemption, formulas, writable/protected ranges, and generalized balance rows.
2. Add generator tests that inspect the XLSX XML for the v2 dimensions, formulas, merges, and absence of known private labels/values.
3. Run the focused tests red, implement the minimum changes, regenerate the XLSX, then run the complete suite.
4. Compare the generated template contract against the remote sheet structure read on 2026-09-07. Do not write to the remote workbook.

## Non-Goals

- No changes to the live Feishu workbook.
- No budget-versus-actual worksheet in this migration.
- No opening/ending cash balance fields.
- No detailed formal accounting taxonomy or transaction-level ledger.
- No migration of personal balances or account/product names into repository assets.
