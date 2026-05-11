import type { StrategyResult } from '../types.ts';
import { calculateEMA } from './ema.ts';

export function macdSignal(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): StrategyResult {
  if (prices.length < slowPeriod + signalPeriod) return { direction: 'HOLD', value: 0 };

  const fastEmas = calculateEMA(prices, fastPeriod);
  const slowEmas = calculateEMA(prices, slowPeriod);
  const macdLine = fastEmas.map((f, i) => f - slowEmas[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);

  const n = prices.length - 1;
  const lastDiff = macdLine[n] - signalLine[n];
  const prevDiff = macdLine[n - 1] - signalLine[n - 1];

  let direction: StrategyResult['direction'] = 'HOLD';
  if (prevDiff <= 0 && lastDiff > 0) direction = 'BUY';
  else if (prevDiff >= 0 && lastDiff < 0) direction = 'SELL';

  return { direction, value: lastDiff };
}
