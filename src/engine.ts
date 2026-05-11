import { EventEmitter } from 'events';
import { rsiSignal } from './strategies/rsi.ts';
import { emaSignal } from './strategies/ema.ts';
import { macdSignal } from './strategies/macd.ts';
import { calculateKelly } from './kelly.ts';
import { PaperPortfolio } from './portfolio.ts';
import type { CoinGeckoPoller, PriceUpdateEvent } from './poller.ts';
import type { Signal, PortfolioState, StrategyName } from './types.ts';

const STRATEGIES: { name: StrategyName; fn: (p: number[]) => { direction: string; value: number } }[] = [
  { name: 'RSI',  fn: (p) => rsiSignal(p) },
  { name: 'EMA',  fn: (p) => emaSignal(p) },
  { name: 'MACD', fn: (p) => macdSignal(p) },
];

export class BotEngine extends EventEmitter {
  private portfolio: PaperPortfolio;

  constructor(private poller: CoinGeckoPoller, initialCapital = 250) {
    super();
    this.portfolio = new PaperPortfolio(initialCapital);
  }

  start() {
    this.poller.on('price', (event: PriceUpdateEvent) => this.onPrice(event));
  }

  getPortfolioState(): PortfolioState {
    return this.portfolio.getState();
  }

  private onPrice({ crypto, price, history }: PriceUpdateEvent) {
    const prices = history.map(h => h.price);

    for (const { name, fn } of STRATEGIES) {
      const result = fn(prices);
      if (result.direction === 'HOLD') continue;

      const stats = this.portfolio.getState().strategyStats[name];
      const kelly = calculateKelly(stats.wins, stats.losses, stats.avgGain, stats.avgLoss);
      if (kelly === 0) continue;

      const signal: Signal = {
        crypto,
        strategy: name,
        direction: result.direction as 'BUY' | 'SELL',
        price,
        kellyFraction: kelly,
        timestamp: Date.now(),
      };

      this.emit('signal', signal);

      const trade = result.direction === 'BUY'
        ? this.portfolio.buy(crypto, name, price, kelly)
        : this.portfolio.sell(crypto, name, price);

      if (trade) {
        this.emit('trade', trade);
        this.emit('portfolio', this.portfolio.getState());
      }
    }
  }
}
