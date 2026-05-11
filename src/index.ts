import { CoinGeckoPoller } from './poller.ts';
import { BotEngine } from './engine.ts';
import { createServer } from './server.ts';
import { TerminalUI } from './terminal.ts';

const poller = new CoinGeckoPoller();
const engine = new BotEngine(poller, 250);
const server = createServer(engine, poller);
const terminal = new TerminalUI(engine);

engine.start();
poller.start();
terminal.start();

console.log(`\nServer:    http://localhost:${server.port}`);
console.log(`WebSocket: ws://localhost:${server.port}/ws`);
console.log(`Frontend:  cd frontend && bun run dev  → http://localhost:5173\n`);
