module.exports = {
  name: 'PLUGIN: Session Accumulation',
  run: async () => {
    const start = Date.now();
    const results = [];
    try {
      const h = await import('../../src/plugin/brain-hooks.mjs');

      // 1. 1000 sessions via onMessage + getMentalState
      {
        let allOk = true;
        for (let i = 0; i < 1000; i++) {
          const sid = 'sa1-' + i + '-' + Date.now();
          h.onMessage(sid, 'msg ' + i);
          const s = h.getMentalState(sid);
          if (!s || s.cycle !== 1) { allOk = false; break; }
        }
        results.push({ name: '1000 sessions created without error', pass: allOk });
      }

      // 2. Many sessions do not break state isolation (random access pattern)
      {
        const sids = [];
        for (let i = 0; i < 500; i++) {
          const sid = 'sa2-' + i;
          sids.push(sid);
          h.onMessage(sid, 'msg ' + i);
          h.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, JSON.stringify({ score: i }));
        }
        let allCorrect = true;
        for (let i = 0; i < 500; i++) {
          const s = h.getMentalState(sids[i]);
          if (!s || s.cycle !== 1) { allCorrect = false; break; }
        }
        results.push({ name: 'Session isolation with 500 sessions', pass: allCorrect });
      }

      // 3. getStrongestSignal works after many sessions
      {
        const sid = 'sa3-last';
        h.onMessage(sid, 'test signal');
        const sig = h.getStrongestSignal(sid);
        results.push({
          name: 'getStrongestSignal after many sessions',
          pass: Array.isArray(sig) && sig.some(m => m.content?.includes('Parallel Perception')),
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
