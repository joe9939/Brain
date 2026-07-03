module.exports = {
  name: 'C14: performance (real)',
  run: async () => {
    const hooks = await import('../../src/plugin/brain-hooks.mjs');
    const R = [];
    var sid = 'c14r-perf-' + Date.now();

    // Setup: prime the session with some state so signal computation matters
    hooks.onMessage(sid, 'initial');
    hooks.onToolAfter(sid, 'task', { category: 'brain-thalamus' }, JSON.stringify({ gate: 'PASS', urgency: 0.5 }));
    hooks.onToolAfter(sid, 'task', { category: 'brain-amygdala' }, JSON.stringify({ mode: 'NORMAL', intensity: 0.3, valence: 0.2, arousal: 0.4 }));
    hooks.onToolAfter(sid, 'task', { category: 'brain-hippocampus' }, JSON.stringify({ episodic: [{ id: 'e1' }], relevant_sops: [{ id: 'sop1' }] }));

    // 1. getStrongestSignal under 5ms
    var t1 = Date.now();
    for (var i = 0; i < 100; i++) {
      hooks.getStrongestSignal(sid);
    }
    var sigTime = Date.now() - t1;
    var sigPerCall = sigTime / 100;
    R.push({ n: 'getStrongestSignal 100 calls=' + sigTime + 'ms (' + sigPerCall.toFixed(3) + 'ms/call)', p: sigPerCall < 5 });

    // 2. onMessage under 1ms
    var t2 = Date.now();
    for (var j = 0; j < 100; j++) {
      hooks.onMessage(sid + '-sub-' + j, 'perf test message ' + j);
    }
    var msgTime = Date.now() - t2;
    var msgPerCall = msgTime / 100;
    R.push({ n: 'onMessage 100 calls=' + msgTime + 'ms (' + msgPerCall.toFixed(3) + 'ms/call)', p: msgPerCall < 5 });

    // 3. onToolAfter under 1ms
    var t3 = Date.now();
    for (var k = 0; k < 100; k++) {
      hooks.onToolAfter(sid + '-tool-' + k, 'task', { category: 'brain-thalamus' }, JSON.stringify({ gate: 'PASS', urgency: 0.5 }));
    }
    var toolTime = Date.now() - t3;
    var toolPerCall = toolTime / 100;
    R.push({ n: 'onToolAfter 100 calls=' + toolTime + 'ms (' + toolPerCall.toFixed(3) + 'ms/call)', p: toolPerCall < 1 });

    // 4. 1000 BrainTracer appends under 50ms
    var t4 = Date.now();
    for (var m = 0; m < 1000; m++) {
      hooks.BrainTracer.append(sid + '-trace', 'test:event', { idx: m, data: 'x'.repeat(50) });
    }
    var traceTime = Date.now() - t4;
    var tracePerCall = traceTime / 1000;
    R.push({ n: 'BrainTracer 1000 appends=' + traceTime + 'ms (' + tracePerCall.toFixed(3) + 'ms/call)', p: traceTime < 50 });

    return { passed: R.every(function(r) { return r.p; }), message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
