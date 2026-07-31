---
name: family-finance-rebalance
description: Use when the user runs a monthly or recurring contribution (定投 / dollar-cost averaging) and wants active rebalancing by the target-amount method — computing how much to buy of each holding so that, after adding this run's contribution, the portfolio moves toward its target weights. Trigger on 月度定投, 目标金额法, 主动再平衡, 反推每个标的应投入金额, target-amount rebalancing, DCA allocation, or "本月投入 X 应该怎么分配".
---

# Family Finance Rebalance

## Overview

Plan a single contribution across a set of holdings using the target-amount method. This skill is a self-contained, read-only calculator: it does not read or write the family finance ledger, and it does not fetch prices or recommend which securities to own. The user supplies the holdings, their current market values, the target weights, and the amount invested this run.

Core method, given contribution `C`, current values `v_i`, and target weights `w_i` (Σw = 1):

1. Post-contribution total: `V' = V + C` where `V = Σv_i`.
2. Each holding's target amount: `t_i = w_i · V'`.
3. Gap to target: `gap_i = t_i − v_i` (Σgap = C).

Because there is no cash bucket and `Σw = 1`, `Σgap` always equals `C`.

## Modes

- `no_sell` (default): only buy under-target holdings; never sell. Buys fill the positive gaps proportionally with `C`. If any holding is overweight, `C` cannot fully rebalance the portfolio in one month, so the fill is partial and the result is flagged `cannot_fully_rebalance` / `overweight_held_no_sell`. This matches the natural "只加仓不卖出" habit of monthly DCA.
- `exact`: `buy_i = gap_i`, so overweight holdings get negative buys (a suggested sell) and the portfolio lands exactly on target weights. Flagged `sell_suggested` when any sell appears.

`Σbuy` always equals `C`. Amounts round to two decimals and the rounding residual is folded into the largest buy so the plan is penny-exact.

## Inputs And Outputs

Run `../family-finance/scripts/plan-contribution.mjs` (shared script under the main skill). Pass a JSON request on stdin or as a file path:

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

- `contribution` is a run-time input, not a fixed number. Do not hard-code any amount.
- Currency passes through as-is; do not normalize to 万元 or apply the ledger unit policy.
- `target_weight` may be fractions summing to ~1 or percents summing to ~100; mixed or out-of-range sums raise `INVALID_WEIGHT_SUM`.
- Holdings not in the target table use `target_weight: 0`; `no_sell` leaves them untouched, `exact` suggests selling them down.

The result reports, per holding, `current_value`, `current_weight`, `target_weight`, `target_value_after`, `gap`, `buy`, `value_after`, `weight_after`, and `action` (`buy` / `hold` / `sell`), plus totals (`total_current_value`, `contribution`, `total_value_after`, `total_buy`, `mode`, `flags`).

## Persisted Target Weights

Monthly DCA reuses the same target weights, so store them locally to avoid re-typing them each month:

- Path: `.family-finance-rebalance/rebalance-targets.json` inside this repository.
- This is a local scratch file registered in `.gitignore`; it is never committed.
- Shape:

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

- On each run, load this file for the weights and `default_mode`, then ask the user only for the current market values and this run's contribution.
- If the file is missing, ask the user for the target weights once, run the plan, and offer to save them to this file for next month.
- This file is a standalone rebalance-only config, not ledger state. It is separate from the family-finance profile and Feishu ledger, so managing it here does not conflict with the suite rule that only `family-finance` writes ledger state.

## Boundaries

- Read-only with respect to the family finance ledger. To record a plan or resulting balances into the ledger, route the write through the main `family-finance` skill and its preview / confirmation protocol.
- Educational allocation math only. Broad diversified instruments (e.g. VOO, QQQ) may appear as examples; do not give individual-stock buy/sell recommendations. The user chooses the tickers and weights.
- If the user asks for qualitative rebalancing ranges or scenario planning instead of exact per-ticker amounts, route to `family-finance-planning`.
