// hook-throughput.bench.js — 1K before/after cycles. > 500 hooks/sec.
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

function simulateHookCycle(ctx) {
  const winner = getStrongest(ctx);
  ctx.lastSignal = winner.signal;
  ctx.l1Size = Math.max(0, ctx.l1Size + (winner.signal === 'perceive' ? -1 : 1));
  return winner;
}

const CYCLES = 1000;
const ctx = { l1Size: 3, mode: 'NORMAL', intensity: 0.5, sopMatched: false, episodicFound: true, score: 5, tdError: 0.3, swarmActive: false, goalsCompleted: true, l1Done: false, lastSignal: null };

const start = Date.now();
let totalHooks = 0;

for (let cycle = 0; cycle < CYCLES; cycle++) {
  // Simulate T3 (onMessage)
  totalHooks++;
  ctx.mode = cycle % 5 === 0 ? 'CAUTION' : 'NORMAL';

  // Simulate T1 (onToolBefore) — signal injection
  totalHooks++;
  const before = simulateHookCycle(ctx);

  // Simulate T2 (onToolAfter) — parse results, update state, recompute
  totalHooks++;
  const after = simulateHookCycle(ctx);

  // Simulate T4 (sessionEvent) — lifecycle events
  totalHooks++;
  if (cycle % 10 === 0) {
    simulateHookCycle(ctx);
    totalHooks++;
  }
}

const elapsed = Date.now() - start;
const throughput = Math.round(totalHooks / (elapsed / 1000));

console.log(JSON.stringify({
  name: 'hook-throughput',
  metrics: {
    cycles: CYCLES,
    total_hooks: totalHooks,
    time_ms: elapsed,
    hooks_per_sec: throughput,
  },
  pass: throughput > 500,
  message: `${totalHooks} hooks in ${elapsed}ms = ${throughput} hooks/sec`,
}));
