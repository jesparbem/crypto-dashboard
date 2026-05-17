import { EventEmitter } from 'events';
import { REVOLUT_CRYPTOS } from './cryptos.ts';
import type { Crypto, PricePoint, MarketData } from './types.ts';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const HISTORY_SIZE = 100;
const POLL_MS = 30_000;

export interface PriceUpdateEvent {
  crypto: Crypto;
  price: number;
  timestamp: number;
  history: PricePoint[];
}

interface CoinGeckoResponse {
  [id: string]: {
    eur?: number;
    eur_market_cap?: number;
    eur_24h_vol?: number;
    eur_24h_change?: number;
    last_updated_at?: number;
  };
}

export class CoinGeckoPoller extends EventEmitter {
  private history = new Map<string, PricePoint[]>();
  private latestPrices = new Map<string, number>();
  private marketData = new Map<string, MarketData>();
  private timer: Timer | null = null;

  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  getLatestPrices(): Record<string, number> {
    return Object.fromEntries(this.latestPrices);
  }

  getMarketData(): Record<string, MarketData> {
    return Object.fromEntries(this.marketData);
  }

  getHistory(cryptoId: string): PricePoint[] {
    return this.history.get(cryptoId) ?? [];
  }

  private async poll() {
    const ids = REVOLUT_CRYPTOS.map(c => c.id).join(',');
    const url = `${COINGECKO_URL}?ids=${ids}&vs_currencies=eur&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`;

    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const data = await res.json() as CoinGeckoResponse;
      const timestamp = Date.now();

      for (const crypto of REVOLUT_CRYPTOS) {
        const entry = data[crypto.id];
        if (!entry?.eur) continue;

        const price = entry.eur;
        this.latestPrices.set(crypto.id, price);

        this.marketData.set(crypto.id, {
          price,
          marketCap: entry.eur_market_cap ?? 0,
          volume24h: entry.eur_24h_vol ?? 0,
          change24h: entry.eur_24h_change ?? 0,
          lastUpdated: (entry.last_updated_at ?? 0) * 1000,
        });

        const history = this.history.get(crypto.id) ?? [];
        history.push({ timestamp, price });
        if (history.length > HISTORY_SIZE) history.shift();
        this.history.set(crypto.id, history);

        this.emit('price', { crypto, price, timestamp, history: [...history] } satisfies PriceUpdateEvent);
      }

      this.emit('batch_done', { timestamp, count: REVOLUT_CRYPTOS.length });
      console.log(`[poller] ${new Date(timestamp).toLocaleTimeString()} — updated ${REVOLUT_CRYPTOS.length} cryptos`);
    } catch (err) {
      console.error('[poller] Error:', (err as Error).message);
      this.emit('error', err);
    }
  }
}
