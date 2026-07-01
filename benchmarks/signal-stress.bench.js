// signal-stress.bench.js — 500 sessions x 7 signals. Deterministic output, < 200MB memory.
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

const SESSION_COUNT = 500;
const contexts = [];
for (let i = 0; i < SESSION_COUNT; i++) {
  contexts.push({
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
  });
}

const memBefore = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0;
const start = Date.now();
const results = new Map();

for (const ctx of contexts) {
  const winner = getStrongest(ctx);
  results.set(winner.signal, (results.get(winner.signal) || 0) + 1);
}

const totalTime = Date.now() - start;
const memAfter = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0;
const memDelta = memAfter - memBefore;

const signalCounts = Object.fromEntries(results);
console.log(JSON.stringify({
  name: 'signal-stress',
  metrics: {
    sessions: SESSION_COUNT,
    signals_per_session: 7,
    total_computations: SESSION_COUNT * 7,
    time_ms: totalTime,
    memory_delta_mb: Math.round(memDelta * 100) / 100,
    distribution: signalCounts,
  },
  pass: memDelta < 200,
  message: `${SESSION_COUNT} sessions x 7 signals in ${totalTime}ms, memory delta: ${memDelta.toFixed(2)}MB. Distribution: ${JSON.stringify(signalCounts)}`,
}));
