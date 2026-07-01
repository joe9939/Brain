// signal-throughput.bench.js — Signal throughput benchmark
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

function simulateSignalContext(i) {
  return {
    l1Size: i % 6,
    mode: i % 4 === 0 ? 'CAUTION' : i % 4 === 1 ? 'URGENT' : 'NORMAL',
    intensity: (i % 10) / 10,
    sopMatched: i % 3 === 0,
    episodicFound: i % 2 === 0,
    score: i % 10,
    tdError: (i % 5) / 2,
    swarmActive: i % 3 === 1,
    goalsCompleted: i % 2 === 0,
    l1Done: i % 3 !== 2,
  };
}

const BATCHES = [100, 1000, 10000, 50000];
const allResults = {};

for (const N of BATCHES) {
  const latencies = [];
  const contexts = [];
  for (let i = 0; i < N; i++) contexts.push(simulateSignalContext(i));

  const t0 = performance.now();
  for (const ctx of contexts) {
    const t1 = performance.now();
    getStrongest(ctx);
    latencies.push(performance.now() - t1);
  }
  const totalTime = performance.now() - t0;

  latencies.sort((a, b) => a - b);
  allResults[`n${N}`] = {
    total_time_ms: Math.round(totalTime * 100) / 100,
    throughput_per_sec: Math.round(N / (totalTime / 1000)),
    p50_ms: latencies[Math.floor(N * 0.5)],
    p95_ms: latencies[Math.floor(N * 0.95)],
    p99_ms: latencies[Math.floor(N * 0.99)],
    avg_ms: latencies.reduce((s, v) => s + v, 0) / N,
  };
}

console.log(JSON.stringify({
  name: 'signal-throughput',
  metrics: allResults,
  pass: Object.values(allResults).every(r => r.throughput_per_sec > 50000),
  message: `${BATCHES.map(n => `${n}: ${allResults['n' + n].throughput_per_sec}/s`).join(', ')}`,
}));
