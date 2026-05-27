---
name: family-finance
description: Use when creating, updating, importing, exporting, recovering, or maintaining a Feishu-based family finance ledger from monthly summary data; when users provide income, expense, asset conversion, asset/debt, or monthly review data and need write previews, confirmations, Excel backups, or recurring family finance check-ins.
---

# Family Finance

## Overview

Maintain a long-running family finance ledger in Feishu Sheets from monthly summary data. Use the local template and manifest in this skill as the source of truth; never rely on the original online template after installation.

This main skill owns all stateful and write-capable workflows. The analysis sub-skills are read-only:

- `family-finance-environment`: first-run setup and dependency troubleshooting.
- `family-finance-health-check`: monthly financial health.
- `family-finance-structure-analysis`: asset/debt/allocation structure.
- `family-finance-planning`: budgets, scenarios, allocation and debt planning.

## First Steps

1. If this is first run, installation, or the user reports missing Node.js/npm/npx/`lark-cli`, route to `family-finance-environment`.
2. Run `scripts/check-env.sh` before Feishu operations; it works even when Node.js is missing.
3. If Node.js 20 is available, run `scripts/check-env.mjs` for the strict JSON check.
4. Confirm Node.js 20, npm/npx, `lark-cli >= 1.0.39`, and user identity are available.
5. Load local profile if present; otherwise recover from the ledger's `_config` sheet when the user provides a Feishu URL.
6. Read only until the user explicitly asks to create, update, import, export, or set reminders.

Read references as needed:

- `references/data-model.md`: canonical profile, snapshot, and preview schemas.
- `references/manifest.md`: template manifest and reconstruction rules.
- `references/lark-cli-workflows.md`: Feishu commands, permissions, and write safety.
- `references/template-policy.md`: local template privacy and generalization rules.

## Monthly Update Workflow

Use this flow for requests like "更新 2026 年 5 月家庭财务" or "这个月工资 5.8，弹性支出 1.5":

1. Parse the user's monthly summary into a `MonthlySnapshot`.
2. Normalize amounts to 万元. If no unit is provided, assume 万元.
3. Validate the snapshot with `scripts/validate-snapshot.mjs`.
4. Read existing target cells from Feishu.
5. Build a `WritePreview` with `scripts/build-write-preview.mjs`.
6. Show the preview: target month, fields, cells, original values, write values, conflicts, note appends, unresolved items.
7. Stop and ask for explicit confirmation before any write.
8. Immediately before writing, re-read target cells and reject stale previews if anything changed.
9. Write with `lark-cli sheets +write`, verify written ranges, and log partial failures.

Never silently overwrite existing numeric values. Explanation fields may append by default, but the final text must still be shown in the preview.

## Create Or Recover Ledger

For a new user ledger:

1. Use `assets/family-finance-template.xlsx` and `assets/family-finance-template.manifest.json`.
2. Prefer creating seed sheets and annual sheets from manifest-driven Feishu commands.
3. Create visible system sheets: `_config`, `_snapshots`, `_imports`, `_template_cashflow`, `_template_balance`.
4. Store only non-secret profile metadata in `_config`.

If local config is lost, ask the user for the Feishu spreadsheet URL, read `_config`, and rebuild the local profile. Do not store Feishu access tokens, refresh tokens, app secrets, cookies, or keychain material.

## Import And Export

For historical migration, accept JSON first. CSV/YAML/XLSX import is optional and may require extra npm dependencies; detect those only when the user requests that feature.

For Excel output:

- Full backup: use `lark-cli sheets +export` for the complete spreadsheet.
- Report-only: omit or de-emphasize `_config`, `_imports`, and other system metadata. Treat this as an optional enhanced flow unless the environment already has the needed dependencies.

## Reminder Flow

The skill may help create a monthly reminder when the environment supports automations and the user explicitly asks. Reminders only prompt the user to provide monthly data; they must not write financial data automatically.

## Safety Rules

- Treat financial data as private.
- Do not write to Feishu without a preview and explicit confirmation.
- Do not rely on stale previews; re-read target cells before writing.
- Do not write analysis results back to the ledger unless routed through this main skill and confirmed.
- Do not give specific Alpha-layer individual stock buy/sell recommendations; planning examples may use broad, diversified Beta-layer instruments only as examples.
