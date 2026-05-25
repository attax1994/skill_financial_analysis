---
name: family-finance-health-check
description: Use when the user asks for a monthly or annual family finance health review, cash-flow checkup, savings-rate review, emergency-fund check, spending anomaly review, or basic household finance diagnosis from a family-finance ledger.
---

# Family Finance Health Check

## Overview

Produce read-only health checks from a `family-finance` ledger. Do not write analysis results back to Feishu.

## Required Context

1. Locate the main `family-finance` skill.
2. Read `family-finance/references/data-model.md` for shared schemas.
3. Use the user's local profile or the ledger `_config` sheet to locate annual cashflow and balance sheets.
4. Read current ledger data with `lark-cli` or from user-provided exports.

If required data is missing, report what is missing instead of inventing values.

## Analysis Scope

Use this skill for:

- Monthly income, expenses, cash surplus, and savings rate.
- Cumulative cash flow and remaining cash.
- Emergency fund or cash safety buffer.
- Month-over-month anomalies.
- Basic net-worth movement when balance data is available.

Do not provide detailed allocation planning or investment product suggestions here. Route those to `family-finance-structure-analysis` or `family-finance-planning`.

## Output Shape

Keep the report concise and numeric:

1. Conclusion summary.
2. Key metrics.
3. Unusual income, spending, or cash-flow items.
4. Practical next actions.
5. Missing or uncertain data.

Prefer statements tied to ledger numbers, such as "本月储蓄率约 42%" or "现金安全垫约 8.5 个月". Make assumptions explicit.
