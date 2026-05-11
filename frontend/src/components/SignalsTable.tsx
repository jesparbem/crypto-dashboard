interface Signal {
  crypto: { symbol: string; name: string };
  strategy: string;
  direction: 'BUY' | 'SELL';
  price: number;
  kellyFraction: number;
  timestamp: number;
}

interface Props { signals: Signal[]; }

export function SignalsTable({ signals }: Props) {
  if (signals.length === 0) {
    return (
      <div className="card">
        <h2>Recent Signals</h2>
        <p style={{ color: '#8b949e', textAlign: 'center', padding: 32 }}>
          Waiting for signals... (strategies activate after ~15 price updates)
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Recent Signals ({signals.length})</h2>
      <table>
        <thead>
          <tr><th>Time</th><th>Crypto</th><th>Strategy</th><th>Dir</th><th>Price</th><th>Kelly %</th></tr>
        </thead>
        <tbody>
          {signals.map((s, i) => (
            <tr key={i}>
              <td style={{ color: '#8b949e' }}>{new Date(s.timestamp).toLocaleTimeString()}</td>
              <td><strong>{s.crypto.symbol}</strong></td>
              <td>{s.strategy}</td>
              <td><span className={`badge badge-${s.direction.toLowerCase()}`}>{s.direction}</span></td>
              <td>{s.price < 0.01 ? s.price.toFixed(8) : s.price < 1 ? s.price.toFixed(6) : s.price.toFixed(2)}€</td>
              <td>{(s.kellyFraction * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
