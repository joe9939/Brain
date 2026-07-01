module.exports = {
  name: 'PLUGIN: T4 Event Sequence',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var h = await import('../../src/plugin/brain-hooks.mjs');
      var sid = 't4-seq-' + Date.now();

      // Initialize session
      h.onMessage(sid, 'test sequence');
      var events = [];

      // Event 1: idle
      try {
        h.onEvent('session.idle', { sessionID: sid });
        events.push('idle');
      } catch (e) { events.push('idle_error'); }
      var s1 = h.getMentalState(sid);
      results.push({ name: 'Event 1: idle handled', pass: events[0] === 'idle' });

      // Event 2: error
      try {
        h.onEvent('session.error', { sessionID: sid });
        events.push('error');
      } catch (e) { events.push('error_error'); }
      var s2 = h.getMentalState(sid);
      results.push({ name: 'Event 2: error handled', pass: events[1] === 'error' });

      // Event 3: idle again
      try {
        h.onEvent('session.idle', { sessionID: sid });
        events.push('idle');
      } catch (e) { events.push('idle_error'); }
      var s3 = h.getMentalState(sid);
      results.push({ name: 'Event 3: idle after error handled', pass: events[2] === 'idle' });

      // Event 4: consolidation
      try {
        h.onEvent('session.consolidation', { sessionID: sid });
        events.push('consolidation');
      } catch (e) { events.push('consolidation_error'); }
      var s4 = h.getMentalState(sid);
      results.push({ name: 'Event 4: consolidation handled', pass: events[3] === 'consolidation' });

      // Verify order
      results.push({ name: 'Events in correct order: idle→error→idle→consolidation', pass: events.join('→') === 'idle→error→idle→consolidation' });

      // State consistent after all events
      results.push({ name: 'State cycle preserved across events', pass: s4 && s4.cycle === 1 });

      // Signal computation still works after all events
      var sig = h.getStrongestSignal(sid);
      results.push({ name: 'Signal computation works after event sequence', pass: Array.isArray(sig) });

      // Plugin-level session.event handles all types
      var pp = await import('../../src/plugin/brain-plugin.mjs');
      var ctx = { directory: process.cwd(), on: function() {} };
      var plugin = await pp.BrainPlugin(ctx);
      var types = ['session.idle', 'session.error', 'session.idle', 'session.consolidation'];
      var allHandled = true;
      for (var i = 0; i < types.length; i++) {
        try { await plugin['session.event']({ sessionID: sid + '-p', type: types[i] }); } catch (e) { allHandled = false; }
      }
      results.push({ name: 'Plugin session.event handles all types', pass: allHandled });
    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
