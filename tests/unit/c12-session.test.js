module.exports = {
  name: 'C12: session',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var hooks = await import('../../src/plugin/brain-hooks.mjs');

      // Separate sessions have separate state
      var sid1 = 'c12-a-' + Date.now();
      var sid2 = 'c12-b-' + Date.now();

      hooks.onMessage(sid1, 'first session message');
      hooks.onMessage(sid2, 'second session message');

      var s1 = hooks.getMentalState(sid1);
      var s2 = hooks.getMentalState(sid2);

      results.push({ name: 'Session 1 cycle=1', pass: s1.cycle === 1 });
      results.push({ name: 'Session 2 cycle=1', pass: s2.cycle === 1 });
      results.push({ name: 'Sessions are different objects', pass: s1 !== s2 });

      // Modify session 1 only — session 2 unaffected
      hooks.onMessage(sid1, 'second message to session 1');
      var s1b = hooks.getMentalState(sid1);
      var s2b = hooks.getMentalState(sid2);

      results.push({ name: 'Session 1 cycle=2 (incremented)', pass: s1b.cycle === 2 });
      results.push({ name: 'Session 2 cycle still=1 (unaffected)', pass: s2b.cycle === 1 });

      // L1 agents isolated per session
      hooks.onToolAfter(sid1, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5, score: 3 }));
      hooks.onToolAfter(sid1, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL', intensity: 0.3 }));

      var s1c = hooks.getMentalState(sid1);
      var s2c = hooks.getMentalState(sid2);

      results.push({ name: 'Session 1 has L1 agents (size=2)', pass: s1c.l1.size === 2 });
      results.push({ name: 'Session 2 L1 is empty', pass: s2c.l1.size === 0 });

      // Working memory isolated per session
      hooks.onToolAfter(sid2, 'task', { category: 'brain-hippocampus' }, JSON.stringify({ relevant_sops: ['sop1'], episodic: ['ep1'] }));

      var wm1 = hooks.getWorkingMemory(sid1);
      var wm2 = hooks.getWorkingMemory(sid2);

      results.push({ name: 'Session 1 has thalamus in wm', pass: wm1 && wm1['thalamus'] !== undefined });
      results.push({ name: 'Session 1 does NOT have hippocampus from session 2', pass: wm1 && wm1['hippocampus'] === undefined });
      results.push({ name: 'Session 2 has hippocampus in wm', pass: wm2 && wm2['hippocampus'] !== undefined });
      results.push({ name: 'Session 2 does NOT have thalamus from session 1', pass: wm2 && wm2['thalamus'] === undefined });

      // Signal summaries differ between sessions
      hooks.onToolAfter(sid1, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'URGENT', confidence: 0.9, valence: -0.8, arousal: 0.95 }));
      var sig1 = hooks.getStrongestSignal(sid1);
      var sig2 = hooks.getStrongestSignal(sid2);
      results.push({ name: 'Session 1 signal computed', pass: Array.isArray(sig1) });
      results.push({ name: 'Session 2 signal computed', pass: Array.isArray(sig2) });

      var summary1 = hooks.getSignalSummary(sid1);
      var summary2 = hooks.getSignalSummary(sid2);
      results.push({ name: 'Signal summaries differ between sessions', pass: summary1 !== summary2 });

      // Memory leak check: S_Map per session does not accumulate orphan sessions
      // 100 sessions should be independently accessible
      var manySids = [];
      for (var i = 0; i < 100; i++) {
        var s = 'c12-stress-' + i + '-' + Date.now();
        manySids.push(s);
        hooks.onMessage(s, 'stress test ' + i);
        hooks.onToolAfter(s, 'task', { category: 'brain-thalamus' }, JSON.stringify({ mode: 'NORMAL', confidence: 0.5 }));
      }
      var allAccessible = manySids.every(function(s) { var st = hooks.getMentalState(s); return st && st.cycle === 1; });
      results.push({ name: 'All 100 stress sessions accessible', pass: allAccessible });

      // Verify independent cycles across stress sessions
      hooks.onMessage(manySids[0], 'extra message');
      hooks.onMessage(manySids[50], 'extra message');
      var firstHas2 = hooks.getMentalState(manySids[0]).cycle === 2;
      var midHas2 = hooks.getMentalState(manySids[50]).cycle === 2;
      var otherStays1 = true;
      for (var k = 1; k < 100; k++) {
        if (k === 50) continue;
        if (hooks.getMentalState(manySids[k]).cycle !== 1) { otherStays1 = false; break; }
      }
      results.push({ name: 'Stress sessions independently incremented', pass: firstHas2 && midHas2 && otherStays1 });

      // Signal computation works on all stress sessions
      var allSignalOk = manySids.every(function(s) { return Array.isArray(hooks.getStrongestSignal(s)); });
      results.push({ name: 'Signal computation works on all stress sessions', pass: allSignalOk });

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.map(function(r) { return (r.pass ? 'PASS' : 'FAIL') + ' ' + r.name; }).join('\n'), time_ms: Date.now() - start };
  },
};

if (require.main === module) {
  module.exports.run().then(function(r) { console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); });
}
