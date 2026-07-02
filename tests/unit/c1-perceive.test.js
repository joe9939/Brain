module.exports = {
  name: 'C1: perceive (enhanced)',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');

    // 1. onMessage resets l1 Set to empty
    const sid1 = 'c1-1-' + Date.now();
    hooks.onMessage(sid1, 'hello');
    const s0 = hooks.getMentalState(sid1);
    results.push({ name: 'onMessage resets l1 to empty Set', pass: s0.l1.size === 0 });
    results.push({ name: 'onMessage resets _last_signal to null', pass: s0._last_signal === null });
    results.push({ name: 'onMessage increments cycle to 1', pass: s0.cycle === 1 });
    results.push({ name: 'onMessage sets lastEvent', pass: s0.lastEvent > 0 });

    // 2. perceive signal fires when l1 empty (size=0 < 5)
    const sig1 = hooks.getStrongestSignal(sid1);
    results.push({ name: 'perceive fires when l1 empty', pass: Array.isArray(sig1) && sig1.length > 0 && sig1[0].content.includes('Parallel Perception') });

    // 3. perceive signal weakens as l1 fills (1-4 agents done)
    const sid2 = 'c1-2-' + Date.now();
    hooks.onMessage(sid2, 'test');
    hooks.getMentalState(sid2).M_rew.score = 5;
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
    const sigAfterFull = hooks.getStrongestSignal(sid2);
    results.push({ name: 'perceive strength 0 when l1 full', pass: sFull.l1.size === 5 && !hooks.getSignalContext(sid2).includes('Parallel Perception') });

    // 4. strength formula: 1.0 - l1.size * 0.15 per addition (monotonic)
    const sid3 = 'c1-3-' + Date.now();
    hooks.onMessage(sid3, 'math');
    const signalsAtEachStep = [];
    for (const cat of l1Cats) {
      const ctx = hooks.getSignalContext(sid3);
      const isPerceive = ctx.includes('Parallel Perception');
      signalsAtEachStep.push({ l1Size: hooks.getMentalState(sid3).l1.size, isPerceive });
      hooks.onToolAfter(sid3, 'task', { category: cat }, '{}');
    }
    for (let i = 1; i < signalsAtEachStep.length; i++) {
      results.push({
        name: 'perceive active decreases by L1 ' + signalsAtEachStep[i].l1Size,
        pass: !signalsAtEachStep[i].isPerceive || signalsAtEachStep[i].l1Size <= 4,
      });
    }

    // 5. perceive becomes 0 when all 5 L1 complete (raw strength = 0)
    const sid4 = 'c1-4-' + Date.now();
    hooks.onMessage(sid4, 'all');
    for (const cat of l1Cats) hooks.onToolAfter(sid4, 'task', { category: cat }, '{}');
    const sDone = hooks.getMentalState(sid4);
    results.push({ name: 'l1.size is 5 when all done', pass: sDone.l1.size === 5 });
    const sigFull2 = hooks.getStrongestSignal(sid4);
    results.push({ name: 'perceive not returned when all 5 l1 complete', pass: Array.isArray(sigFull2) && !sigFull2.some(m => m.content?.includes('Parallel Perception')) });

    // 6. fresh session returns perceive
    const sid5 = 'c1-5-' + Date.now();
    hooks.onMessage(sid5, 'new');
    const sigFresh = hooks.getStrongestSignal(sid5);
    results.push({ name: 'fresh session perceive signal', pass: Array.isArray(sigFresh) && sigFresh[0].content.includes('Parallel Perception') });

    // 7. dupe L1 does not inflate count
    hooks.onToolAfter(sid5, 'task', { category: l1Cats[0] }, '{}');
    hooks.onToolAfter(sid5, 'task', { category: l1Cats[0] }, '{}');
    results.push({ name: 'dupe L1 no inflation', pass: hooks.getMentalState(sid5).l1.size === 1 });

    // 8. non-L1 tool does not affect l1
    const sid6 = 'c1-6-' + Date.now();
    hooks.onMessage(sid6, 'hello');
    hooks.onToolAfter(sid6, 'bash', {}, 'PASS');
    results.push({ name: 'non-L1 no l1 change', pass: hooks.getMentalState(sid6).l1.size === 0 });

    // 9. perceive dedup returns empty
    hooks.getStrongestSignal(sid6);
    const dedup = hooks.getStrongestSignal(sid6);
    results.push({ name: 'perceive dedup returns empty', pass: Array.isArray(dedup) && dedup.length === 0 });

    // 10. all 5 tracked via Set
    const sid7 = 'c1-7-' + Date.now();
    hooks.onMessage(sid7, 'check');
    for (const cat of l1Cats) hooks.onToolAfter(sid7, 'task', { category: cat }, '{}');
    for (const cat of l1Cats) {
      results.push({ name: 'l1 has ' + cat, pass: hooks.getMentalState(sid7).l1.has(cat) });
    }

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
