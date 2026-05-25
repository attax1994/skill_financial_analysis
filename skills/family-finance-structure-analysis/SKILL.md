---
name: family-finance-structure-analysis
description: Use when the user asks whether household assets, debts, liquidity, defense/Beta/Alpha allocation, target allocation drift, concentration, leverage, or repayment priorities are reasonable based on a family-finance ledger.
---

# Family Finance Structure Analysis

## Overview

Analyze the structure of a family-finance ledger: assets, liabilities, allocation layers, concentration, liquidity, and debt pressure. This skill is read-only; do not write analysis or assumptions back to Feishu.

## Required Context

1. Locate the main `family-finance` skill.
2. Read `family-finance/references/data-model.md` for shared schemas.
3. Read the latest annual balance sheet and optional `_snapshots`.
4. Read target allocation settings from the local profile or `_config`.

If sheet names or mappings look inconsistent, ask the main `family-finance` workflow to recover/validate the profile first.

## Analysis Scope

Cover:

- Defense, Beta, Alpha, and non-current asset shares.
- Drift from target allocation.
- Cash and short-duration assets versus emergency-fund needs.
- Debt balances, rates, and payoff priority.
- Asset concentration and illiquidity.
- Whether the latest balance sheet and cashflow story agree.

Do not give individual stock buy/sell calls. If the user asks for future budgets or scenario planning, route to `family-finance-planning`.

## Output Shape

1. Structure verdict.
2. Allocation table with current and target percentages.
3. Debt and liquidity observations.
4. Concentration or mismatch risks.
5. Suggested next review questions or data fixes.

Use plain language but keep the numbers visible.
