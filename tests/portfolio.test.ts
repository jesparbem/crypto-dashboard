import { describe, it, expect, beforeEach } from 'bun:test';
import { PaperPortfolio } from '../src/portfolio.ts';
import type { Crypto } from '../src/types.ts';

const btc: Crypto = { symbol: 'BTC', id: 'bitcoin', name: 'Bitcoin' };

describe('PaperPortfolio', () => {
  let p: PaperPortfolio;
  beforeEach(() => { p = new PaperPortfolio(250); });

  it('starts with initial capital', () => {
    expect(p.getState().capital).toBe(250);
  });

  it('buys a position reducing capital', () => {
    p.buy(btc, 'RSI', 50000, 0.10);
    expect(p.getState().capital).toBeCloseTo(225, 1);
    expect(p.getState().positions).toHaveLength(1);
  });

  it('ignores duplicate position for same crypto+strategy', () => {
    p.buy(btc, 'RSI', 50000, 0.10);
    p.buy(btc, 'RSI', 51000, 0.10);
    expect(p.getState().positions).toHaveLength(1);
  });

  it('allows same crypto with different strategy', () => {
    p.buy(btc, 'RSI', 50000, 0.10);
    p.buy(btc, 'EMA', 50000, 0.10);
    expect(p.getState().positions).toHaveLength(2);
  });

  it('sells position returning capital + profit', () => {
    p.buy(btc, 'RSI', 50000, 0.10);
    p.sell(btc, 'RSI', 60000);
    expect(p.getState().positions).toHaveLength(0);
    expect(p.getState().capital).toBeCloseTo(255, 1);
  });

  it('records win in strategy stats', () => {
    p.buy(btc, 'RSI', 50000, 0.10);
    p.sell(btc, 'RSI', 60000);
    expect(p.getState().strategyStats.RSI.wins).toBe(1);
    expect(p.getState().strategyStats.RSI.totalPnl).toBeCloseTo(5, 1);
  });

  it('records loss in strategy stats', () => {
    p.buy(btc, 'RSI', 50000, 0.10);
    p.sell(btc, 'RSI', 40000);
    expect(p.getState().strategyStats.RSI.losses).toBe(1);
    expect(p.getState().strategyStats.RSI.totalPnl).toBeCloseTo(-5, 1);
  });
});
