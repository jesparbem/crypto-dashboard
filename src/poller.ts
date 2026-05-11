import { EventEmitter } from 'events';
import { REVOLUT_CRYPTOS } from './cryptos.ts';
import type { Crypto, PricePoint } from './types.ts';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const HISTORY_SIZE = 100;
const POLL_MS = 60_000;

export interface PriceUpdateEvent {
  crypto: Crypto;
  price: number;
  timestamp: number;
  history: PricePoint[];
}

export class CoinGeckoPoller extends EventEmitter {
  private history = new Map<string, PricePoint[]>();
  private latestPrices = new Map<string, number>();
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

  getHistory(cryptoId: string): PricePoint[] {
    return this.history.get(cryptoId) ?? [];
  }

  private async poll() {
    const ids = REVOLUT_CRYPTOS.map(c => c.id).join(',');
    const url = `${COINGECKO_URL}?ids=${ids}&vs_currencies=eur`;

    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const data = await res.json() as Record<string, { eur?: number }>;
      const timestamp = Date.now();

      for (const crypto of REVOLUT_CRYPTOS) {
        const price = data[crypto.id]?.eur;
        if (price == null) continue;

        this.latestPrices.set(crypto.id, price);
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
