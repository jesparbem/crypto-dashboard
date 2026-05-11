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
