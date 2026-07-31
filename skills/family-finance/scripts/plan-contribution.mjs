#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const DEFAULT_PRECISION = 2;
const DEFAULT_MODE = 'no_sell';
const SUPPORTED_MODES = new Set(['no_sell', 'exact']);
const WEIGHT_SUM_TOLERANCE = 0.02;

// Target-amount rebalancing for monthly contributions.
//
// Given a contribution C, per-ticker current market values v_i, and per-ticker
// target weights w_i (Σw = 1), the post-contribution total is V' = V + C, each
// ticker's target amount is t_i = w_i · V', and the gap is gap_i = t_i − v_i.
//
// - no_sell (default): only buy under-target tickers; never sell. Fill the
//   positive gaps proportionally with C. Because Σgap = C when Σw = 1 and there
//   is no cash bucket, the positive-gap sum is always >= C, so C fully closes
//   the gaps only when no ticker is overweight; otherwise it fills partially.
// - exact: buy_i = gap_i, so over-target tickers show negative (sell) amounts
//   and the portfolio lands exactly on target weights.
//
// Σbuy always equals C. Amounts round to two decimals and the rounding residual
// is folded into the largest buy so the plan stays penny-exact.

export function validateContributionRequest(input) {
  const errors = [];

  const mode = input.mode ?? DEFAULT_MODE;
  if (!SUPPORTED_MODES.has(mode)) {
    errors.push(error('INVALID_MODE', 'mode', `Mode must be one of: ${[...SUPPORTED_MODES].join(', ')}.`, 'Use "no_sell" or "exact".'));
  }

  const contribution = input.contribution;
  if (typeof contribution !== 'number' || Number.isNaN(contribution) || contribution < 0) {
    errors.push(error('INVALID_CONTRIBUTION', 'contribution', 'Contribution must be a number greater than or equal to zero.', 'Provide the amount you invest this run, e.g. 5000.'));
  }

  const holdings = input.holdings;
  if (!Array.isArray(holdings) || holdings.length === 0) {
    errors.push(error('EMPTY_HOLDINGS', 'holdings', 'At least one holding is required.', 'Provide holdings like [{ "ticker": "VOO", "value": 12000, "target_weight": 0.6 }].'));
    return { ok: false, errors };
  }

  const seen = new Set();
  holdings.forEach((holding, index) => {
    const ticker = holding?.ticker;
    if (typeof ticker !== 'string' || ticker.trim() === '') {
      errors.push(error('INVALID_TICKER', `holdings[${index}].ticker`, 'Each holding needs a non-empty ticker.', 'Add a ticker symbol.'));
    } else {
      const key = ticker.trim().toUpperCase();
      if (seen.has(key)) {
        errors.push(error('DUPLICATE_TICKER', `holdings[${index}].ticker`, `Duplicate ticker: ${ticker}.`, 'Merge holdings so each ticker appears once.'));
      }
      seen.add(key);
    }

    const value = holding?.value;
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      errors.push(error('NEGATIVE_VALUE', `holdings[${index}].value`, 'Holding value must be a number greater than or equal to zero.', 'Provide the current market value of this holding.'));
    }

    const weight = holding?.target_weight;
    if (typeof weight !== 'number' || Number.isNaN(weight) || weight < 0) {
      errors.push(error('INVALID_WEIGHT', `holdings[${index}].target_weight`, 'Target weight must be a number greater than or equal to zero.', 'Provide a fraction (0.6) or percent (60).'));
    }
  });

  const weightSum = holdings.reduce((sum, holding) => sum + (typeof holding?.target_weight === 'number' && !Number.isNaN(holding.target_weight) ? holding.target_weight : 0), 0);
  if (detectWeightScale(weightSum) === null) {
    errors.push(error('INVALID_WEIGHT_SUM', 'holdings[].target_weight', `Target weights must sum to ~1 (fractions) or ~100 (percents); got ${round(weightSum, 4)}.`, 'Adjust weights so they sum to 1 or 100.'));
  }

  return { ok: errors.length === 0, errors };
}

