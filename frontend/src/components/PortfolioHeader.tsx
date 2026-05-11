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
          <div className="metric-label">Open Positions / Trades</div>
        </div>
      </div>
    </div>
  );
}
