import { describe, it, expect } from 'bun:test';
import { macdSignal } from '../../src/strategies/macd.ts';

describe('macdSignal', () => {
  it('returns HOLD when not enough data', () => {
    expect(macdSignal([100, 101, 102], 12, 26, 9).direction).toBe('HOLD');
  });

  it('returns BUY on bullish crossover', () => {
    // Decline pushes MACD below signal, then spike crosses it back up
    const declining = Array.from({ length: 50 }, (_, i) => 100 - i * 0.5);
    const prices = [...declining, 300];
    expect(macdSignal(prices, 12, 26, 9).direction).toBe('BUY');
  });

  it('returns SELL on bearish crossover', () => {
    // Rise pushes MACD above signal, then crash crosses it back down
    const rising = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const prices = [...rising, 1];
    expect(macdSignal(prices, 12, 26, 9).direction).toBe('SELL');
  });
});
