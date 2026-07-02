module.exports = {
  name: 'C1: perceive',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');

    // 1. onMessage resets signal state
    const sid1 = 'c1-1-' + Date.now();
    hooks.onMessage(sid1, 'hello');
    const s0 = hooks.getMentalState(sid1);
    results.push({ name: 'onMessage resets l1 to empty Set', pass: s0.l1.size === 0 });
    results.push({ name: 'onMessage resets _last_signal to null', pass: s0._last_signal === null });
    results.push({ name: 'onMessage increments cycle', pass: s0.cycle === 1 });

    // 2. perceive signal fires when l1 empty
    const sig1 = hooks.getStrongestSignal(sid1);
    results.push({ name: 'perceive fires when l1 empty', pass: Array.isArray(sig1) && sig1.length > 0 && sig1[0].content.includes('Parallel Perception') });

    // 3. perceive signal strength decreases as l1 fills (verify via getSignalContext, no dedup)
    const sid2 = 'c1-2-' + Date.now();
    hooks.onMessage(sid2, 'test');
    hooks.getMentalState(sid2).M_rew.score = 5; // suppress reward signal
    const l1Cats = ['brain-thalamus', 'brain-amygdala', 'brain-hippocampus', 'brain-world-cortex', 'brain-safety'];
    for (let i = 0; i < l1Cats.length; i++) {
      if (i > 0) {
        const ctxBefore = hooks.getSignalContext(sid2);
        const stillPerceiving = ctxBefore.includes('Parallel Perception');
        results.push({ name: 'perceive active before L1 ' + i, pass: stillPerceiving });
      }
      hooks.onToolAfter(sid2, 'task', { category: l1Cats[i] }, '{}');
    }
    const sFull = hooks.getMentalState(sid2);
    results.push({ name: 'perceive strength 0 when l1 full', pass: sFull.l1.size === 5 && !hooks.getSignalContext(sid2).includes('Parallel Perception') });

    // 4. strength formula: 1.0 - l1.size * 0.15 per addition, monotonic decrease
    const sid3 = 'c1-3-' + Date.now();
    hooks.onMessage(sid3, 'math');
    const prevStrengths = [];
    for (const cat of l1Cats) {
      const ctx = hooks.getSignalContext(sid3);
      const isPerceive = ctx.includes('Parallel Perception');
      prevStrengths.push({ l1Size: hooks.getMentalState(sid3).l1.size, isPerceive });
      hooks.onToolAfter(sid3, 'task', { category: cat }, '{}');
    }
    for (let i = 1; i < prevStrengths.length; i++) {
      results.push({
        name: 'perceive active decreases by L1 ' + prevStrengths[i].l1Size,
        pass: !prevStrengths[i].isPerceive || prevStrengths[i].l1Size <= 4,
      });
    }

    // 5. fresh session returns perceive
    const sid4 = 'c1-4-' + Date.now();
    hooks.onMessage(sid4, 'new');
    const sigFresh = hooks.getStrongestSignal(sid4);
    results.push({ name: 'fresh session perceive signal', pass: Array.isArray(sigFresh) && sigFresh[0].content.includes('Parallel Perception') });

    // 6. dedup
    const sigDedup = hooks.getStrongestSignal(sid4);
    results.push({ name: 'perceive dedup returns empty', pass: Array.isArray(sigDedup) && sigDedup.length === 0 });

    // 7. non-L1 tool does not affect l1
    const sid5 = 'c1-5-' + Date.now();
    hooks.onMessage(sid5, 'hello');
    hooks.getStrongestSignal(sid5);
    hooks.onToolAfter(sid5, 'bash', {}, 'PASS');
    results.push({ name: 'non-L1 no l1 change', pass: hooks.getMentalState(sid5).l1.size === 0 });

    // 8. All 5 L1 complete tracking
    const sid6 = 'c1-6-' + Date.now();
    hooks.onMessage(sid6, 'all');
    hooks.getStrongestSignal(sid6);
    for (const cat of l1Cats) hooks.onToolAfter(sid6, 'task', { category: cat }, '{"status":"done"}');
    const sAll = hooks.getMentalState(sid6);
    results.push({ name: 'all 5 L1 tracked', pass: sAll.l1.size === 5 });
    for (const cat of l1Cats) {
      results.push({ name: 'l1 has ' + cat, pass: sAll.l1.has(cat) });
    }

    // 9. dupe L1 does not inflate count
    hooks.onToolAfter(sid6, 'task', { category: 'brain-thalamus' }, '{}');
    results.push({ name: 'dupe L1 no inflation', pass: hooks.getMentalState(sid6).l1.size === 5 });

    // 10. perceive signal NOT returned when l1 full (other signals like reward may fire)
    const sigFull = hooks.getStrongestSignal(sid6);
    results.push({ name: 'perceive not returned when l1 full', pass: Array.isArray(sigFull) && !sigFull.some(m => m.content?.includes('Parallel Perception')) });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
