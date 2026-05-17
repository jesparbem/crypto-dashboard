import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { BotEngine } from './engine.ts';
import type { CoinGeckoPoller } from './poller.ts';
import type { WsMessage } from './types.ts';

type WSClient = { send: (data: string | Buffer) => void; readyState: number };
const clients = new Set<WSClient>();

export function broadcast(msg: WsMessage) {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    try { if (client.readyState === 1) client.send(data); } catch {}
  }
}

export function createServer(engine: BotEngine, poller: CoinGeckoPoller) {
  const app = new Hono();
  app.use('*', cors({ origin: '*' }));

  app.get('/api/portfolio', (c) => c.json(engine.getPortfolioState()));
  app.get('/api/prices', (c) => c.json(poller.getLatestPrices()));
  app.get('/api/market', (c) => c.json(poller.getMarketData()));
  app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now() }));

  engine.on('signal',    (s) => broadcast({ type: 'signal',           payload: s }));
  engine.on('trade',     (t) => broadcast({ type: 'trade',            payload: t }));
  engine.on('portfolio', (p) => broadcast({ type: 'portfolio_update', payload: p }));
  poller.on('batch_done', () => {
    broadcast({ type: 'price_update',    payload: poller.getLatestPrices() });
    broadcast({ type: 'market_update',   payload: poller.getMarketData() });
    broadcast({ type: 'portfolio_update', payload: engine.getPortfolioState() });
  });

  return Bun.serve({
    port: 3000,
    fetch(req, server) {
      const url = new URL(req.url);
      if (url.pathname === '/ws') {
        const ok = server.upgrade(req);
        if (ok) return undefined;
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return app.fetch(req);
    },
    websocket: {
      open(ws)    { clients.add(ws as unknown as WSClient); },
      close(ws)   { clients.delete(ws as unknown as WSClient); },
      message()   {},
    },
  });
}
