import type { StrategyResult } from '../types.ts';

export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;

  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const recent = changes.slice(-period);

  const gains = recent.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(recent.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;

  if (losses === 0) return 100;
  if (gains === 0) return 0;
  return 100 - 100 / (1 + gains / losses);
}

export function rsiSignal(prices: number[], period = 14): StrategyResult {
  const rsi = calculateRSI(prices, period);
  const direction = rsi < 30 ? 'BUY' : rsi > 70 ? 'SELL' : 'HOLD';
  return { direction, value: rsi };
}
