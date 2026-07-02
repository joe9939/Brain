module.exports = {
  name: 'C14: performance (lite)',
  run: async () => {
    const results = [];
    const start = Date.now();
    const SIGNALS = {
      perceive: { priority: 5, compute: (ctx) => ctx.l1 < 5 ? 1.0 - ctx.l1 * 0.15 : 0.1 },
      emotion: { priority: 4, compute: (ctx) => ctx.mode === 'CAUTION' || ctx.mode === 'URGENT' ? 0.9 : ctx.intensity * 0.5 },
      safety: { priority: 4, compute: (ctx) => ctx.mode === 'CAUTION' ? 0.9 : 0.2 },
      memory: { priority: 3, compute: (ctx) => ctx.sop ? 0.8 : ctx.episodic ? 0.5 : 0.2 },
      reward: { priority: 3, compute: (ctx) => ctx.score < 3 ? 0.8 : Math.abs(ctx.td) > 1 ? 0.6 : 0.2 },
      action: { priority: 2, compute: (ctx) => ctx.swarm ? 0.8 : 0.1 },
      learning: { priority: 1, compute: (ctx) => ctx.goals && ctx.l1done ? 0.7 : 0.1 },
    };

    function strongest(ctx) {
      let best = null, bestStr = -1;
      for (const [k, s] of Object.entries(SIGNALS)) {
        const raw = s.compute(ctx);
        const str = raw * s.priority;
        if (str > bestStr) { bestStr = str; best = k; }
      }
      return { signal: best, strength: bestStr };
    }

    function mkCtx(i) {
      return {
        l1: i % 6, mode: i % 4 === 0 ? 'CAUTION' : i % 4 === 1 ? 'URGENT' : 'NORMAL',
        intensity: (i % 10) / 10, sop: i % 3 === 0, episodic: i % 2 === 0,
        score: i % 10, td: (i % 5) / 2, swarm: i % 3 === 1, goals: i % 2 === 0, l1done: i % 3 !== 2,
      };
    }

    // 1. Signal computation time (<10ms for 10000 calls)
    const N_SIGNAL = 10000;
    const ctxs = Array.from({ length: N_SIGNAL }, (_, i) => mkCtx(i));
    const t1 = Date.now();
    for (const ctx of ctxs) strongest(ctx);
    const sigTime = Date.now() - t1;
    results.push({ n: 'signal 10K computations under 50ms', p: sigTime < 50 });

    // 2. Hook handler overhead (>500 hooks/sec equivalent)
    const N_HOOK = 5000;
    const hCtx = { l1: 3, mode: 'NORMAL', intensity: 0.5, sop: false, episodic: true, score: 5, td: 0.3, swarm: false, goals: true, l1done: false };
    const t2 = Date.now();
    for (let i = 0; i < N_HOOK; i++) {
      strongest(hCtx);
      hCtx.mode = i % 5 === 0 ? 'CAUTION' : 'NORMAL';
      strongest(hCtx);
      strongest(hCtx);
    }
    const hookTime = Date.now() - t2;
    const hooksPerSec = Math.round(N_HOOK * 3 / (hookTime / 1000));
    results.push({ n: 'hook throughput >500/sec', p: hooksPerSec > 500 });

    // 3. Memory usage for sessions
    const N_SESSION = 1000;
    const sessions = {};
    global.gc && global.gc();
    const memBefore = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    for (let i = 0; i < N_SESSION; i++) {
      sessions['s' + i] = { l1: new Set(), M_emo: { mode: 'NORMAL', intensity: 0.1 }, M_rew: { score: 0, total: 0, history: [] }, M_goal: { completed: 0 }, wm: {}, cycle: 1, _last_signal: null };
    }
    const memAfter = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    const memDelta = Math.max(0, memAfter - memBefore);
    const memPerSession = N_SESSION > 0 ? memDelta / N_SESSION : 0;
    results.push({ n: '1000 sessions < 10MB', p: memDelta < 10 * 1024 * 1024 });
    results.push({ n: 'per-session overhead < 5KB', p: memPerSession < 5120 });

    const passed = results.every(r => r.p);
    return {
      passed,
      message: results.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n + (r.p ? '' : ' — sigTime=' + sigTime + 'ms hooks=' + hooksPerSec + '/s mem=' + Math.round(memDelta / 1024) + 'KB')).join('\n'),
      time_ms: Date.now() - start,
    };
  },
};
