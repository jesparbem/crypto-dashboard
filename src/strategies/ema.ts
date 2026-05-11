import type { StrategyResult } from '../types.ts';

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emas.push(prices[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

export function emaSignal(prices: number[], shortPeriod = 9, longPeriod = 21): StrategyResult {
  if (prices.length < longPeriod + 2) return { direction: 'HOLD', value: 0 };

  const shortEmas = calculateEMA(prices, shortPeriod);
  const longEmas = calculateEMA(prices, longPeriod);
  const n = prices.length - 1;

  const lastDiff = shortEmas[n] - longEmas[n];
  const prevDiff = shortEmas[n - 1] - longEmas[n - 1];

  let direction: StrategyResult['direction'] = 'HOLD';
  if (prevDiff <= 0 && lastDiff > 0) direction = 'BUY';
  else if (prevDiff >= 0 && lastDiff < 0) direction = 'SELL';

  return { direction, value: lastDiff };
}