export function planContribution(input) {
  const validation = validateContributionRequest(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const precision = input.precision ?? DEFAULT_PRECISION;
  const mode = input.mode ?? DEFAULT_MODE;
  const currency = input.currency ?? null;
  const contribution = input.contribution;

  const scale = detectWeightScale(input.holdings.reduce((sum, holding) => sum + holding.target_weight, 0));
  const items = input.holdings.map((holding) => ({
    ticker: holding.ticker.trim(),
    current_value: holding.value,
    target_weight: holding.target_weight / scale
  }));

  const totalCurrent = items.reduce((sum, item) => sum + item.current_value, 0);
  const totalAfter = totalCurrent + contribution;

  for (const item of items) {
    item.current_weight = totalCurrent > 0 ? item.current_value / totalCurrent : 0;
    item.target_value_after = item.target_weight * totalAfter;
    item.gap = item.target_value_after - item.current_value;
  }

  const rawBuys = mode === 'exact'
    ? computeExactBuys(items, contribution)
    : computeNoSellBuys(items, contribution);

  const buys = reconcileToContribution(rawBuys, contribution, precision);

  const flags = [];
  const positiveGap = items.reduce((sum, item) => sum + Math.max(item.gap, 0), 0);
  if (mode === 'no_sell') {
    // With Σw = 1 and no cash bucket, positive-gap sum >= C, so C fully closes
    // the gaps only when nothing is overweight; any overweight ticker means the
    // month cannot fully rebalance without selling.
    if (positiveGap > contribution + 1e-6) {
      flags.push('cannot_fully_rebalance');
    }
    if (items.some((item) => item.gap < -1e-9)) {
      flags.push('overweight_held_no_sell');
    }
  } else if (buys.some((buy) => buy < -1e-9)) {
    flags.push('sell_suggested');
  }

  const result = items.map((item, index) => {
    const buy = buys[index];
    const valueAfter = round(item.current_value + buy, precision);
    return {
      ticker: item.ticker,
      current_value: round(item.current_value, precision),
      current_weight: round(item.current_weight, 4),
      target_weight: round(item.target_weight, 4),
      target_value_after: round(item.target_value_after, precision),
      gap: round(item.gap, precision),
      buy,
      value_after: valueAfter,
      weight_after: totalAfter > 0 ? round(valueAfter / totalAfter, 4) : 0,
      action: buy > 1e-9 ? 'buy' : buy < -1e-9 ? 'sell' : 'hold'
    };
  });

  return {
    ok: true,
    currency,
    mode,
    total_current_value: round(totalCurrent, precision),
    contribution: round(contribution, precision),
    total_value_after: round(totalAfter, precision),
    total_buy: round(result.reduce((sum, item) => sum + item.buy, 0), precision),
    flags,
    items: result
  };
}

function computeExactBuys(items, contribution) {
  // Land exactly on target weights; overweight tickers get negative buys.
  return items.map((item) => item.gap);
}

function computeNoSellBuys(items, contribution) {
  const positiveGaps = items.map((item) => Math.max(item.gap, 0));
  const positiveGapSum = positiveGaps.reduce((sum, gap) => sum + gap, 0);
  if (positiveGapSum === 0) return items.map(() => 0);

  // Fill the under-target tickers proportional to their gaps. Cap at the gap so
  // a fully-fundable month lands exactly on target without overshooting.
  const fundable = Math.min(contribution, positiveGapSum);
  return positiveGaps.map((gap) => (gap / positiveGapSum) * fundable);
}

function reconcileToContribution(rawBuys, contribution, precision) {
  const rounded = rawBuys.map((buy) => round(buy, precision));
  const roundedSum = rounded.reduce((sum, buy) => sum + buy, 0);
  const residual = round(contribution - roundedSum, precision);
  if (residual === 0 || rounded.length === 0) return rounded;

  // Fold the rounding residual into the largest buy so Σbuy equals C exactly.
  let targetIndex = 0;
  for (let index = 1; index < rounded.length; index += 1) {
    if (rounded[index] > rounded[targetIndex]) targetIndex = index;
  }
  rounded[targetIndex] = round(rounded[targetIndex] + residual, precision);
  return rounded;
}

function detectWeightScale(weightSum) {
  if (Math.abs(weightSum - 1) <= WEIGHT_SUM_TOLERANCE) return 1;
  if (Math.abs(weightSum - 100) <= WEIGHT_SUM_TOLERANCE * 100) return 100;
  return null;
}

function round(value, precision) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function error(code, path, message, suggested_fix, severity = 'error') {
  return { code, path, message, severity, suggested_fix };
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find((arg) => !arg.startsWith('-'));
  const raw = inputPath ? await readFile(inputPath, 'utf8') : await readStdin();
  const parsed = JSON.parse(raw);
  const result = planContribution(parsed);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
