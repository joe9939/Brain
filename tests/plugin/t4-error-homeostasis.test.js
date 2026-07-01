module.exports = {
  name: 'PLUGIN: T4 Error→Homeostasis',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var h = await import('../../src/plugin/brain-hooks.mjs');
      var sid = 't4-error-' + Date.now();

      // Set up session state
      h.onMessage(sid, 'test');
      var state = h.getMentalState(sid);

      // T4: session.error should not throw
      var errorCaught = false;
      try {
        h.onEvent('session.error', { sessionID: sid });
      } catch (e) {
        errorCaught = true;
      }
      results.push({ name: 'T4 session.error does not throw', pass: !errorCaught });

      // State persists after error event
      var stateAfter = h.getMentalState(sid);
      results.push({ name: 'State accessible after error event', pass: !!stateAfter });
      results.push({ name: 'Cycle preserved after error event', pass: stateAfter && stateAfter.cycle === state.cycle });

      // Multiple error events don't corrupt state
      for (var i = 0; i < 5; i++) {
        h.onEvent('session.error', { sessionID: sid });
      }
      var stateMulti = h.getMentalState(sid);
      results.push({ name: 'State valid after 5 error events', pass: stateMulti && stateMulti.cycle === state.cycle });

      // Error event with different session IDs does not cross-contaminate
      var sid2 = 't4-error-2-' + Date.now();
      h.onMessage(sid2, 'separate');
      h.onEvent('session.error', { sessionID: sid2 });
      var s1 = h.getMentalState(sid);
      var s2 = h.getMentalState(sid2);
      results.push({ name: 'Error events isolated per session', pass: s1 && s2 && s1 !== s2 });

      // Verify insula signal readiness: onEvent error doesn't break signal computation
      var sig = h.getStrongestSignal(sid);
      results.push({ name: 'Signal computation works after error event', pass: Array.isArray(sig) });

      // T4 error event also works through the plugin wrapper
      var pp = await import('../../src/plugin/brain-plugin.mjs');
      var ctx = { directory: process.cwd(), on: function() {} };
      var plugin = await pp.BrainPlugin(ctx);
      var pluginOk = false;
      try {
        await plugin['session.event']({ sessionID: sid, type: 'session.error' });
        pluginOk = true;
      } catch (e) { pluginOk = false; }
      results.push({ name: 'Plugin session.event handles error type', pass: pluginOk });
    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
