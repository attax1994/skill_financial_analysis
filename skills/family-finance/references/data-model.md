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
  "template_version": "1.0.0",
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

## MonthlySnapshot

```json
{
  "month": "2026-05",
  "currency": "CNY",
  "cashflow": {
    "income": {
      "member_a_salary": { "value": 58000, "unit": "yuan" },
      "member_b_salary": 2.7,
      "housing_fund": 0.5,
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
    "asset_change": {
      "equity_units": 10,
      "asset_income": 0,
      "asset_loss": 0.2,
      "asset_change_note": "车辆折旧"
    }
  },
  "unresolved_items": []
}
```

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
