# Data Model

Use these contracts across natural language parsing, JSON import, write previews, and read-only analysis.

## Units

- Default amount unit: `wan` (万元).
- Supported input units: `wan`, `yuan`, `thousand_yuan`, plus Chinese aliases `万元`, `元`, `千元`.
- Store normalized ledger numbers in 万元.
- Keep `null` as unknown/not provided; keep `0` as explicit zero.
- Negative values are allowed only with a paired explanation note.
- Default currency is `CNY`. Non-CNY inputs require an exchange-rate assumption in the preview.

## FamilyFinanceProfile

```json
{
  "profile_id": "demo-family",
  "display_name": "家庭财务",
  "spreadsheet_token": "sht_xxx",
  "spreadsheet_url": "https://my.feishu.cn/sheets/sht_xxx",
  "template_version": "2.0.0",
  "schema_version": "2.0.0",
  "unit": "wan",
  "currency": "CNY",
  "years": {
    "2026": {
      "cashflow_sheet_id": "cash2026",
      "balance_sheet_id": "bal2026"
    }
  },
  "display_labels": {
    "member_a_salary": "成员A工资",
    "member_b_salary": "成员B工资"
  },
  "targets": {
    "defense": 0.4,
    "beta": 0.4,
    "alpha": 0.2
  }
}
```

Profile data is private but not secret. It may store document identifiers and mappings; it must never store auth tokens, refresh tokens, app secrets, cookies, or keychain output.

Before generating a write preview, compare any profile `template_version` and `schema_version` with the active manifest. Reject explicit mismatches and verify or migrate the ledger before writing; a v1 profile must never be written with v2 column mappings.

## MonthlySnapshot

```json
{
  "month": "2026-05",
  "currency": "CNY",
  "cashflow": {
    "income": {
      "member_a_salary": { "value": 58000, "unit": "yuan" },
      "member_b_salary": 2.7,
      "other_income": 0.8,
      "income_note": "退税"
    },
    "expense": {
      "fixed_expense": 0.3,
      "flexible_expense": 1.5,
      "special_expense": 0.8,
      "expense_note": "车险"
    },
    "asset_conversion": {
      "recurring_conversion": 0.8,
      "other_conversion": 2,
      "asset_conversion_note": "长期账户入金"
    },
    "asset_redemption": {
      "recurring_redemption": 0.24,
      "other_redemption": 5,
      "asset_redemption_note": "提取公积金"
    },
    "asset_change": {
      "equity_units": 10,
      "asset_income": 0.5,
      "asset_loss": 0.2,
      "asset_change_note": "公积金入账 0.5；车辆折旧 0.2"
    }
  },
  "unresolved_items": []
}
```

`income` only contains cash income. Employer benefits such as housing-fund contributions that increase assets without entering a cash account belong in `asset_change.asset_income`. `asset_conversion` records cash moved into assets or used to repay principal; `asset_redemption` records assets converted back into cash. Conversions and redemptions change cash composition but do not directly change net assets.

Schema v2 no longer maps the v1 field `income.housing_fund`. Treat it as unresolved input with preview status `needs_resolution` and move the amount to `asset_change.asset_income` with an explanatory note; never silently write it into a cash-income column.

## WritePreview

`WritePreview` is the required safety boundary before writes.

```json
{
  "preview_id": "hash",
  "profile_id": "demo-family",
  "spreadsheet_token": "sht_xxx",
  "month": "2026-05",
  "read_revision": 12,
  "status": "needs_confirmation",
  "writes": [
    {
      "field_path": "cashflow.income.member_a_salary",
      "label": "成员A工资",
      "kind": "number",
      "range": "cash2026!B7",
      "original_value": 5.1,
      "value": 5.8,
      "conflict": true,
      "merge_strategy": "overwrite"
    }
  ],
  "unresolved_items": []
}
```

Before writing, re-read all `range` values and compare them with `original_value`. If any changed, reject the preview as stale.

`WritePreview.status` is `needs_resolution` when any field is unmapped, `needs_confirmation` when mapped numeric values conflict with existing cells, and `ready_for_confirmation` otherwise. Never execute a preview with unresolved fields.

## Validation Errors

Use this shape:

```json
{
  "code": "NEGATIVE_REQUIRES_NOTE",
  "path": "cashflow.expense.special_expense",
  "message": "Negative financial values require an explanation note.",
  "severity": "error",
  "suggested_fix": "Add expense_note."
}
```

## Rebalance Contracts

Used by `family-finance-rebalance` and `scripts/plan-contribution.mjs`. These are standalone rebalance inputs, not ledger state: amounts stay in the user's own currency and are not normalized to 万元.

### RebalanceTargets

Persisted locally at `.family-finance-rebalance/rebalance-targets.json` (git-ignored scratch file).

```json
{
  "currency": "USD",
  "default_mode": "no_sell",
  "targets": [
    { "ticker": "VOO", "weight": 0.6 },
    { "ticker": "QQQ", "weight": 0.4 }
  ]
}
```

### ContributionPlanRequest

```json
{
  "currency": "USD",
  "mode": "no_sell",
  "contribution": 5000,
  "holdings": [
    { "ticker": "VOO", "value": 12000, "target_weight": 0.6 },
    { "ticker": "QQQ", "value": 8000, "target_weight": 0.4 }
  ]
}
```

- `mode`: `no_sell` (default, buy-only) or `exact` (allow suggested sells).
- `contribution`: run-time amount; never hard-coded.
- `target_weight`: fractions summing to ~1 or percents summing to ~100.

### ContributionPlanResult

```json
{
  "ok": true,
  "currency": "USD",
  "mode": "no_sell",
  "total_current_value": 20000,
  "contribution": 5000,
  "total_value_after": 25000,
  "total_buy": 5000,
  "flags": ["cannot_fully_rebalance"],
  "items": [
    {
      "ticker": "VOO",
      "current_value": 12000,
      "current_weight": 0.6,
      "target_weight": 0.6,
      "target_value_after": 15000,
      "gap": 3000,
      "buy": 3000,
      "value_after": 15000,
      "weight_after": 0.6,
      "action": "buy"
    }
  ]
}
```

`Σbuy` always equals `contribution`; the rounding residual is folded into the largest buy.
