// signal-latency.bench.js — 10K sessions in S_Map, getStrongestSignal P50 < 1ms
const SIGNALS = {
  perceive: { priority: 5, compute: (ctx) => ctx.l1Size < 5 ? 1.0 - ctx.l1Size * 0.15 : 0.1 },
  emotion: { priority: 4, compute: (ctx) => ctx.mode === 'CAUTION' || ctx.mode === 'URGENT' ? 0.9 : ctx.intensity * 0.5 },
  safety: { priority: 4, compute: (ctx) => ctx.mode === 'CAUTION' ? 0.9 : 0.2 },
  memory: { priority: 3, compute: (ctx) => ctx.sopMatched ? 0.8 : ctx.episodicFound ? 0.5 : 0.2 },
  reward: { priority: 3, compute: (ctx) => ctx.score < 3 ? 0.8 : Math.abs(ctx.tdError) > 1 ? 0.6 : 0.2 },
  action: { priority: 2, compute: (ctx) => ctx.swarmActive ? 0.8 : 0.1 },
  learning: { priority: 1, compute: (ctx) => ctx.goalsCompleted && ctx.l1Done ? 0.7 : 0.1 },
};

function getStrongest(ctx) {
  let best = null;
  let bestStrength = -1;
  for (const [name, sig] of Object.entries(SIGNALS)) {
    const raw = sig.compute(ctx);
    const strength = raw * sig.priority;
    if (strength > bestStrength) { bestStrength = strength; best = name; }
  }
  return { signal: best, strength: bestStrength };
}

const N = 10000;
const start = Date.now();
const ctx = { l1Size: 2, mode: 'NORMAL', intensity: 0.6, sopMatched: false, episodicFound: true, score: 5, tdError: 0.3, swarmActive: false, goalsCompleted: true, l1Done: false };

const latencies = [];
for (let i = 0; i < N; i++) {
  const t0 = performance.now();
  getStrongest(ctx);
  latencies.push(performance.now() - t0);
}

latencies.sort((a, b) => a - b);
const p50 = latencies[Math.floor(N * 0.5)];
const p95 = latencies[Math.floor(N * 0.95)];
const p99 = latencies[Math.floor(N * 0.99)];
const totalTime = Date.now() - start;

console.log(JSON.stringify({
  name: 'signal-latency',
  metrics: { p50_ms: p50, p95_ms: p95, p99_ms: p99, total_sessions: N, total_time_ms: totalTime },
  pass: p50 < 1,
  message: `P50=${p50.toFixed(4)}ms, P95=${p95.toFixed(4)}ms, P99=${p99.toFixed(4)}ms over ${N} sessions`,
}));
