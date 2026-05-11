import { describe, it, expect } from 'bun:test';
import { calculateEMA, emaSignal } from '../../src/strategies/ema.ts';

describe('calculateEMA', () => {
  it('returns empty array for empty input', () => {
    expect(calculateEMA([], 9)).toEqual([]);
  });

  it('starts with first price', () => {
    expect(calculateEMA([100, 110, 120], 2)[0]).toBe(100);
  });

  it('reacts upward to rising prices', () => {
    const prices = Array.from({ length: 10 }, (_, i) => 100 + i);
    const emas = calculateEMA(prices, 3);
    expect(emas.at(-1)!).toBeGreaterThan(emas[0]);
  });
});

describe('emaSignal', () => {
  it('returns HOLD when not enough data', () => {
    expect(emaSignal([100, 101, 102], 9, 21).direction).toBe('HOLD');
  });

  it('returns BUY when short EMA crosses above long EMA', () => {
    // Decline pushes EMA9 below EMA21, then a spike crosses it back up
    const declining = Array.from({ length: 30 }, (_, i) => 100 - i * 0.5);
    const prices = [...declining, 200];
    expect(emaSignal(prices, 9, 21).direction).toBe('BUY');
  });

  it('returns SELL when short EMA crosses below long EMA', () => {
    // Rise pushes EMA9 above EMA21, then a crash crosses it back down
    const rising = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5);
    const prices = [...rising, 1];
    expect(emaSignal(prices, 9, 21).direction).toBe('SELL');
  });
});
