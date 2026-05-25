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
