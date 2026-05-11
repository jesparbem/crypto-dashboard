import { describe, it, expect } from 'bun:test';
import { calculateRSI, rsiSignal } from '../../src/strategies/rsi.ts';

describe('calculateRSI', () => {
  it('returns 50 when not enough data', () => {
    expect(calculateRSI([100, 101, 102], 14)).toBe(50);
  });

  it('returns 100 when all gains', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(calculateRSI(prices, 14)).toBe(100);
  });

  it('returns 0 when all losses', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(calculateRSI(prices, 14)).toBe(0);
  });

  it('returns value between 0 and 100 for mixed prices', () => {
    const prices = [100, 102, 98, 103, 99, 105, 101, 107, 103, 109, 105, 111, 107, 113, 109];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBeGreaterThan(0);
    expect(rsi).toBeLessThan(100);
  });
});

describe('rsiSignal', () => {
  it('returns BUY when RSI < 30', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 - i * 2);
    expect(rsiSignal(prices, 14).direction).toBe('BUY');
  });

  it('returns SELL when RSI > 70', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
    expect(rsiSignal(prices, 14).direction).toBe('SELL');
  });

  it('returns HOLD for neutral RSI', () => {
    const prices = [100, 102, 98, 103, 99, 105, 101, 107, 103, 109, 105, 111, 107, 113, 109];
    expect(rsiSignal(prices, 14).direction).toBe('HOLD');
  });
});
