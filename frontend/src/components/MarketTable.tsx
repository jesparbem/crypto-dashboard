interface MarketData {
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  lastUpdated: number;
}

interface Props {
  market: Record<string, MarketData>;
}

const COIN_NAMES: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', dogecoin: 'DOGE',
  cardano: 'ADA', polkadot: 'DOT', chainlink: 'LINK', 'avalanche-2': 'AVAX',
  'shiba-inu': 'SHIB', uniswap: 'UNI', litecoin: 'LTC', 'bitcoin-cash': 'BCH',
  cosmos: 'ATOM', stellar: 'XLM', aave: 'AAVE', near: 'NEAR',
  'internet-computer': 'ICP', maker: 'MKR', filecoin: 'FIL',
};

function formatNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

export function MarketTable({ market }: Props) {
  const entries = Object.entries(market)
    .map(([id, data]) => ({ id, symbol: COIN_NAMES[id] ?? id.slice(0, 5).toUpperCase(), ...data }))
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 20);

  return (
    <div className="card">
      <h2>Market Overview (Real-Time)</h2>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>
        Updates every 30s from CoinGecko
      </div>
      {entries.length === 0
        ? <p style={{ color: '#8b949e', textAlign: 'center', padding: 40 }}>Loading market data...</p>
        : <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>Coin</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Price (EUR)</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>24h %</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Volume 24h</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px' }}>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((coin, i) => (
                  <tr key={coin.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '6px', color: '#8b949e' }}>{i + 1}</td>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{coin.symbol}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatPrice(coin.price)}€
                    </td>
                    <td style={{
                      padding: '6px', textAlign: 'right', fontFamily: 'monospace',
                      color: coin.change24h >= 0 ? '#3fb950' : '#f85149',
                    }}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: '#8b949e' }}>
                      {formatNum(coin.volume24h)}€
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: '#8b949e' }}>
                      {formatNum(coin.marketCap)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}
