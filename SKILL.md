---
name: family-finance-suite
description: Use when users need family finance ledger setup, environment initialization, monthly updates, import/export, Feishu spreadsheet operations, health checks, asset/debt structure analysis, or planning from the family-finance skill suite.
---

# Family Finance Suite

## Overview

This repository root is the installable entry skill. Some skill installers and discovery tools expect a SKILL.md at the repository root, so start here and then load the focused skill under `skills/` for the actual workflow.

The detailed suite router also exists at `skills/family-finance-suite/SKILL.md`. Keep this root entry concise and use it as the top-level compatibility shim plus routing map.

## Route By Intent

- `family-finance-environment`: missing Node.js/npm/npx/`lark-cli`, Feishu auth, PATH, installation, or first-run runtime diagnosis.
- `family-finance`: write-capable ledger lifecycle, Feishu setup/recovery, monthly updates, imports, exports, templates, local profile, write previews, and confirmations.
- `family-finance-health-check`: read-only health review, cash-flow check, savings rate, spending anomalies, and emergency-fund check.
- `family-finance-structure-analysis`: read-only assets, debts, defense/Beta/Alpha allocation, liquidity, leverage, concentration, and payoff priority.
- `family-finance-planning`: read-only budgets, future scenarios, rebalancing ranges, debt payoff planning, risk cases, and broad Beta-layer examples.

For mixed requests, handle environment problems first, then stateful ledger work, then read-only analysis.

## Required Rule

Only `family-finance` may write to Feishu or local profile state, and only after preview, explicit confirmation, stale-check read, and post-write verification. All analysis skills are read-only. If the user asks to save analysis results or assumptions, route the save through `family-finance`.

## Shared Resources

Shared scripts, references, and assets live under `skills/family-finance/`:

- `scripts/check-env.sh`: bootstrap environment check that works even when Node.js is missing.
- `scripts/check-env.mjs`: strict Node.js and `lark-cli` check.
- `assets/family-finance-template.xlsx` and `assets/family-finance-template.manifest.json`: local generalized template.
- `references/data-model.md`, `references/manifest.md`, `references/lark-cli-workflows.md`, and `references/template-policy.md`: schemas, reconstruction rules, Feishu workflows, and privacy policy.

Do not duplicate these resources into sub-skills; load only the specific file needed.
