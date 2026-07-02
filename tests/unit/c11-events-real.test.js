module.exports = {
  name: 'C11: events (real)',
  run: async () => {
    var hooks = await import('../../src/plugin/brain-hooks.mjs');
    var R = [];

    var sid = 'c11r-' + Date.now();
    hooks.onMessage(sid, 'test events');

    R.push({ n: 'state initialized', p: !!hooks.getMentalState(sid) });

    // T4: session.idle
    var idleOk = false;
    try { hooks.onEvent('session.idle', { sessionID: sid }); idleOk = true; } catch (e) { idleOk = false; }
    R.push({ n: 'onEvent(session.idle) works', p: idleOk });

    var traceIdle = hooks.BrainTracer.query(sid, { event: 'T4:session.idle' });
    R.push({ n: 'BrainTracer records T4:session.idle', p: Array.isArray(traceIdle) && traceIdle.length > 0 });

    // T4: session.error
    var errorOk = false;
    try { hooks.onEvent('session.error', { sessionID: sid }); errorOk = true; } catch (e) { errorOk = false; }
    R.push({ n: 'onEvent(session.error) works', p: errorOk });

    var traceErr = hooks.BrainTracer.query(sid, { event: 'T4:session.error' });
    R.push({ n: 'BrainTracer records T4:session.error', p: Array.isArray(traceErr) && traceErr.length > 0 });

    // T4: unknown event doesn't crash
    var unkOk = false;
    try { hooks.onEvent('session.unknown', { sessionID: sid }); unkOk = true; } catch (e) { unkOk = false; }
    R.push({ n: 'onEvent unknown type handled gracefully', p: unkOk });

    // T4: missing sessionID doesn't crash
    var noSidOk = false;
    try { hooks.onEvent('session.idle', {}); noSidOk = true; } catch (e) { noSidOk = false; }
    R.push({ n: 'onEvent missing sessionID handled', p: noSidOk });

    // T4: multiple events don't corrupt state
    for (var i = 0; i < 5; i++) {
      hooks.onEvent('session.idle', { sessionID: sid });
    }
    var stAfter = hooks.getMentalState(sid);
    R.push({ n: 'state valid after 5 idle events', p: !!stAfter && stAfter.cycle === 1 });

    // BrainTracer records multiple T4 events
    var allT4 = hooks.BrainTracer.query(sid, { event: 'T4:session.idle' });
    R.push({ n: 'BrainTracer has 6 T4:session.idle entries', p: allT4.length === 6 });

    // Plugin session.event functions
    var pp = await import('../../src/plugin/brain-plugin.mjs');
    var ctx = { directory: process.cwd(), on: function() {} };
    var plugin;
    try { plugin = await pp.BrainPlugin(ctx); } catch (e) {}
    var pluginHandles = false;
    if (plugin && typeof plugin['session.event'] === 'function') {
      try {
        await plugin['session.event']({ sessionID: sid + '-p', type: 'session.idle' });
        await plugin['session.event']({ sessionID: sid + '-p', type: 'session.error' });
        pluginHandles = true;
      } catch (e) { pluginHandles = false; }
    }
    R.push({ n: 'plugin session.event handles idle+error', p: pluginHandles });

    var passed = R.every(function(r) { return r.p; });
    return { passed: passed, message: R.map(function(r) { return (r.p ? 'PASS' : 'FAIL') + ' ' + r.n; }).join('\n'), time_ms: 0 };
  },
};
