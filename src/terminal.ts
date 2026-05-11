import type { BotEngine } from './engine.ts';
import type { Signal, Trade } from './types.ts';

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m', B = '\x1b[1m';

function pad(s: string, n: number) { return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }
function eur(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '€'; }

export class TerminalUI {
  private signals: Signal[] = [];
  private trades: Trade[] = [];

  constructor(private engine: BotEngine) {}

  start() {
    this.engine.on('signal', (s: Signal) => { this.signals = [s, ...this.signals].slice(0, 8); this.render(); });
    this.engine.on('trade',  (t: Trade)  => { this.trades  = [t, ...this.trades].slice(0, 8);  this.render(); });
    setInterval(() => this.render(), 10_000);
  }

  private render() {
    const s = this.engine.getPortfolioState();
    const pc = s.pnl >= 0 ? G : R;

    process.stdout.write('\x1b[2J\x1b[H');
    console.log(`${B}${C}══ CRYPTO PAPER TRADING BOT ══${X}`);
    console.log(`Capital: ${B}${s.capital.toFixed(2)}€${X}  Total: ${B}${s.totalValue.toFixed(2)}€${X}  P&L: ${pc}${B}${eur(s.pnl)} (${s.pnlPercent.toFixed(1)}%)${X}`);
    console.log(`Positions: ${s.positions.length}  Trades: ${s.recentTrades.length}\n`);

    console.log(`${B}STRATEGIES${X}`);
    console.log(`${pad('Name',5)} ${pad('W',4)} ${pad('L',4)} ${pad('P&L',10)}`);
    for (const [n, v] of Object.entries(s.strategyStats)) {
      const c = v.totalPnl >= 0 ? G : R;
      console.log(`${pad(n,5)} ${pad(String(v.wins),4)} ${pad(String(v.losses),4)} ${c}${eur(v.totalPnl)}${X}`);
    }

    if (this.signals.length) {
      console.log(`\n${B}SIGNALS${X}`);
      console.log(`${pad('Time',9)} ${pad('Sym',5)} ${pad('Strat',5)} Dir   ${pad('Price',13)} Kelly`);
      for (const sig of this.signals) {
        const dc = sig.direction === 'BUY' ? G : R;
        console.log(`${pad(new Date(sig.timestamp).toLocaleTimeString(),9)} ${pad(sig.crypto.symbol,5)} ${pad(sig.strategy,5)} ${dc}${sig.direction}${X}  ${pad(sig.price.toFixed(4)+'€',13)} ${(sig.kellyFraction*100).toFixed(0)}%`);
      }
    }

    if (this.trades.length) {
      console.log(`\n${B}TRADES${X}`);
      for (const t of this.trades) {
        const dc = t.direction === 'BUY' ? G : R;
        const pnlStr = t.pnl != null ? (t.pnl >= 0 ? G : R) + eur(t.pnl) + X : '';
        console.log(`  ${dc}${t.direction}${X} ${t.crypto.symbol}(${t.strategy}) @${t.price.toFixed(4)}€ ${pnlStr}`);
      }
    }

    console.log(`\n${Y}[${new Date().toLocaleTimeString()}]${X}`);
  }
}
