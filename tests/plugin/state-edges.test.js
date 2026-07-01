module.exports = {
  name: 'PLUGIN: State Edges',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');

      // 1. getStrongestSignal(null) returns []
      {
        const sig = h.getStrongestSignal(null);
        results.push({ name: 'getStrongestSignal(null) returns []', pass: Array.isArray(sig) && sig.length === 0 });
      }

      // 2. onToolAfter with empty output text does not throw
      {
        const sid = 'se2-' + Date.now();
        h.onMessage(sid, 'test');
        let threw = false;
        try { h.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, ''); } catch (e) { threw = true; }
        results.push({ name: 'onToolAfter empty text no throw', pass: !threw });
      }

      // 3. td_error > 1 triggers reward signal via high |td_error|
      {
        const sid = 'se3-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        const s = h.getMentalState(sid);
        s.M_rew.score = 10;
        h.onToolAfter(sid, 'bash', {}, 'PASS');
        // td_error = 10 - 10 = 0 (prev captured before goal increment, current unchanged)
        // Manually set to verify reward fires on |td_error| > 1
        s.td_error = 5;
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'td_error > 1 triggers reward signal',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('Reward')),
        });
      }

      // 4. Rapid state updates keep state coherent
      {
        const sid = 'se4-' + Date.now();
        h.onMessage(sid, 'test');
        let threw = false;
        try {
          for (let i = 0; i < 100; i++) {
            h.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', score: i % 5 }));
            h.onToolAfter(sid, 'bash', {}, 'DONE');
          }
        } catch (e) { threw = true; }
        const state = h.getMentalState(sid);
        results.push({ name: 'Rapid updates keep state coherent', pass: !threw && typeof state.M_goal.completed === 'number' });
      }

      // 5. onMessage("") empty string does not crash
      {
        const sid = 'se5-' + Date.now();
        let threw = false;
        try { h.onMessage(sid, ''); } catch (e) { threw = true; }
        const s = h.getMentalState(sid);
        results.push({ name: 'onMessage("") no crash', pass: !threw && s && s.cycle === 1 });
      }

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return { passed, message: passed ? 'All ' + results.length + ' checks passed' : 'Fail: ' + failed.join(', '), time_ms: Date.now() - start };
  },
};
