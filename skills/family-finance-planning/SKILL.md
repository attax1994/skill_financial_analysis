---
name: family-finance-planning
description: Use when the user asks for household finance planning, future cash-flow scenarios, annual targets, budget planning, rebalancing ideas, debt payoff strategy, risk scenarios, or broad Beta-layer investment examples from a family-finance ledger.
---

# Family Finance Planning

## Overview

Plan future household finances from a `family-finance` ledger. This skill is read-only for ledger data; any request to save assumptions or results must route through the main `family-finance` skill and its preview/confirmation protocol.

## Required Context

1. Locate the main `family-finance` skill.
2. Read `family-finance/references/data-model.md` for shared schemas.
3. Read recent cashflow, latest balance sheet, optional `_snapshots`, target allocations, and user-stated goals.
4. Ask for risk tolerance, time horizon, liquidity needs, tax jurisdiction, and currency assumptions when they materially affect the plan.

## Planning Scope

Use this skill for:

- Future monthly or annual cash-flow scenarios.
- Budget targets and savings-rate goals.
- Emergency-fund and liquidity planning.
- Debt payoff ordering by rate, cash-flow pressure, and optionality.
- Rebalancing ranges for defense/Beta/Alpha layers.
- Risk scenarios such as income drop, large expense, market drawdown, or FX movement.

## Investment Advice Boundaries

Provide educational planning and low-complexity examples, not regulated personalized financial advice.

- Defense layer: discuss cash, deposits, money-market-like tools, short-duration bonds, and liquidity.
- Beta layer: broad diversified examples such as VOO or QQQ may be mentioned as examples, with risk and currency caveats.
- Alpha layer: do not recommend specific individual stocks or buy/sell calls. Discuss position limits, concentration, review discipline, and risk budget.

If the user asks for current market context, use web sources and cite source/date/assumptions. Do not save market data to the ledger unless routed through the main skill.

## Output Shape

1. Planning conclusion.
2. Assumptions and missing inputs.
3. Base case, conservative case, and stress case when useful.
4. Budget/rebalancing/debt actions.
5. Review cadence and next data to collect.

Tie suggestions to ledger numbers whenever possible.
