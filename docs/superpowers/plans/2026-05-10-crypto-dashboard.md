# Crypto Paper Trading Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time crypto paper trading dashboard with 3 parallel strategies (RSI, EMA, MACD), Kelly Criterion position sizing, a React web dashboard, and a terminal UI — starting with 250€ virtual capital and live CoinGecko price data.

**Architecture:** Single Bun process runs a Hono REST/WebSocket server, a CoinGecko price poller (60s interval), and a bot engine that runs 3 strategies on ~50 Revolut cryptos. A Vite+React frontend connects via WebSocket for real-time updates. Terminal UI uses ANSI codes to print a live table.

**Tech Stack:** Bun, Hono, TypeScript, Vite, React 18, Recharts, CoinGecko free API

---

## File Map

```
crypto-dashboard/
├── src/
│   ├── types.ts              — shared TypeScript interfaces
│   ├── cryptos.ts            — ~50 Revolut cryptos with CoinGecko IDs
│   ├── strategies/
│   │   ├── rsi.ts            — RSI(14) signal
│   │   ├── ema.ts            — EMA crossover (9/21)
│   │   └── macd.ts           — MACD (12/26/9)
│   ├── kelly.ts              — fractional Kelly position sizer
│   ├── portfolio.ts          — PaperPortfolio class
│   ├── poller.ts             — CoinGecko EventEmitter poller
│   ├── engine.ts             — strategy + portfolio orchestrator
│   ├── server.ts             — Bun.serve with Hono REST + WebSocket
│   ├── terminal.ts           — ANSI terminal table printer
│   └── index.ts              — entry point
├── tests/
│   ├── strategies/
│   │   ├── rsi.test.ts
│   │   ├── ema.test.ts
│   │   └── macd.test.ts
│   ├── kelly.test.ts
│   └── portfolio.test.ts
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── hooks/useWebSocket.ts
│       └── components/
│           ├── PortfolioHeader.tsx
│           ├── PriceChart.tsx
│           ├── SignalsTable.tsx
│           └── StrategyComparison.tsx
├── package.json
└── tsconfig.json
```

---

### Task 1: Project Scaffolding

