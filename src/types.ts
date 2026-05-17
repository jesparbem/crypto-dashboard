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

export interface MarketData {
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  lastUpdated: number;
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
  type: 'signal' | 'trade' | 'portfolio_update' | 'price_update' | 'market_update';
  payload: unknown;
}
