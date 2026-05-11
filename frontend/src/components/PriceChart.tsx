import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props { prices: Record<string, number>; }

const COIN_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', DOGE: 'dogecoin',
};
const TOP = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'];
const COLORS = ['#58a6ff', '#3fb950', '#f0883e', '#bc8cff', '#ff7b72'];

export function PriceChart({ prices }: Props) {
  const [selected, setSelected] = useState<string[]>(['BTC', 'ETH']);
  const [history, setHistory] = useState<Record<string, { time: string; price: number }[]>>({});

  useEffect(() => {
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => {
      const next = { ...prev };
      for (const sym of selected) {
        const id = COIN_ID_MAP[sym] ?? sym.toLowerCase();
        const price = prices[id];
        if (price == null) continue;
        const arr = prev[sym] ?? [];
        next[sym] = [...arr, { time, price }].slice(-30);
      }
      return next;
    });
  }, [prices]);

  const len = Math.max(...selected.map(s => (history[s] ?? []).length), 0);
  const chartData = Array.from({ length: len }, (_, i) => {
    const entry: Record<string, string | number> = {};
    for (const sym of selected) {
      const arr = history[sym] ?? [];
      const pt = arr[i];
      if (pt) { entry[sym] = pt.price; entry.time = pt.time; }
    }
    return entry;
  });

  return (
    <div className="card">
      <h2>Price Chart (EUR)</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TOP.map(sym => (
          <button key={sym} onClick={() =>
            setSelected(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym].slice(0, 5))
          } style={{
            padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            border: `1px solid ${selected.includes(sym) ? '#58a6ff' : '#30363d'}`,
            background: selected.includes(sym) ? 'rgba(88,166,255,0.15)' : 'transparent',
            color: selected.includes(sym) ? '#58a6ff' : '#8b949e',
          }}>
            {sym}
          </button>
        ))}
      </div>
      {chartData.length === 0
        ? <p style={{ color: '#8b949e', textAlign: 'center', padding: 40 }}>Waiting for price data...</p>
        : <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8b949e' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8b949e' }} width={80} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }} />
              <Legend />
              {selected.map((sym, i) => (
                <Line key={sym} type="monotone" dataKey={sym} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
      }
    </div>
  );
}
