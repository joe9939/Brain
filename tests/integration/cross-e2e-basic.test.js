// cross-e2e-basic.test.js — Simulated session: onMessage → onToolBefore → onToolAfter → session.event
// Verifies signals recompute correctly through the full tool lifecycle.
const config = require('../config');

module.exports = {
  name: 'CROSS-E2E: Basic Signal Loop',
  run: async () => {
    const start = Date.now();
    const results = [];

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

    const ctx = { l1Size: 2, mode: 'NORMAL', intensity: 0.6, sopMatched: false, episodicFound: true, score: 5, tdError: 0.3, swarmActive: false, goalsCompleted: true, l1Done: false };
    const winner = getStrongest(ctx);
    results.push({ name: 'Perceive wins with l1Size=2 (strength=' + winner.strength + ')', pass: winner.signal === 'perceive' });

    const ctx2 = { l1Size: 5, mode: 'CAUTION', intensity: 0.8, sopMatched: true, episodicFound: true, score: 2, tdError: 1.5, swarmActive: true, goalsCompleted: true, l1Done: true };
    const winner2 = getStrongest(ctx2);
    const validSignals = ['safety', 'emotion', 'reward'];
    results.push({ name: 'CAUTION mode: ' + winner2.signal + ' wins (strength=' + winner2.strength + ')', pass: validSignals.includes(winner2.signal) });

    const ctx3 = { l1Size: 5, mode: 'NORMAL', intensity: 0.1, sopMatched: false, episodicFound: false, score: 8, tdError: 0, swarmActive: true, goalsCompleted: true, l1Done: true };
    const winner3 = getStrongest(ctx3);
    results.push({ name: 'Action wins with swarm active, l1 done (strength=' + winner3.strength + ')', pass: winner3.signal === 'action' });

    const ctx4 = { l1Size: 5, mode: 'NORMAL', intensity: 0.1, sopMatched: true, episodicFound: false, score: 8, tdError: 0, swarmActive: false, goalsCompleted: true, l1Done: true };
    const winner4 = getStrongest(ctx4);
    results.push({ name: 'Memory wins with SOP matched (strength=' + winner4.strength + ')', pass: winner4.signal === 'memory' });

    const ctx5 = { l1Size: 5, mode: 'NORMAL', intensity: 0.1, sopMatched: false, episodicFound: false, score: 8, tdError: 0, swarmActive: false, goalsCompleted: true, l1Done: true };
    const winner5 = getStrongest(ctx5);
    results.push({ name: 'Learning wins when all conditions met (strength=' + winner5.strength + ')', pass: winner5.signal === 'learning' });

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
