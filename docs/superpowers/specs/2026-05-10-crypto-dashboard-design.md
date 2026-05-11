+# Crypto Paper Trading Dashboard — Design Spec
**Date:** 2026-05-10  
**Status:** Approved

## Overview

A paper trading simulation system for cryptocurrencies available on Revolut. Starts with 250€ virtual capital, runs 3 trading strategies in parallel, and visualizes everything in real time via a web dashboard and terminal UI. No real trades are executed — the user decides manually on Revolut if they want to act on a signal.

## Architecture

Single Bun process with two frontends:

```
┌─────────────────────────────────────────────────┐
│                  PROCESO BUN                    │
│                                                 │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  Hono API    │    │     Bot Engine        │  │
│  │  REST + WS   │◄───│  (strategies loop)    │  │
│  └──────┬───────┘    └───────────────────────┘  │
│         │                      ▲                │
│         │            ┌─────────┴──────────┐     │
│         │            │  CoinGecko Poller  │     │
│         │            │  (60s, ~80 cryptos)│     │
│         │            └────────────────────┘     │
└─────────┼───────────────────────────────────────┘
          │ WebSocket
          ▼
┌─────────────────────┐    ┌──────────────────────┐
│   React Dashboard   │    │   Terminal (Blessed)  │
│   (Recharts, Vite)  │    │   signals + P&L live  │
└─────────────────────┘    └──────────────────────┘
```

## Components

### 1. CoinGecko Poller (`src/poller.ts`)
- Fetches prices every 60 seconds from CoinGecko free API (no auth required)
- Targets ~80 cryptocurrencies available on Revolut
- Maintains a rolling price history buffer (last 100 candles per coin) in memory
- Emits `priceUpdate` events consumed by the Bot Engine

### 2. Bot Engine (`src/engine.ts`)
Runs 3 strategies on every crypto on each price update:

**RSI (14 periods)**
- BUY signal: RSI < 30 (oversold)
- SELL signal: RSI > 70 (overbought)

**EMA Crossover (9/21 periods)**
- BUY signal: EMA9 crosses above EMA21
- SELL signal: EMA9 crosses below EMA21

**MACD (12/26/9)**
- BUY signal: MACD line crosses above signal line
- SELL signal: MACD line crosses below signal line

### 3. Kelly Criterion Position Sizer (`src/kelly.ts`)
```
f = (p * b - q) / b
```
- `f` = fraction of capital to invest
- `p` = historical win rate of the strategy on this asset
- `b` = average gain/loss ratio
- `q` = 1 - p

Maximum position size capped at 25% of available capital (fractional Kelly) to limit risk.

### 4. Paper Portfolio (`src/portfolio.ts`)
- Starting capital: 250€ virtual
- Records every trade: entry price, exit price, P&L, strategy, timestamp
- Tracks performance per strategy independently
- Exposes current capital, open positions, trade history

### 5. Hono API (`src/server.ts`)
- `GET /api/prices` — latest prices for all tracked cryptos
- `GET /api/portfolio` — current portfolio state
- `GET /api/trades` — trade history
- `GET /api/signals` — active signals
- `WS /ws` — real-time push of price updates, signals, and portfolio changes

### 6. React Dashboard (`frontend/`)
Built with Vite + React + Recharts:

- **Header**: current capital, total P&L %, number of trades
- **Price chart**: real-time line chart for selected cryptos
- **Active signals table**: crypto, strategy, direction (BUY/SELL), Kelly size, current P&L
- **Strategy comparison**: bar chart showing P&L per strategy (RSI vs EMA vs MACD)
- Updates via WebSocket — no page refresh needed

### 7. Terminal UI (`src/terminal.ts`)
Built with blessed + blessed-contrib:

- Compact table: timestamp, crypto, strategy, direction, P&L
- Capital counter updating live
- Runs alongside the web dashboard in the same process

## Data Flow

```
CoinGecko API
    │ (every 60s)
    ▼
CoinGecko Poller ──► price history buffer
    │
    ▼
Bot Engine ──► RSI / EMA / MACD calculations
    │
    ▼
Signal generated ──► Kelly Criterion sizing
    │
    ▼
Paper Portfolio ──► trade recorded, capital updated
    │
    ├──► Hono WebSocket ──► React Dashboard
    └──► Terminal UI
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Backend | Hono |
| Frontend | Vite + React + Recharts |
| Terminal | blessed + blessed-contrib |
| Language | TypeScript |
| Data | CoinGecko free API |

## Project Structure

```
crypto-dashboard/
├── src/
│   ├── server.ts        # Hono API + WebSocket
│   ├── poller.ts        # CoinGecko price fetcher
│   ├── engine.ts        # Strategy runner (RSI, EMA, MACD)
│   ├── kelly.ts         # Position sizer
│   ├── portfolio.ts     # Paper portfolio state
│   ├── strategies/
│   │   ├── rsi.ts
│   │   ├── ema.ts
│   │   └── macd.ts
│   └── terminal.ts      # blessed terminal UI
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── PriceChart.tsx
│   │   │   ├── SignalsTable.tsx
│   │   │   ├── PortfolioHeader.tsx
│   │   │   └── StrategyComparison.tsx
│   │   └── hooks/
│   │       └── useWebSocket.ts
│   └── index.html
├── package.json
└── docs/
    └── superpowers/specs/
        └── 2026-05-10-crypto-dashboard-design.md
```

## Constraints

- CoinGecko free tier: 10-50 calls/minute — poller batches all cryptos in a single request
- No real trades executed — system is read-only with respect to Revolut
- Network: CoinGecko API must be accessible from corporate network (bun.sh and GitHub are blocked)
- All data is in-memory — no database required for a simulation tool

## Success Criteria

1. Dashboard loads in browser and updates prices every ~60 seconds
2. Terminal shows live signals alongside the web dashboard
3. All 3 strategies generate BUY/SELL signals independently
4. Portfolio tracks capital starting from 250€ and compounds correctly
5. Strategy comparison shows which approach is performing best in paper trading
