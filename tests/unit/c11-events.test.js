module.exports = {
  name: 'C11: T4 events',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var hooks = await import('../../src/plugin/brain-hooks.mjs');
      var sid = 'c11-' + Date.now();

      hooks.onMessage(sid, 'test events');
      var state0 = hooks.getMentalState(sid);
      results.push({ name: 'State initialized after onMessage', pass: !!state0 });
      results.push({ name: 'State has lastEvent timestamp', pass: typeof state0.lastEvent === 'number' && state0.lastEvent > 0 });

      // T4: session.idle fires
      var idleOk = false;
      try {
        hooks.onEvent('session.idle', { sessionID: sid });
        idleOk = true;
      } catch (e) { idleOk = false; }
      results.push({ name: 'session.idle fires without throw', pass: idleOk });

      var stateAfterIdle = hooks.getMentalState(sid);
      results.push({ name: 'State accessible after session.idle', pass: !!stateAfterIdle });
      results.push({ name: 'Cycle preserved after session.idle', pass: stateAfterIdle && stateAfterIdle.cycle === state0.cycle });

      // T4: session.error fires
      var errorOk = false;
      try {
        hooks.onEvent('session.error', { sessionID: sid });
        errorOk = true;
      } catch (e) { errorOk = false; }
      results.push({ name: 'session.error fires without throw', pass: errorOk });

      var stateAfterError = hooks.getMentalState(sid);
      results.push({ name: 'State accessible after session.error', pass: !!stateAfterError });
      results.push({ name: 'Cycle preserved after session.error', pass: stateAfterError && stateAfterError.cycle === state0.cycle });

      // 30min health check: verify source has 1800000 threshold
      var fs = require('fs');
      var path = require('path');
      var src = fs.readFileSync(path.join(__dirname, '../../src/plugin/brain-hooks.mjs'), 'utf-8');
      results.push({ name: 'Source has 30min health threshold (1800000)', pass: src.indexOf('1800000') >= 0 && src.indexOf('health') >= 0 });
      results.push({ name: 'Source has 2min DMN threshold (120000)', pass: src.indexOf('120000') >= 0 && src.indexOf('DMN') >= 0 });
      results.push({ name: 'Source has 6h consolidation threshold (21600000)', pass: src.indexOf('21600000') >= 0 && src.indexOf('consolidation') >= 0 });

      // Multiple error events don't corrupt
      for (var i = 0; i < 5; i++) {
        hooks.onEvent('session.error', { sessionID: sid });
      }
      var stateMultiError = hooks.getMentalState(sid);
      results.push({ name: 'State valid after 5 session.error events', pass: stateMultiError && stateMultiError.cycle === state0.cycle });

      // Signal computation works after events
      var sig = hooks.getStrongestSignal(sid);
      results.push({ name: 'Signal computation works after T4 events', pass: Array.isArray(sig) });

      // Plugin-level session.event handles idle and error
      var pp = await import('../../src/plugin/brain-plugin.mjs');
      var ctx = { directory: process.cwd(), on: function() {} };
      var plugin = await pp.BrainPlugin(ctx);
      var types = ['session.idle', 'session.error'];
      var allHandled = true;
      for (var j = 0; j < types.length; j++) {
        try { await plugin['session.event']({ sessionID: sid + '-p', type: types[j] }); } catch (e) { allHandled = false; }
      }
      results.push({ name: 'Plugin session.event handles idle and error', pass: allHandled });

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.map(function(r) { return (r.pass ? 'PASS' : 'FAIL') + ' ' + r.name; }).join('\n'), time_ms: Date.now() - start };
  },
};

if (require.main === module) {
  module.exports.run().then(function(r) { console.log(r.passed ? 'PASS' : 'FAIL'); process.exit(r.passed ? 0 : 1); });
}
