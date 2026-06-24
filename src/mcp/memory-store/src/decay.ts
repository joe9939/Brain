export const DECAY_LAMBDAS: Record<string, number> = {
  episodic: 0.05, procedural: 0.15, semantic: 0.02, working: 0.3,
};
export function applyDecay(score: number, type: string, lastAccessed: string): number {
  const lambda = DECAY_LAMBDAS[type] || 0.1;
  const lastAccess = new Date(lastAccessed).getTime();
  const now = Date.now();
  const daysSince = (now - lastAccess) / (1000 * 60 * 60 * 24);
  return score * Math.exp(-lambda * daysSince);
}
export function getDecayThreshold(days: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}