module.exports = {
  name: 'C12: session (real)',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];

    // 1. Two sessions have independent M_t state
    var s1 = 'c12r-a-' + Date.now();
    var s2 = 'c12r-b-' + Date.now();
    hooks.onMessage(s1, 'hello from s1');
    hooks.onMessage(s2, 'hello from s2');

    var st1 = hooks.getMentalState(s1);
    var st2 = hooks.getMentalState(s2);
    R.push({ n: '2 sessions — s1 cycle=1', p: st1.cycle === 1 });
    R.push({ n: '2 sessions — s2 cycle=1', p: st2.cycle === 1 });
    R.push({ n: '2 sessions — separate objects', p: st1 !== st2 });

    hooks.onMessage(s1, 'second msg');
    var st1b = hooks.getMentalState(s1);
    var st2b = hooks.getMentalState(s2);
    R.push({ n: '2 sessions — s1 incremented', p: st1b.cycle === 2 });
    R.push({ n: '2 sessions — s2 unaffected', p: st2b.cycle === 1 });

    // 2. Five sessions all independent
    var ids5 = [];
    for (var i = 0; i < 5; i++) {
      var id = 'c12r-5-' + i + '-' + Date.now();
      ids5.push(id);
      hooks.onMessage(id, 'msg ' + i);
    }
    var all5 = ids5.every(function(id) { var s = hooks.getMentalState(id); return s && s.cycle === 1 && s !== hooks.getMentalState(ids5[(ids5.indexOf(id) + 1) % 5]); });
    R.push({ n: '5 sessions — all independent', p: all5 });

    // Increment one session, others stay
    hooks.onMessage(ids5[2], 'only this one');
    var incOk = hooks.getMentalState(ids5[2]).cycle === 2;
    var othersUnchanged = true;
    for (var j = 0; j < 5; j++) {
      if (j === 2) continue;
      if (hooks.getMentalState(ids5[j]).cycle !== 1) othersUnchanged = false;
    }
    R.push({ n: '5 sessions — only one updated', p: incOk && othersUnchanged });

    // 3. Concurrent updates don't race — simulate interleaved calls
    var ca = 'c12r-conA-' + Date.now();
    var cb = 'c12r-conB-' + Date.now();
    hooks.onMessage(ca, 'a1');
    hooks.onMessage(cb, 'b1');
    hooks.onToolAfter(ca, 'task', { category: 'brain-thalamus' }, JSON.stringify({ gate: 'PASS', urgency: 0.5 }));
    hooks.onMessage(cb, 'b2');
    hooks.onToolAfter(cb, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'CAUTION', intensity: 0.7 }));
    var stA = hooks.getMentalState(ca);
    var stB = hooks.getMentalState(cb);
    R.push({ n: 'concurrent — sA state intact', p: stA.l1.size === 1 && stA.wm.thalamus !== undefined });
    R.push({ n: 'concurrent — sB state intact', p: stB.l1.size === 1 && stB.wm.amygdala !== undefined && stB.cycle === 2 });
    R.push({ n: 'concurrent — no cross-leak', p: stA.wm.amygdala === undefined && stB.wm.thalamus === undefined });

    // 4. Session state after 100 rapid messages
    var rapidId = 'c12r-rapid-' + Date.now();
    for (var k = 0; k < 100; k++) {
      hooks.onMessage(rapidId, 'rapid msg ' + k);
    }
    var rapidState = hooks.getMentalState(rapidId);
    R.push({ n: 'rapid 100 — cycle=100', p: rapidState.cycle === 100 });
    R.push({ n: 'rapid 100 — l1 reset to 0', p: rapidState.l1.size === 0 });
    R.push({ n: 'rapid 100 — state object exists', p: rapidState !== undefined });
    hooks.onToolAfter(rapidId, 'task', { category: 'brain-thalamus' }, JSON.stringify({ gate: 'PASS' }));
    hooks.onToolAfter(rapidId, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL', intensity: 0.3 }));
    var afterTools = hooks.getMentalState(rapidId);
    R.push({ n: 'rapid 100 — l1 accumulates after', p: afterTools.l1.size === 2 });
    // Signal should work
    var sig = hooks.getStrongestSignal(rapidId);
    R.push({ n: 'rapid 100 — signal computed', p: Array.isArray(sig) });

    return { passed: R.every(function(r) { return r.p; }), message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
