module.exports = {
  name: 'PLUGIN: Signal Dedup',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');
      const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
      const fireL1 = (sid) => {
        for (const cat of L1) h.onToolAfter(sid, 'task', { category: cat }, '{}');
      };

      // 1. Same winner twice returns []
      {
        const sid = 'dd1-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireL1(sid);
        const sig1 = h.getStrongestSignal(sid);
        const sig2 = h.getStrongestSignal(sid);
        results.push({
          name: 'Same winner twice returns []',
          pass: Array.isArray(sig1) && sig1.length > 0 && Array.isArray(sig2) && sig2.length === 0,
        });
      }

      // 2. Winner changes = new instruction
      {
        const sid = 'dd2-' + Date.now();
        h.onMessage(sid, 'test');
        h.getStrongestSignal(sid);
        fireL1(sid);
        h.getStrongestSignal(sid); // consume post-L1 signal
        h.getStrongestSignal(sid); // dedup
        const s = h.getMentalState(sid);
        s.td_error = 5;
        s.M_rew.score = 2;
        s.M_emo.mode = 'CAUTION';
        const sig3 = h.getStrongestSignal(sid);
        results.push({
          name: 'Winner change returns new instruction',
          pass: Array.isArray(sig3) && sig3.length > 0,
        });
      }

      // 3. onMessage resets _last_signal so perceive fires again
      {
        const sid = 'dd3-' + Date.now();
        h.onMessage(sid, 'test');
        const sig1 = h.getStrongestSignal(sid);
        h.onMessage(sid, 'new input');
        const sig2 = h.getStrongestSignal(sid);
        results.push({
          name: 'onMessage resets dedup',
          pass: Array.isArray(sig1) && sig1.length > 0 && Array.isArray(sig2) && sig2.some(m => m.content?.includes('Parallel Perception')),
        });
      }

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);
    return { passed, message: passed ? 'All ' + results.length + ' checks passed' : 'Fail: ' + failed.join(', '), time_ms: Date.now() - start };
  },
};