**Files:** `package.json`, `tsconfig.json`, `frontend/package.json`, `frontend/tsconfig.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "crypto-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "frontend:dev": "cd frontend && bun run dev",
    "frontend:build": "cd frontend && bun run build"
  },
  "dependencies": {
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `frontend/package.json`**

```json
{
  "name": "crypto-dashboard-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create directories and install dependencies**

```bash
mkdir -p src/strategies tests/strategies frontend/src/components frontend/src/hooks
bun install
cd frontend && bun install && cd ..
```

Expected: `node_modules/` created in both `crypto-dashboard/` and `crypto-dashboard/frontend/`, no errors.

- [ ] **Step 6: Initialize git and commit**

```bash
git init
git add package.json tsconfig.json frontend/package.json frontend/tsconfig.json
git commit -m "feat: project scaffolding"
```

---

### Task 2: Shared Types and Cryptos List

**Files:** `src/types.ts`, `src/cryptos.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export type StrategyName = 'RSI' | 'EMA' | 'MACD';
export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';

export interface Crypto {
  symbol: string;
  id: string;
  name: string;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface StrategyResult {
  direction: SignalDirection;
  value: number;
}

export interface Signal {
  crypto: Crypto;
  strategy: StrategyName;
  direction: 'BUY' | 'SELL';
  price: number;
  kellyFraction: number;
  timestamp: number;
}

export interface Position {
  crypto: Crypto;
  strategy: StrategyName;
  entryPrice: number;
  shares: number;
  amountInvested: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  crypto: Crypto;
  strategy: StrategyName;
  direction: 'BUY' | 'SELL';
  price: number;
  amount: number;
  shares: number;
  timestamp: number;
  pnl?: number;
}

export interface StrategyStats {
  wins: number;
  losses: number;
  totalPnl: number;
  avgGain: number;
  avgLoss: number;
}

export interface PortfolioState {
  capital: number;
  initialCapital: number;
  totalValue: number;
  positions: Position[];
  recentTrades: Trade[];
  pnl: number;
  pnlPercent: number;
  strategyStats: Record<StrategyName, StrategyStats>;
}

export interface WsMessage {
  type: 'signal' | 'trade' | 'portfolio_update' | 'price_update';
  payload: unknown;
}
```

- [ ] **Step 2: Create `src/cryptos.ts`**

```typescript
import type { Crypto } from './types.ts';

export const REVOLUT_CRYPTOS: Crypto[] = [
  { symbol: 'BTC', id: 'bitcoin', name: 'Bitcoin' },
  { symbol: 'ETH', id: 'ethereum', name: 'Ethereum' },
  { symbol: 'SOL', id: 'solana', name: 'Solana' },
  { symbol: 'XRP', id: 'ripple', name: 'XRP' },
  { symbol: 'DOGE', id: 'dogecoin', name: 'Dogecoin' },
  { symbol: 'ADA', id: 'cardano', name: 'Cardano' },
  { symbol: 'DOT', id: 'polkadot', name: 'Polkadot' },
  { symbol: 'MATIC', id: 'matic-network', name: 'Polygon' },
  { symbol: 'LINK', id: 'chainlink', name: 'Chainlink' },
  { symbol: 'AVAX', id: 'avalanche-2', name: 'Avalanche' },
  { symbol: 'SHIB', id: 'shiba-inu', name: 'Shiba Inu' },
  { symbol: 'UNI', id: 'uniswap', name: 'Uniswap' },
  { symbol: 'LTC', id: 'litecoin', name: 'Litecoin' },
  { symbol: 'BCH', id: 'bitcoin-cash', name: 'Bitcoin Cash' },
  { symbol: 'ATOM', id: 'cosmos', name: 'Cosmos' },
  { symbol: 'XLM', id: 'stellar', name: 'Stellar' },
  { symbol: 'ALGO', id: 'algorand', name: 'Algorand' },
  { symbol: 'VET', id: 'vechain', name: 'VeChain' },
  { symbol: 'FIL', id: 'filecoin', name: 'Filecoin' },
  { symbol: 'ICP', id: 'internet-computer', name: 'Internet Computer' },
  { symbol: 'NEAR', id: 'near', name: 'NEAR Protocol' },
  { symbol: 'AAVE', id: 'aave', name: 'Aave' },
  { symbol: 'GRT', id: 'the-graph', name: 'The Graph' },
  { symbol: 'SAND', id: 'the-sandbox', name: 'The Sandbox' },
  { symbol: 'MANA', id: 'decentraland', name: 'Decentraland' },
  { symbol: 'AXS', id: 'axie-infinity', name: 'Axie Infinity' },
  { symbol: 'HBAR', id: 'hedera-hashgraph', name: 'Hedera' },
  { symbol: 'THETA', id: 'theta-token', name: 'Theta Network' },
  { symbol: 'XTZ', id: 'tezos', name: 'Tezos' },
  { symbol: 'EOS', id: 'eos', name: 'EOS' },
  { symbol: 'BAT', id: 'basic-attention-token', name: 'BAT' },
  { symbol: 'ZRX', id: '0x', name: '0x Protocol' },
  { symbol: 'MKR', id: 'maker', name: 'Maker' },
  { symbol: 'COMP', id: 'compound-governance-token', name: 'Compound' },
  { symbol: 'YFI', id: 'yearn-finance', name: 'yearn.finance' },
  { symbol: 'SNX', id: 'havven', name: 'Synthetix' },
  { symbol: 'CRV', id: 'curve-dao-token', name: 'Curve DAO' },
  { symbol: 'SUSHI', id: 'sushi', name: 'SushiSwap' },
  { symbol: '1INCH', id: '1inch', name: '1inch' },
  { symbol: 'ENJ', id: 'enjincoin', name: 'Enjin Coin' },
  { symbol: 'CHZ', id: 'chiliz', name: 'Chiliz' },
  { symbol: 'ANKR', id: 'ankr', name: 'Ankr' },
  { symbol: 'FLOW', id: 'flow', name: 'Flow' },
  { symbol: 'ONE', id: 'harmony', name: 'Harmony' },
  { symbol: 'GALA', id: 'gala', name: 'Gala' },
  { symbol: 'LRC', id: 'loopring', name: 'Loopring' },
  { symbol: 'FTM', id: 'fantom', name: 'Fantom' },
  { symbol: 'STORJ', id: 'storj', name: 'Storj' },
  { symbol: 'NMR', id: 'numeraire', name: 'Numeraire' },
  { symbol: 'BNT', id: 'bancor', name: 'Bancor' },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/cryptos.ts
git commit -m "feat: shared types and Revolut cryptos list"
```

---

### Task 3: RSI Strategy

**Files:** `src/strategies/rsi.ts`, `tests/strategies/rsi.test.ts`

- [ ] **Step 1: Write failing test — `tests/strategies/rsi.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/strategies/rsi.test.ts
```

Expected: FAIL — "Cannot find module '../../src/strategies/rsi.ts'"

- [ ] **Step 3: Implement `src/strategies/rsi.ts`**

```typescript
import type { StrategyResult } from '../types.ts';

export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;

  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const recent = changes.slice(-period);

  const gains = recent.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(recent.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;

  if (losses === 0) return 100;
  if (gains === 0) return 0;
  return 100 - 100 / (1 + gains / losses);
}

export function rsiSignal(prices: number[], period = 14): StrategyResult {
  const rsi = calculateRSI(prices, period);
  const direction = rsi < 30 ? 'BUY' : rsi > 70 ? 'SELL' : 'HOLD';
  return { direction, value: rsi };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/strategies/rsi.test.ts
```

Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/strategies/rsi.ts tests/strategies/rsi.test.ts
git commit -m "feat: RSI(14) strategy with tests"
```

---

### Task 4: EMA Strategy

**Files:** `src/strategies/ema.ts`, `tests/strategies/ema.test.ts`

- [ ] **Step 1: Write failing test — `tests/strategies/ema.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test';
import { calculateEMA, emaSignal } from '../../src/strategies/ema.ts';

describe('calculateEMA', () => {
  it('returns empty array for empty input', () => {
    expect(calculateEMA([], 9)).toEqual([]);
  });

  it('starts with first price', () => {
    expect(calculateEMA([100, 110, 120], 2)[0]).toBe(100);
  });

  it('reacts upward to rising prices', () => {
    const prices = Array.from({ length: 10 }, (_, i) => 100 + i);
    const emas = calculateEMA(prices, 3);
    expect(emas.at(-1)!).toBeGreaterThan(emas[0]);
  });
});

describe('emaSignal', () => {
  it('returns HOLD when not enough data', () => {
    expect(emaSignal([100, 101, 102], 9, 21).direction).toBe('HOLD');
  });

  it('returns BUY when short EMA crosses above long EMA', () => {
    const prices = [...Array(30).fill(100), 102, 104, 106, 108, 110, 112, 114, 116, 118, 120];
    expect(emaSignal(prices, 9, 21).direction).toBe('BUY');
  });

  it('returns SELL when short EMA crosses below long EMA', () => {
    const prices = [...Array(30).fill(120), 118, 116, 114, 112, 110, 108, 106, 104, 102, 100];
    expect(emaSignal(prices, 9, 21).direction).toBe('SELL');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/strategies/ema.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement `src/strategies/ema.ts`**

```typescript
import type { StrategyResult } from '../types.ts';

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emas.push(prices[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

export function emaSignal(prices: number[], shortPeriod = 9, longPeriod = 21): StrategyResult {
  if (prices.length < longPeriod + 2) return { direction: 'HOLD', value: 0 };

  const shortEmas = calculateEMA(prices, shortPeriod);
  const longEmas = calculateEMA(prices, longPeriod);
  const n = prices.length - 1;

  const lastDiff = shortEmas[n] - longEmas[n];
  const prevDiff = shortEmas[n - 1] - longEmas[n - 1];

  let direction: StrategyResult['direction'] = 'HOLD';
  if (prevDiff <= 0 && lastDiff > 0) direction = 'BUY';
  else if (prevDiff >= 0 && lastDiff < 0) direction = 'SELL';

  return { direction, value: lastDiff };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/strategies/ema.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/strategies/ema.ts tests/strategies/ema.test.ts
git commit -m "feat: EMA crossover (9/21) strategy with tests"
```

---

### Task 5: MACD Strategy

**Files:** `src/strategies/macd.ts`, `tests/strategies/macd.test.ts`

- [ ] **Step 1: Write failing test — `tests/strategies/macd.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test';
import { macdSignal } from '../../src/strategies/macd.ts';

describe('macdSignal', () => {
  it('returns HOLD when not enough data', () => {
    expect(macdSignal([100, 101, 102], 12, 26, 9).direction).toBe('HOLD');
  });

  it('returns BUY on bullish crossover', () => {
    const prices = [...Array(40).fill(100), 102, 104, 107, 110, 114, 118, 123, 128, 134, 140];
    expect(macdSignal(prices, 12, 26, 9).direction).toBe('BUY');
  });

  it('returns SELL on bearish crossover', () => {
    const prices = [...Array(40).fill(140), 138, 135, 131, 127, 122, 117, 111, 104, 96, 87];
    expect(macdSignal(prices, 12, 26, 9).direction).toBe('SELL');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/strategies/macd.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement `src/strategies/macd.ts`**

```typescript
import type { StrategyResult } from '../types.ts';
import { calculateEMA } from './ema.ts';

export function macdSignal(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): StrategyResult {
  if (prices.length < slowPeriod + signalPeriod) return { direction: 'HOLD', value: 0 };

  const fastEmas = calculateEMA(prices, fastPeriod);
  const slowEmas = calculateEMA(prices, slowPeriod);
  const macdLine = fastEmas.map((f, i) => f - slowEmas[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);

  const n = prices.length - 1;
  const lastDiff = macdLine[n] - signalLine[n];
  const prevDiff = macdLine[n - 1] - signalLine[n - 1];

  let direction: StrategyResult['direction'] = 'HOLD';
  if (prevDiff <= 0 && lastDiff > 0) direction = 'BUY';
  else if (prevDiff >= 0 && lastDiff < 0) direction = 'SELL';

  return { direction, value: lastDiff };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/strategies/macd.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/strategies/macd.ts tests/strategies/macd.test.ts
git commit -m "feat: MACD (12/26/9) strategy with tests"
```

---

### Task 6: Kelly Criterion

**Files:** `src/kelly.ts`, `tests/kelly.test.ts`

- [ ] **Step 1: Write failing test — `tests/kelly.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test';
import { calculateKelly } from '../src/kelly.ts';

describe('calculateKelly', () => {
  it('returns 0.05 default when no history', () => {
    expect(calculateKelly(0, 0, 0, 0)).toBe(0.05);
  });

  it('returns 0 for losing strategy', () => {
    // 30% win rate, 1:1 ratio → kelly = -0.4 → clamped to 0
    expect(calculateKelly(3, 7, 1, 1)).toBe(0);
  });

  it('caps at 0.25 for strong strategy', () => {
    // 60% win rate, 2:1 → kelly = 0.4 → capped at 0.25
    expect(calculateKelly(6, 4, 2, 1)).toBe(0.25);
  });

  it('caps at 0.25 for perfect strategy', () => {
    expect(calculateKelly(10, 0, 10, 1)).toBe(0.25);
  });

  it('returns 0 for negative kelly', () => {
    expect(calculateKelly(1, 9, 0.5, 2)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kelly.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement `src/kelly.ts`**

```typescript
export function calculateKelly(
  wins: number,
  losses: number,
  avgGain: number,
  avgLoss: number
): number {
  if (wins + losses === 0) return 0.05;

  const p = wins / (wins + losses);
  const q = 1 - p;
  const b = avgLoss > 0 ? avgGain / avgLoss : avgGain > 0 ? avgGain : 1;

  const kelly = b > 0 ? (p * b - q) / b : 0;
  return Math.max(0, Math.min(0.25, kelly));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kelly.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/kelly.ts tests/kelly.test.ts
git commit -m "feat: fractional Kelly Criterion with tests"
```

---

### Task 7: Paper Portfolio

**Files:** `src/portfolio.ts`, `tests/portfolio.test.ts`

- [ ] **Step 1: Write failing test — `tests/portfolio.test.ts`**

```typescript
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
    p.buy(btc, 'RSI', 50000, 0.10);   // 25€ → 0.0005 BTC
    p.sell(btc, 'RSI', 60000);         // 0.0005 * 60000 = 30€
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/portfolio.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement `src/portfolio.ts`**

```typescript
import { randomUUID } from 'crypto';
import type { Crypto, StrategyName, Position, Trade, PortfolioState, StrategyStats } from './types.ts';

type InternalStats = { wins: number; losses: number; totalPnl: number; totalGain: number; totalLoss: number };

export class PaperPortfolio {
  private capital: number;
  private readonly initialCapital: number;
  private positions = new Map<string, Position>();
  private recentTrades: Trade[] = [];
  private stats: Record<StrategyName, InternalStats> = {
    RSI: { wins: 0, losses: 0, totalPnl: 0, totalGain: 0, totalLoss: 0 },
    EMA: { wins: 0, losses: 0, totalPnl: 0, totalGain: 0, totalLoss: 0 },
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
```

- [ ] **Step 4: Run all tests**

```bash
bun test
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/portfolio.ts tests/portfolio.test.ts
git commit -m "feat: PaperPortfolio with buy/sell/Kelly tracking"
```

---

### Task 8: CoinGecko Poller

**Files:** `src/poller.ts`

- [ ] **Step 1: Implement `src/poller.ts`**

```typescript
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
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
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
      console.log(`[poller] Updated ${REVOLUT_CRYPTOS.length} prices at ${new Date(timestamp).toISOString()}`);
    } catch (err) {
      console.error('[poller] Error:', err);
      this.emit('error', err);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/poller.ts
git commit -m "feat: CoinGecko poller with 60s interval and price history"
```

---

### Task 9: Bot Engine

**Files:** `src/engine.ts`

- [ ] **Step 1: Implement `src/engine.ts`**

```typescript
import { EventEmitter } from 'events';
import { rsiSignal } from './strategies/rsi.ts';
import { emaSignal } from './strategies/ema.ts';
import { macdSignal } from './strategies/macd.ts';
import { calculateKelly } from './kelly.ts';
import { PaperPortfolio } from './portfolio.ts';
import type { CoinGeckoPoller, PriceUpdateEvent } from './poller.ts';
import type { Signal, PortfolioState, StrategyName } from './types.ts';

type StrategyFn = (prices: number[]) => { direction: string; value: number };

const STRATEGIES: { name: StrategyName; fn: StrategyFn }[] = [
  { name: 'RSI', fn: (p) => rsiSignal(p) },
  { name: 'EMA', fn: (p) => emaSignal(p) },
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
```

- [ ] **Step 2: Commit**

```bash
git add src/engine.ts
git commit -m "feat: bot engine orchestrating strategies and portfolio"
```

---

### Task 10: Hono Server + WebSocket

**Files:** `src/server.ts`

- [ ] **Step 1: Implement `src/server.ts`**

```typescript
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

  engine.on('signal', (signal) => broadcast({ type: 'signal', payload: signal }));
  engine.on('trade', (trade) => broadcast({ type: 'trade', payload: trade }));
  engine.on('portfolio', (state) => broadcast({ type: 'portfolio_update', payload: state }));
  poller.on('batch_done', () => {
    broadcast({ type: 'price_update', payload: poller.getLatestPrices() });
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
      open(ws) { clients.add(ws as unknown as WSClient); },
      close(ws) { clients.delete(ws as unknown as WSClient); },
      message() {},
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server.ts
git commit -m "feat: Hono REST API + WebSocket broadcast server"
```

---

### Task 11: Terminal UI

**Files:** `src/terminal.ts`

- [ ] **Step 1: Implement `src/terminal.ts`**

```typescript
import type { BotEngine } from './engine.ts';
import type { Signal, Trade } from './types.ts';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pad(s: string, n: number) {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function color(text: string, direction: 'BUY' | 'SELL') {
  return (direction === 'BUY' ? GREEN : RED) + text + RESET;
}

function formatEur(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '€';
}

export class TerminalUI {
  private recentSignals: Signal[] = [];
  private recentTrades: Trade[] = [];

  constructor(private engine: BotEngine) {}

  start() {
    this.engine.on('signal', (s: Signal) => {
      this.recentSignals = [s, ...this.recentSignals].slice(0, 10);
      this.render();
    });
    this.engine.on('trade', (t: Trade) => {
      this.recentTrades = [t, ...this.recentTrades].slice(0, 10);
      this.render();
    });

    setInterval(() => this.render(), 5000);
    this.render();
  }

  private render() {
    const state = this.engine.getPortfolioState();
    const pnlColor = state.pnl >= 0 ? GREEN : RED;

    process.stdout.write('\x1b[2J\x1b[H'); // clear screen

    console.log(`${BOLD}${CYAN}=== CRYPTO PAPER TRADING BOT ===${RESET}`);
    console.log(`Capital: ${BOLD}${state.capital.toFixed(2)}€${RESET}  |  Total: ${BOLD}${state.totalValue.toFixed(2)}€${RESET}  |  P&L: ${pnlColor}${BOLD}${formatEur(state.pnl)} (${state.pnlPercent.toFixed(1)}%)${RESET}`);
    console.log(`Positions: ${state.positions.length}  |  Trades: ${state.recentTrades.length}`);
    console.log('');

    console.log(`${BOLD}STRATEGY STATS${RESET}`);
    console.log(`${pad('Strategy', 8)} ${pad('Wins', 5)} ${pad('Losses', 7)} ${pad('P&L', 10)}`);
    for (const [name, stats] of Object.entries(state.strategyStats)) {
      const pnl = stats.totalPnl >= 0 ? GREEN + formatEur(stats.totalPnl) + RESET : RED + formatEur(stats.totalPnl) + RESET;
      console.log(`${pad(name, 8)} ${pad(String(stats.wins), 5)} ${pad(String(stats.losses), 7)} ${pnl}`);
    }
    console.log('');

    if (this.recentSignals.length > 0) {
      console.log(`${BOLD}RECENT SIGNALS${RESET}`);
      console.log(`${pad('Time', 9)} ${pad('Crypto', 6)} ${pad('Strategy', 8)} ${pad('Dir', 5)} ${pad('Price', 12)} ${pad('Kelly', 6)}`);
      for (const s of this.recentSignals) {
        const time = new Date(s.timestamp).toLocaleTimeString();
        const dir = color(s.direction, s.direction);
        console.log(`${pad(time, 9)} ${pad(s.crypto.symbol, 6)} ${pad(s.strategy, 8)} ${dir}  ${pad(s.price.toFixed(4) + '€', 12)} ${(s.kellyFraction * 100).toFixed(0)}%`);
      }
    }

    if (this.recentTrades.length > 0) {
      console.log('');
      console.log(`${BOLD}RECENT TRADES${RESET}`);
      for (const t of this.recentTrades) {
        const dir = color(t.direction, t.direction);
        const pnlStr = t.pnl != null ? (t.pnl >= 0 ? GREEN : RED) + formatEur(t.pnl) + RESET : '';
        console.log(`  ${dir} ${t.crypto.symbol} (${t.strategy}) @ ${t.price.toFixed(4)}€  ${pnlStr}`);
      }
    }

    console.log(`\n${YELLOW}[Last update: ${new Date().toLocaleTimeString()}]${RESET}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/terminal.ts
git commit -m "feat: ANSI terminal UI for live signal and trade display"
```

---

### Task 12: Main Entry Point

**Files:** `src/index.ts`

- [ ] **Step 1: Implement `src/index.ts`**

```typescript
import { CoinGeckoPoller } from './poller.ts';
import { BotEngine } from './engine.ts';
import { createServer } from './server.ts';
import { TerminalUI } from './terminal.ts';

const INITIAL_CAPITAL = 250;

const poller = new CoinGeckoPoller();
const engine = new BotEngine(poller, INITIAL_CAPITAL);
const server = createServer(engine, poller);
const terminal = new TerminalUI(engine);

engine.start();
poller.start();
terminal.start();

console.log(`Server running on http://localhost:${server.port}`);
console.log(`WebSocket at ws://localhost:${server.port}/ws`);
console.log(`Frontend dev: cd frontend && bun run dev`);
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: main entry point wiring all components"
```

---

### Task 13: Frontend Setup

**Files:** `frontend/index.html`, `frontend/vite.config.ts`, `frontend/src/main.tsx`, `frontend/src/App.css`

- [ ] **Step 1: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crypto Paper Trading Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
```

- [ ] **Step 3: Create `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Create `frontend/src/App.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0d1117;
  color: #e6edf3;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
}

.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 16px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
}

.card h2 {
  font-size: 13px;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.header-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
}

.metric-label {
  font-size: 12px;
  color: #8b949e;
  margin-top: 4px;
}

.positive { color: #3fb950; }
.negative { color: #f85149; }
.neutral  { color: #e6edf3; }

table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 12px; color: #8b949e; padding: 6px 8px; border-bottom: 1px solid #30363d; }
td { padding: 8px; border-bottom: 1px solid #21262d; font-size: 13px; }
tr:last-child td { border-bottom: none; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.badge-buy  { background: rgba(63,185,80,0.15); color: #3fb950; }
.badge-sell { background: rgba(248,81,73,0.15); color: #f85149; }

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.status-dot.connected    { background: #3fb950; }
.status-dot.disconnected { background: #f85149; }
```

- [ ] **Step 5: Create `frontend/src/hooks/useWebSocket.ts`**

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsMessage {
  type: 'signal' | 'trade' | 'portfolio_update' | 'price_update';
  payload: unknown;
}

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try { setLastMessage(JSON.parse(e.data) as WsMessage); } catch {}
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, lastMessage };
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html frontend/vite.config.ts frontend/src/main.tsx frontend/src/App.css frontend/src/hooks/useWebSocket.ts
git commit -m "feat: frontend scaffolding with Vite, React, WebSocket hook"
```

---

### Task 14: PortfolioHeader Component

**Files:** `frontend/src/components/PortfolioHeader.tsx`

- [ ] **Step 1: Create `frontend/src/components/PortfolioHeader.tsx`**

```tsx
interface Props {
  capital: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  positionCount: number;
  tradeCount: number;
  connected: boolean;
}

export function PortfolioHeader({ capital, totalValue, pnl, pnlPercent, positionCount, tradeCount, connected }: Props) {
  const pnlClass = pnl >= 0 ? 'positive' : 'negative';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Crypto Paper Trading Dashboard</h1>
        <span>
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span style={{ fontSize: 12, color: '#8b949e' }}>{connected ? 'Live' : 'Reconnecting...'}</span>
        </span>
      </div>
      <div className="header-grid">
        <div>
          <div className="metric-value neutral">{capital.toFixed(2)}€</div>
          <div className="metric-label">Available Capital</div>
        </div>
        <div>
          <div className="metric-value neutral">{totalValue.toFixed(2)}€</div>
          <div className="metric-label">Total Value</div>
        </div>
        <div>
          <div className={`metric-value ${pnlClass}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}€
          </div>
          <div className="metric-label">P&L ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)</div>
        </div>
        <div>
          <div className="metric-value neutral">{positionCount} / {tradeCount}</div>
          <div className="metric-label">Open / Total Trades</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PortfolioHeader.tsx
git commit -m "feat: PortfolioHeader component"
```

---

### Task 15: PriceChart Component

**Files:** `frontend/src/components/PriceChart.tsx`

- [ ] **Step 1: Create `frontend/src/components/PriceChart.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PriceEntry {
  symbol: string;
  price: number;
  time: string;
}

interface Props {
  prices: Record<string, number>;
}

const TOP_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'];
const COLORS = ['#58a6ff', '#3fb950', '#f0883e', '#bc8cff', '#ff7b72'];

export function PriceChart({ prices }: Props) {
  const [selected, setSelected] = useState<string[]>(['BTC', 'ETH']);
  const [history, setHistory] = useState<Record<string, { time: string; price: number }[]>>({});

  useEffect(() => {
    const time = new Date().toLocaleTimeString();
    setHistory(prev => {
      const next = { ...prev };
      for (const sym of selected) {
        const coinId = sym.toLowerCase() === 'btc' ? 'bitcoin'
          : sym.toLowerCase() === 'eth' ? 'ethereum'
          : sym.toLowerCase();
        const price = prices[coinId];
        if (price == null) continue;
        const arr = prev[sym] ?? [];
        next[sym] = [...arr, { time, price }].slice(-30);
      }
      return next;
    });
  }, [prices, selected]);

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const entry: Record<string, string | number> = { index: i };
    for (const sym of selected) {
      const arr = history[sym] ?? [];
      const point = arr[i];
      if (point) { entry[sym] = point.price; entry.time = point.time; }
    }
    return entry;
  });

  return (
    <div className="card">
      <h2>Price Chart</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TOP_SYMBOLS.map(sym => (
          <button
            key={sym}
            onClick={() => setSelected(prev =>
              prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym].slice(0, 5)
            )}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: `1px solid ${selected.includes(sym) ? '#58a6ff' : '#30363d'}`,
              background: selected.includes(sym) ? 'rgba(88,166,255,0.15)' : 'transparent',
              color: selected.includes(sym) ? '#58a6ff' : '#8b949e',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {sym}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8b949e' }} />
          <YAxis tick={{ fontSize: 10, fill: '#8b949e' }} />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
            labelStyle={{ color: '#8b949e' }}
          />
          <Legend />
          {selected.map((sym, i) => (
            <Line
              key={sym}
              type="monotone"
              dataKey={sym}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PriceChart.tsx
git commit -m "feat: PriceChart with multi-coin line chart"
```

---

### Task 16: SignalsTable Component

**Files:** `frontend/src/components/SignalsTable.tsx`

- [ ] **Step 1: Create `frontend/src/components/SignalsTable.tsx`**

```tsx
interface Signal {
  crypto: { symbol: string; name: string };
  strategy: string;
  direction: 'BUY' | 'SELL';
  price: number;
  kellyFraction: number;
  timestamp: number;
}

interface Props {
  signals: Signal[];
}

export function SignalsTable({ signals }: Props) {
  if (signals.length === 0) {
    return (
      <div className="card">
        <h2>Active Signals</h2>
        <p style={{ color: '#8b949e', textAlign: 'center', padding: 24 }}>
          Waiting for signals... (need ≥15 price updates for strategies to activate)
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Recent Signals ({signals.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Crypto</th>
            <th>Strategy</th>
            <th>Direction</th>
            <th>Price</th>
            <th>Kelly %</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s, i) => (
            <tr key={i}>
              <td style={{ color: '#8b949e' }}>{new Date(s.timestamp).toLocaleTimeString()}</td>
              <td><strong>{s.crypto.symbol}</strong></td>
              <td>{s.strategy}</td>
              <td>
                <span className={`badge badge-${s.direction.toLowerCase()}`}>{s.direction}</span>
              </td>
              <td>{s.price.toFixed(4)}€</td>
              <td>{(s.kellyFraction * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SignalsTable.tsx
git commit -m "feat: SignalsTable component"
```

---

### Task 17: StrategyComparison Component

**Files:** `frontend/src/components/StrategyComparison.tsx`

- [ ] **Step 1: Create `frontend/src/components/StrategyComparison.tsx`**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StrategyStats {
  wins: number;
  losses: number;
  totalPnl: number;
  avgGain: number;
  avgLoss: number;
}

interface Props {
  stats: Record<string, StrategyStats>;
}

export function StrategyComparison({ stats }: Props) {
  const data = Object.entries(stats).map(([name, s]) => ({
    name,
    pnl: parseFloat(s.totalPnl.toFixed(2)),
    wins: s.wins,
    losses: s.losses,
    winRate: s.wins + s.losses > 0
      ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0) + '%'
      : 'N/A',
  }));

  return (
    <div className="card">
      <h2>Strategy Comparison</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12 }} />
          <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} unit="€" />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
            formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v}€`, 'P&L']}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.pnl >= 0 ? '#3fb950' : '#f85149'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table style={{ marginTop: 12 }}>
        <thead>
          <tr><th>Strategy</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>P&L</th></tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.name}>
              <td><strong>{d.name}</strong></td>
              <td style={{ color: '#3fb950' }}>{d.wins}</td>
              <td style={{ color: '#f85149' }}>{d.losses}</td>
              <td>{d.winRate}</td>
              <td className={d.pnl >= 0 ? 'positive' : 'negative'}>
                {d.pnl >= 0 ? '+' : ''}{d.pnl}€
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/StrategyComparison.tsx
git commit -m "feat: StrategyComparison bar chart and stats table"
```

---

### Task 18: App.tsx — Wire Everything Together

**Files:** `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/App.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket.ts';
import { PortfolioHeader } from './components/PortfolioHeader.tsx';
import { PriceChart } from './components/PriceChart.tsx';
import { SignalsTable } from './components/SignalsTable.tsx';
import { StrategyComparison } from './components/StrategyComparison.tsx';

interface PortfolioState {
  capital: number;
  initialCapital: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  positions: unknown[];
  recentTrades: unknown[];
  strategyStats: Record<string, { wins: number; losses: number; totalPnl: number; avgGain: number; avgLoss: number }>;
}

interface Signal {
  crypto: { symbol: string; name: string };
  strategy: string;
  direction: 'BUY' | 'SELL';
  price: number;
  kellyFraction: number;
  timestamp: number;
}

const DEFAULT_PORTFOLIO: PortfolioState = {
  capital: 250,
  initialCapital: 250,
  totalValue: 250,
  pnl: 0,
  pnlPercent: 0,
  positions: [],
  recentTrades: [],
  strategyStats: {
    RSI:  { wins: 0, losses: 0, totalPnl: 0, avgGain: 0, avgLoss: 0 },
    EMA:  { wins: 0, losses: 0, totalPnl: 0, avgGain: 0, avgLoss: 0 },
    MACD: { wins: 0, losses: 0, totalPnl: 0, avgGain: 0, avgLoss: 0 },
  },
};

export default function App() {
  const { connected, lastMessage } = useWebSocket('ws://localhost:5173/ws');
  const [portfolio, setPortfolio] = useState<PortfolioState>(DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.json())
      .then(setPortfolio)
      .catch(() => {});
    fetch('/api/prices')
      .then(r => r.json())
      .then(setPrices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'portfolio_update') {
      setPortfolio(lastMessage.payload as PortfolioState);
    } else if (lastMessage.type === 'price_update') {
      setPrices(lastMessage.payload as Record<string, number>);
    } else if (lastMessage.type === 'signal') {
      setSignals(prev => [lastMessage.payload as Signal, ...prev].slice(0, 50));
    }
  }, [lastMessage]);

  return (
    <div className="dashboard">
      <PortfolioHeader
        capital={portfolio.capital}
        totalValue={portfolio.totalValue}
        pnl={portfolio.pnl}
        pnlPercent={portfolio.pnlPercent}
        positionCount={portfolio.positions.length}
        tradeCount={portfolio.recentTrades.length}
        connected={connected}
      />
      <PriceChart prices={prices} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SignalsTable signals={signals} />
        <StrategyComparison stats={portfolio.strategyStats} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: App.tsx wiring all dashboard components"
```

---

### Task 19: Integration Verification

- [ ] **Step 1: Run all backend tests**

```bash
bun test
```

Expected: all tests PASS (rsi, ema, macd, kelly, portfolio)

- [ ] **Step 2: Start the backend**

```bash
bun run dev
```

Expected output:
```
[poller] Updated 50 prices at <timestamp>
Server running on http://localhost:3000
WebSocket at ws://localhost:3000/ws
```

- [ ] **Step 3: Test the API endpoints**

```bash
curl http://localhost:3000/api/portfolio
curl http://localhost:3000/api/prices
```

Expected: JSON responses with portfolio state and crypto prices

- [ ] **Step 4: Start the frontend (new terminal)**

```bash
cd frontend && bun run dev
```

Expected:
```
  VITE v5.x.x  ready in XXXms
  ➜  Local: http://localhost:5173/
```

- [ ] **Step 5: Open browser**

Navigate to `http://localhost:5173`

Expected: Dashboard loads with portfolio header showing 250€, price chart, empty signals table, and strategy comparison at 0.

- [ ] **Step 6: Wait for first price update (~60s)**

After 60 seconds, verify:
- Price chart updates with data
- Portfolio header stays at 250€ (no signals yet — need 15+ price points for strategies)
- Terminal shows price update log

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete crypto paper trading dashboard"
```
