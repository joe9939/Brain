module.exports = {
  name: 'PLUGIN: Session Eviction (10K sessions)',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var h = await import('../../src/plugin/brain-hooks.mjs');
      var memBefore = process.memoryUsage().heapUsed;

      // Create 10,000 sessions
      var count = 10000;
      for (var i = 0; i < count; i++) {
        h.onMessage('evict-' + i, 'test message for session ' + i);
      }

      var memAfter = process.memoryUsage().heapUsed;
      var memUsedMB = (memAfter - memBefore) / (1024 * 1024);

      // Verify all sessions accessible
      var accessibleCount = 0;
      for (var j = 0; j < count; j++) {
        var s = h.getMentalState('evict-' + j);
        if (s && s.cycle === 1) accessibleCount++;
      }
      results.push({ name: 'All 10K sessions accessible', pass: accessibleCount === count });

      // Memory under 100MB
      results.push({ name: 'Memory under 100MB (used: ' + memUsedMB.toFixed(2) + 'MB)', pass: memUsedMB < 100 });

      // Each session has independent state
      var s0 = h.getMentalState('evict-0');
      var s9999 = h.getMentalState('evict-9999');
      results.push({ name: 'First and last sessions are distinct objects', pass: s0 !== s9999 });

      // Verify session state structure
      results.push({ name: 'Session has M_emo with mode=NORMAL', pass: s0 && s0.M_emo && s0.M_emo.mode === 'NORMAL' });
      results.push({ name: 'Session has M_rew with score=0', pass: s0 && s0.M_rew && s0.M_rew.score === 0 });
      results.push({ name: 'Session has cycle=1', pass: s0 && s0.cycle === 1 });

      // Run all L1 agents on one session to verify T2 tracking works after bulk creation
      var testSid = 'evict-verify-l1';
      h.onMessage(testSid, 'verify');
      var l1Cats = ['brain-thalamus', 'brain-amygdala', 'brain-hippocampus', 'brain-world-cortex', 'brain-safety'];
      for (var k = 0; k < l1Cats.length; k++) {
        h.onToolAfter(testSid, 'task', { category: l1Cats[k] }, '{}');
      }
      var testState = h.getMentalState(testSid);
      results.push({ name: 'T2 L1 tracking works after bulk sessions', pass: testState && testState.l1.size === 5 });

    } catch (e) {
      results.push({ name: 'Error: ' + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
