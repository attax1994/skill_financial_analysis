---
name: family-finance-suite
description: Use when users ask for family finance help without naming a specific sub-skill, or when a request may involve environment setup, ledger setup, monthly updates, import/export, health reviews, asset/debt structure analysis, or planning across the family-finance skill suite.
---

# Family Finance Suite

## Overview

This is the entry point for the family finance skill suite. Use it to choose the right specialized skill, keep shared context consistent, and avoid mixing write-capable ledger work with read-only analysis.

## Skill Map

- `family-finance-environment`: environment setup, missing Node.js/npm/npx, `lark-cli` installation, Feishu auth, PATH, and first-run diagnostics.
- `family-finance`: write-capable ledger lifecycle, Feishu setup/recovery, monthly updates, imports, exports, templates, local profile, write previews, and confirmations.
- `family-finance-health-check`: read-only monthly or annual health reviews, cash-flow checks, savings rate, spending anomalies, and emergency-fund checks.
- `family-finance-structure-analysis`: read-only asset/debt structure, defense/Beta/Alpha allocation, liquidity, leverage, concentration, and payoff priority analysis.
- `family-finance-planning`: read-only future planning, budgets, scenarios, rebalancing ranges, debt strategy, and broad Beta-layer examples.

## Routing

Start with the user's intent:

1. If the user reports missing Node.js, npm, npx, `lark-cli`, Feishu auth, PATH, installation, or first-run setup trouble, load `family-finance-environment`.
2. If the request creates, recovers, updates, imports, exports, or writes a ledger, load `family-finance` first.
3. If the user asks "健康吗", "这个月怎么样", savings rate, unusual spending, or cash safety buffer, load `family-finance-health-check`.
4. If the user asks whether assets, debts, liquidity, or allocation are reasonable, load `family-finance-structure-analysis`.
5. If the user asks what to do next, annual goals, future scenarios, budget targets, rebalancing, debt payoff, or risk cases, load `family-finance-planning`.
6. For mixed requests, run environment setup first if needed, then stateful `family-finance` work, then the relevant read-only analysis skill.

When in doubt, read only and ask one concise clarification before writing.

## Shared Context

All sub-skills use the main `family-finance` skill as the source of truth for:

- `references/data-model.md`: profile, monthly snapshot, balance snapshot, and write preview schemas.
- `references/manifest.md`: sheet roles, field mappings, protected ranges, and template reconstruction.
- `references/lark-cli-workflows.md`: Feishu read/write/create/export commands and permission handling.
- `references/template-policy.md`: local template privacy and generalization rules.
- `assets/family-finance-template.xlsx` and `assets/family-finance-template.manifest.json`: local template assets.
- `scripts/check-env.sh` and `scripts/check-env.mjs`: no-Node bootstrap and strict Node/lark-cli environment checks.

Do not duplicate those resources into analysis skills. Load only the specific reference needed for the task.

## Write Boundary

Only `family-finance` may write to Feishu or local profile state. Every write requires:

1. Environment check for Node.js 20, npm/npx, and `lark-cli >= 1.0.39`.
2. Current profile or `_config` recovery.
3. Read of existing target cells.
4. A preview showing ranges, original values, proposed values, conflicts, note appends, and unresolved items.
5. Explicit user confirmation.
6. A fresh stale-check read immediately before writing.
7. Post-write verification.

Analysis skills must stay read-only. If the user asks to save analysis results, assumptions, or plan outputs, route the save through `family-finance` and its preview/confirmation protocol.

## Financial Boundaries

- Treat all household finance data as private.
- Use ledger numbers first; make assumptions visible.
- Do not provide specific Alpha-layer individual stock buy/sell recommendations.
- Broad, diversified Beta-layer examples such as VOO or QQQ may be mentioned only as educational examples with risk, currency, and jurisdiction caveats.
- If current market context is needed, use sourced, dated data and keep it out of the ledger unless the user explicitly confirms a write through `family-finance`.
