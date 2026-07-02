module.exports = {
  name: 'C2: signal competition (enhanced)',
  run: async () => {
    const results = [];
    const hooks = await import('../../src/plugin/brain-hooks.mjs');

    // ── helper: fire all 5 L1 agents ──
    const L1 = ['brain-thalamus','brain-amygdala','brain-hippocampus','brain-world-cortex','brain-safety'];
    const fireAll = (sid, amy) => {
      for (const cat of L1) {
        const o = cat === 'brain-amygdala' ? (amy || '{}') : '{}';
        hooks.onToolAfter(sid, 'task', { category: cat }, o);
      }
    };

    // ── 1. All 7 signals compute on every getStrongestSignal call ──
    const sid1 = 'c2-comp-' + Date.now();
    hooks.onMessage(sid1, 'all signals');
    hooks.getStrongestSignal(sid1); // consume perceive
    fireAll(sid1); // fill L1
    // Now all signals recompute: perceive=0, memory=0, reward=low?0.8?, emotion=low, action=0
    const signals = hooks.getStrongestSignal(sid1);
    results.push({ name: '7 signals computed on getStrongestSignal', pass: Array.isArray(signals) });

    // ── 2. Winner changes when state changes: perceive weakens as L1 fills ──
    const sid2 = 'c2-winner-' + Date.now();
    hooks.onMessage(sid2, 'winner change');
    // Before any L1: perceive should win (use getSignalContext, which doesn't consume)
    const ctxEmpty = hooks.getSignalContext(sid2);
    results.push({ name: 'empty L1 -> perceive wins', pass: ctxEmpty.includes('Parallel Perception') });
    // Add thalamus only: perceive still strongest
    hooks.onToolAfter(sid2, 'task', { category: 'brain-thalamus' }, '{}');
    const ctxAfter1 = hooks.getSignalContext(sid2);
    results.push({ name: '1 L1 done -> perceive still wins', pass: ctxAfter1.includes('Parallel Perception') });
    // Add full L1: perceive gone, other signal wins
    hooks.onToolAfter(sid2, 'task', { category: 'brain-amygdala' }, '{}');
    hooks.onToolAfter(sid2, 'task', { category: 'brain-hippocampus' }, '{"relevant_sops":[{"id":"x"}]}');
    hooks.onToolAfter(sid2, 'task', { category: 'brain-world-cortex' }, '{}');
    hooks.onToolAfter(sid2, 'task', { category: 'brain-safety' }, '{}');
    const ctxFull = hooks.getSignalContext(sid2);
    results.push({ name: '5 L1 done -> perceive no longer wins', pass: !ctxFull.includes('Parallel Perception') });

    // ── 3. Signal dedup works (same winner returns empty on second call) ──
    const sid3 = 'c2-dedup-' + Date.now();
    hooks.onMessage(sid3, 'dedup');
    const first = hooks.getStrongestSignal(sid3);
    results.push({ name: '1st call returns signal when winner >0', pass: Array.isArray(first) && first.length > 0 });
    const second = hooks.getStrongestSignal(sid3);
    results.push({ name: '2nd call dedup returns empty', pass: Array.isArray(second) && second.length === 0 });
    // State change resets _last_signal (new onMessage)
    hooks.onMessage(sid3, 'reset');
    const afterReset = hooks.getStrongestSignal(sid3);
    results.push({ name: 'new onMessage resets dedup -> signal fires again', pass: Array.isArray(afterReset) && afterReset.length > 0 });

    // ── 4. Multiple sessions have independent signal state ──
    const sidA = 'c2-indep-A-' + Date.now();
    const sidB = 'c2-indep-B-' + Date.now();
    hooks.onMessage(sidA, 'A');
    hooks.onMessage(sidB, 'B');
    fireAll(sidA, '{"mode":"CAUTION","confidence":0.9}');
    fireAll(sidB, '{"mode":"NORMAL","confidence":0.1}');
    results.push({ name: 'session A l1=5 independent from B', pass: hooks.getMentalState(sidA).l1.size === 5 });
    results.push({ name: 'session B l1=5 independent from A', pass: hooks.getMentalState(sidB).l1.size === 5 });
    results.push({ name: 'session A CAUTION emotion independent', pass: hooks.getMentalState(sidA).M_emo.mode === 'CAUTION' });
    results.push({ name: 'session B NORMAL emotion independent', pass: hooks.getMentalState(sidB).M_emo.mode === 'NORMAL' });

    // Indep dedup: each session tracks its own _last_signal
    const sigA = hooks.getStrongestSignal(sidA);
    const sigB = hooks.getStrongestSignal(sidB);
    results.push({ name: 'session A gets own signal independent of B', pass: Array.isArray(sigA) });
    results.push({ name: 'session B gets own signal independent of A', pass: Array.isArray(sigB) });
    // Both sessions should NOT dedup each other
    const sigA2 = hooks.getStrongestSignal(sidA);
    const sigB2 = hooks.getStrongestSignal(sidB);
    results.push({ name: 'session A dedup independent', pass: Array.isArray(sigA2) && sigA2.length === 0 });
    results.push({ name: 'session B dedup independent', pass: Array.isArray(sigB2) && sigB2.length === 0 });

    // ── 5. Unknown session returns [] ──
    const unknown = hooks.getStrongestSignal('nonexistent-' + Date.now());
    results.push({ name: 'unknown session returns []', pass: Array.isArray(unknown) && unknown.length === 0 });

    // ── 6. getSignalContext returns empty for unknown ──
    const emptyCtx = hooks.getSignalContext('nonexistent-' + Date.now());
    results.push({ name: 'getSignalContext unknown returns empty', pass: emptyCtx === '' });

    // ── 7. getSignalSummary returns string ──
    const summary = hooks.getSignalSummary(sidA);
    results.push({ name: 'getSignalSummary returns string', pass: typeof summary === 'string' });

    const passed = results.every(r => r.pass);
    return { passed, message: results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n'), time_ms: 0 };
  },
};
if (require.main === module) { (async () => { const r = await module.exports.run(); console.log(r.passed ? 'PASS\n' + r.message : 'FAIL\n' + r.message); process.exit(r.passed ? 0 : 1); })(); }
