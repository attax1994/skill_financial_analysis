import assert from 'node:assert/strict';
import test from 'node:test';

import {
  planContribution,
  validateContributionRequest
} from '../skills/family-finance/scripts/plan-contribution.mjs';

const sumBuys = (result) => result.items.reduce((total, item) => total + item.buy, 0);

test('exact mode lands on target weights and shows negative sells for overweight', () => {
  const result = planContribution({
    mode: 'exact',
    contribution: 5000,
    holdings: [
      { ticker: 'VOO', value: 12000, target_weight: 0.5 },
      { ticker: 'QQQ', value: 3000, target_weight: 0.5 }
    ]
  });

  assert.equal(result.ok, true);
  // V=15000, V'=20000, targets = 10000 each. VOO gap=-2000 (sell), QQQ gap=+7000.
  const voo = result.items.find((item) => item.ticker === 'VOO');
  const qqq = result.items.find((item) => item.ticker === 'QQQ');
  assert.equal(voo.buy, -2000);
  assert.equal(voo.action, 'sell');
  assert.equal(qqq.buy, 7000);
  assert.ok(result.flags.includes('sell_suggested'));
  assert.equal(Math.round(sumBuys(result) * 100) / 100, 5000);
  assert.equal(result.total_buy, 5000);
});

test('no_sell partial fill never sells and never overshoots the contribution', () => {
  const result = planContribution({
    contribution: 3000,
    holdings: [
      { ticker: 'VOO', value: 12000, target_weight: 0.5 },
      { ticker: 'QQQ', value: 3000, target_weight: 0.5 }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'no_sell');
  // V=15000, V'=18000, targets=9000. VOO gap=-3000 -> hold, QQQ gap=+6000.
  const voo = result.items.find((item) => item.ticker === 'VOO');
  const qqq = result.items.find((item) => item.ticker === 'QQQ');
  assert.equal(voo.buy, 0);
  assert.equal(voo.action, 'hold');
  assert.equal(qqq.buy, 3000);
  assert.ok(result.flags.includes('cannot_fully_rebalance'));
  assert.ok(result.flags.includes('overweight_held_no_sell'));
  assert.equal(result.total_buy, 3000);
});

test('no_sell proportional split across multiple under-target tickers', () => {
  const result = planContribution({
    contribution: 3000,
    holdings: [
      { ticker: 'A', value: 0, target_weight: 0.5 },
      { ticker: 'B', value: 0, target_weight: 0.5 }
    ]
  });

  // Both start at 0, equal weights -> split evenly, sum = C.
  assert.equal(result.items[0].buy, 1500);
  assert.equal(result.items[1].buy, 1500);
  assert.equal(result.total_buy, 3000);
});

test('no_sell closes every gap exactly when the contribution equals the total gap', () => {
  const result = planContribution({
    contribution: 10000,
    holdings: [
      { ticker: 'VOO', value: 6000, target_weight: 0.6 },
      { ticker: 'QQQ', value: 4000, target_weight: 0.4 }
    ]
  });

  // V=10000, V'=20000, targets: VOO=12000 (gap 6000), QQQ=8000 (gap 4000).
  // Positive gap sum = 10000 = C exactly, so buys equal the gaps.
  const voo = result.items.find((item) => item.ticker === 'VOO');
  const qqq = result.items.find((item) => item.ticker === 'QQQ');
  assert.equal(voo.buy, 6000);
  assert.equal(qqq.buy, 4000);
  assert.equal(result.total_buy, 10000);
  assert.ok(!result.flags.includes('cannot_fully_rebalance'));
});

test('no_sell fully rebalances (no cannot flag) when nothing is overweight', () => {
  const result = planContribution({
    contribution: 20000,
    holdings: [
      { ticker: 'VOO', value: 6000, target_weight: 0.6 },
      { ticker: 'QQQ', value: 4000, target_weight: 0.4 }
    ]
  });

  // No ticker is overweight, so C closes every gap exactly: Σgap = C = 20000.
  assert.equal(result.total_buy, 20000);
  assert.ok(!result.flags.includes('cannot_fully_rebalance'));
  assert.ok(!result.flags.includes('overweight_held_no_sell'));
});

test('target-amount invariant: positive-gap sum is never below the contribution', () => {
  // With Σw = 1 and no cash bucket, Σgap = C, so the positive-gap sum always
  // exceeds C whenever any ticker is overweight. no_sell can then only fill
  // partially, never overshoot. This case keeps VOO heavily overweight.
  const result = planContribution({
    contribution: 30000,
    holdings: [
      { ticker: 'VOO', value: 100000, target_weight: 0.5 },
      { ticker: 'QQQ', value: 0, target_weight: 0.5 }
    ]
  });

  const voo = result.items.find((item) => item.ticker === 'VOO');
  const qqq = result.items.find((item) => item.ticker === 'QQQ');
  assert.equal(voo.buy, 0);
  assert.equal(qqq.buy, 30000);
  assert.equal(result.total_buy, 30000);
  assert.ok(result.flags.includes('cannot_fully_rebalance'));
  assert.ok(result.flags.includes('overweight_held_no_sell'));
});

test('percent-scale target weights are accepted', () => {
  const result = planContribution({
    contribution: 1000,
    holdings: [
      { ticker: 'A', value: 0, target_weight: 60 },
      { ticker: 'B', value: 0, target_weight: 40 }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.items[0].target_weight, 0.6);
  assert.equal(result.items[0].buy, 600);
  assert.equal(result.items[1].buy, 400);
  assert.equal(result.total_buy, 1000);
});

test('rounding residual is folded so the plan is penny-exact', () => {
  const result = planContribution({
    contribution: 100,
    holdings: [
      { ticker: 'A', value: 0, target_weight: 1 / 3 },
      { ticker: 'B', value: 0, target_weight: 1 / 3 },
      { ticker: 'C', value: 0, target_weight: 1 / 3 }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.total_buy, 100);
  const buySum = result.items.reduce((total, item) => total + item.buy, 0);
  assert.equal(Math.round(buySum * 100) / 100, 100);
});

test('tickers outside the target table default to weight zero', () => {
  const noSell = planContribution({
    contribution: 1000,
    holdings: [
      { ticker: 'LEGACY', value: 5000, target_weight: 0 },
      { ticker: 'VOO', value: 0, target_weight: 1 }
    ]
  });

  const legacy = noSell.items.find((item) => item.ticker === 'LEGACY');
  assert.equal(legacy.buy, 0);
  assert.equal(legacy.action, 'hold');
  assert.equal(noSell.total_buy, 1000);

  const exact = planContribution({
    mode: 'exact',
    contribution: 1000,
    holdings: [
      { ticker: 'LEGACY', value: 5000, target_weight: 0 },
      { ticker: 'VOO', value: 0, target_weight: 1 }
    ]
  });
  const legacyExact = exact.items.find((item) => item.ticker === 'LEGACY');
  assert.equal(legacyExact.action, 'sell');
  assert.equal(exact.total_buy, 1000);
});

test('validation rejects empty holdings', () => {
  const result = validateContributionRequest({ contribution: 1000, holdings: [] });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'EMPTY_HOLDINGS');
});

test('validation rejects negative holding value', () => {
  const result = validateContributionRequest({
    contribution: 1000,
    holdings: [{ ticker: 'A', value: -1, target_weight: 1 }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.code === 'NEGATIVE_VALUE'));
});

test('validation rejects duplicate tickers', () => {
  const result = validateContributionRequest({
    contribution: 1000,
    holdings: [
      { ticker: 'A', value: 100, target_weight: 0.5 },
      { ticker: 'a', value: 100, target_weight: 0.5 }
    ]
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.code === 'DUPLICATE_TICKER'));
});

test('validation rejects weights that sum to neither 1 nor 100', () => {
  const result = validateContributionRequest({
    contribution: 1000,
    holdings: [
      { ticker: 'A', value: 100, target_weight: 0.5 },
      { ticker: 'B', value: 100, target_weight: 0.2 }
    ]
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.code === 'INVALID_WEIGHT_SUM'));
});

test('validation rejects invalid mode', () => {
  const result = validateContributionRequest({
    mode: 'panic',
    contribution: 1000,
    holdings: [{ ticker: 'A', value: 100, target_weight: 1 }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.code === 'INVALID_MODE'));
});

test('validation rejects non-positive contribution type', () => {
  const result = validateContributionRequest({
    contribution: 'lots',
    holdings: [{ ticker: 'A', value: 100, target_weight: 1 }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.code === 'INVALID_CONTRIBUTION'));
});
