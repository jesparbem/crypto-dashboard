import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StrategyStats { wins: number; losses: number; totalPnl: number; avgGain: number; avgLoss: number; }
interface Props { stats: Record<string, StrategyStats>; }

export function StrategyComparison({ stats }: Props) {
  const data = Object.entries(stats).map(([name, s]) => ({
    name,
    pnl: parseFloat(s.totalPnl.toFixed(2)),
    wins: s.wins,
    losses: s.losses,
    winRate: s.wins + s.losses > 0 ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0) + '%' : 'N/A',
  }));

  return (
    <div className="card">
      <h2>Strategy Comparison</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12 }} />
          <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} unit="€" />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
            formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v}€`, 'P&L']}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#3fb950' : '#f85149'} />)}
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
              <td className={d.pnl >= 0 ? 'positive' : 'negative'}>{d.pnl >= 0 ? '+' : ''}{d.pnl}€</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
