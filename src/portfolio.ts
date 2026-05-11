import { randomUUID } from 'crypto';
import type { Crypto, StrategyName, Position, Trade, PortfolioState, StrategyStats } from './types.ts';

type InternalStats = { wins: number; losses: number; totalPnl: number; totalGain: number; totalLoss: number };

export class PaperPortfolio {
  private capital: number;
  private readonly initialCapital: number;
  private positions = new Map<string, Position>();
  private recentTrades: Trade[] = [];
  private stats: Record<StrategyName, InternalStats> = {
    RSI:  { wins: 0, losses: 0, totalPnl: 0, totalGain: 0, totalLoss: 0 },
    EMA:  { wins: 0, losses: 0, totalPnl: 0, totalGain: 0, totalLoss: 0 },
    MACD: { wins: 0, losses: 0, totalPnl: 0, totalGain: 0, totalLoss: 0 },
  };

  constructor(initialCapital = 250) {
    this.capital = initialCapital;
    this.initialCapital = initialCapital;
  }

  buy(crypto: Crypto, strategy: StrategyName, price: number, fraction: number): Trade | null {
    const key = `${crypto.symbol}-${strategy}`;
    if (this.positions.has(key)) return null;

    const amount = this.capital * fraction;
    if (amount < 0.01) return null;

    const shares = amount / price;
    this.capital -= amount;
    this.positions.set(key, { crypto, strategy, entryPrice: price, shares, amountInvested: amount, timestamp: Date.now() });

    const trade: Trade = { id: randomUUID(), crypto, strategy, direction: 'BUY', price, amount, shares, timestamp: Date.now() };
    this.recentTrades = [trade, ...this.recentTrades].slice(0, 100);
    return trade;
  }

  sell(crypto: Crypto, strategy: StrategyName, price: number): Trade | null {
    const key = `${crypto.symbol}-${strategy}`;
    const pos = this.positions.get(key);
    if (!pos) return null;

    const exitAmount = pos.shares * price;
    const pnl = exitAmount - pos.amountInvested;
    this.capital += exitAmount;
    this.positions.delete(key);

    const s = this.stats[strategy];
    if (pnl >= 0) { s.wins++; s.totalGain += pnl; }
    else { s.losses++; s.totalLoss += Math.abs(pnl); }
    s.totalPnl += pnl;

    const trade: Trade = { id: randomUUID(), crypto, strategy, direction: 'SELL', price, amount: exitAmount, shares: pos.shares, timestamp: Date.now(), pnl };
    this.recentTrades = [trade, ...this.recentTrades].slice(0, 100);
    return trade;
  }

  getState(): PortfolioState {
    const positionValues = Array.from(this.positions.values()).reduce((s, p) => s + p.amountInvested, 0);
    const totalValue = this.capital + positionValues;
    const pnl = totalValue - this.initialCapital;

    const strategyStats = Object.fromEntries(
      (Object.entries(this.stats) as [StrategyName, InternalStats][]).map(([k, v]) => [
        k,
        {
          wins: v.wins,
          losses: v.losses,
          totalPnl: v.totalPnl,
          avgGain: v.wins > 0 ? v.totalGain / v.wins : 0,
          avgLoss: v.losses > 0 ? v.totalLoss / v.losses : 0,
        } satisfies StrategyStats,
      ])
    ) as Record<StrategyName, StrategyStats>;

    return {
      capital: this.capital,
      initialCapital: this.initialCapital,
      totalValue,
      positions: Array.from(this.positions.values()),
      recentTrades: this.recentTrades,
      pnl,
      pnlPercent: (pnl / this.initialCapital) * 100,
      strategyStats,
    };
  }
}
