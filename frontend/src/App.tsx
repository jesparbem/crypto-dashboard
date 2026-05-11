import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket.ts';
import { PortfolioHeader } from './components/PortfolioHeader.tsx';
import { PriceChart } from './components/PriceChart.tsx';
import { SignalsTable } from './components/SignalsTable.tsx';
import { StrategyComparison } from './components/StrategyComparison.tsx';

interface StrategyStats { wins: number; losses: number; totalPnl: number; avgGain: number; avgLoss: number; }
interface PortfolioState {
  capital: number; initialCapital: number; totalValue: number;
  pnl: number; pnlPercent: number;
  positions: unknown[]; recentTrades: unknown[];
  strategyStats: Record<string, StrategyStats>;
}
interface Signal {
  crypto: { symbol: string; name: string };
  strategy: string; direction: 'BUY' | 'SELL';
  price: number; kellyFraction: number; timestamp: number;
}

const DEFAULT: PortfolioState = {
  capital: 250, initialCapital: 250, totalValue: 250, pnl: 0, pnlPercent: 0,
  positions: [], recentTrades: [],
  strategyStats: {
    RSI:  { wins: 0, losses: 0, totalPnl: 0, avgGain: 0, avgLoss: 0 },
    EMA:  { wins: 0, losses: 0, totalPnl: 0, avgGain: 0, avgLoss: 0 },
    MACD: { wins: 0, losses: 0, totalPnl: 0, avgGain: 0, avgLoss: 0 },
  },
};

export default function App() {
  const { connected, lastMessage } = useWebSocket('ws://localhost:5173/ws');
  const [portfolio, setPortfolio] = useState<PortfolioState>(DEFAULT);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    fetch('/api/portfolio').then(r => r.json()).then(setPortfolio).catch(() => {});
    fetch('/api/prices').then(r => r.json()).then(setPrices).catch(() => {});
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'portfolio_update') setPortfolio(lastMessage.payload as PortfolioState);
    else if (lastMessage.type === 'price_update') setPrices(lastMessage.payload as Record<string, number>);
    else if (lastMessage.type === 'signal') setSignals(prev => [lastMessage.payload as Signal, ...prev].slice(0, 50));
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
