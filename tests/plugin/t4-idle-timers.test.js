module.exports = {
  name: 'PLUGIN: T4 Idle Timers',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var h = await import('../../src/plugin/brain-hooks.mjs');
      var sid = 't4-idle-' + Date.now();

      // Create session and capture lastEvent timestamp
      h.onMessage(sid, 'test idle timers');
      var state = h.getMentalState(sid);

      // Default: s.lastEvent = Date.now() set by onMessage
      results.push({ name: 'State has lastEvent after onMessage', pass: state && typeof state.lastEvent === 'number' && state.lastEvent > 0 });

      // T4: session.idle with no mock → should pass cleanly
      h.onEvent('session.idle', { sessionID: sid });
      results.push({ name: 'T4 idle event with fresh session does not throw', pass: true });

      // State preserves through idle events
      var stateAfter = h.getMentalState(sid);
      results.push({ name: 'State accessible after idle events', pass: !!stateAfter });

      // Multiple idle events
      for (var i = 0; i < 3; i++) {
        h.onEvent('session.idle', { sessionID: sid });
      }
      var stateMulti = h.getMentalState(sid);
      results.push({ name: 'State valid after multiple idle events', pass: stateMulti && stateMulti.cycle === 1 });

      // Plugin-level session.event handles idle type
      var pp = await import('../../src/plugin/brain-plugin.mjs');
      var ctx = { directory: process.cwd(), on: function() {} };
      var plugin = await pp.BrainPlugin(ctx);
      var pluginOk = false;
      try {
        await plugin['session.event']({ sessionID: sid, type: 'session.idle' });
        pluginOk = true;
      } catch (e) { pluginOk = false; }
      results.push({ name: 'Plugin session.event handles idle type', pass: pluginOk });

      // Verify timer threshold constants exist in source
      var fs = require('fs');
      var path = require('path');
      var src = fs.readFileSync(path.join(__dirname, '../../src/plugin/brain-hooks.mjs'), 'utf-8');
      results.push({ name: 'Source has 2min DMN threshold', pass: src.indexOf('120000') >= 0 && src.indexOf('DMN') >= 0 });
      results.push({ name: 'Source has 30min health threshold', pass: src.indexOf('1800000') >= 0 && src.indexOf('health') >= 0 });
      results.push({ name: 'Source has 6h consolidation threshold', pass: src.indexOf('21600000') >= 0 && src.indexOf('consolidation') >= 0 });
    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
